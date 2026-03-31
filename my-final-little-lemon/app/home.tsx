import React, { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import LittleLemonLogo from '@/assets/images/LittleLemonLogo.svg';
import HomeContentLogo from '@/assets/images/HomeContentLogo.svg';
import { getMenuCount, getMenuItemsFiltered, initMenuDb, saveMenuItems } from '@/lib/menu-db';

type ApiMenuItem = {
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
};

type MenuItem = {
  id: string;
  title: string;
  description: string;
  price: string;
  imageFileName: string;
  category: string;
};

const COLORS = {
  green: '#495E57',
  yellow: '#F4CE14',
  lightGray: '#EDEFEE',
  dark: '#11181C',
  muted: '#6B6B6B',
  white: '#FFFFFF',
};

const CATEGORIES = ['Starters', 'Mains', 'Desserts', 'Drinks'] as const;

const MENU_API_URL =
  'https://raw.githubusercontent.com/Meta-Mobile-Developer-PC/Working-With-Data-API/main/capstone.json';

function imageUrl(imageFileName: string) {
  return `https://github.com/Meta-Mobile-Developer-PC/Working-With-Data-API/blob/main/images/${encodeURIComponent(
    imageFileName
  )}?raw=true`;
}

function normalizeCategory(apiCategory: string) {
  const c = apiCategory.trim().toLowerCase();
  if (c === 'starters') return 'Starters';
  if (c === 'mains') return 'Mains';
  if (c === 'desserts') return 'Desserts';
  if (c === 'drinks') return 'Drinks';
  return 'Starters';
}

export default function HomeScreen() {
  // Replace this with your real auth state when you wire sign-in.
  const isSignedIn = true;

  const [activeCategories, setActiveCategories] = useState<(typeof CATEGORIES)[number][]>(
    () => [...CATEGORIES]
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuStatus, setMenuStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    async function loadMenu() {
      try {
        if (!isSignedIn) return;
        setMenuStatus('loading');
        await initMenuDb();

        const existingCount = await getMenuCount();
        if (existingCount > 0) {
          if (!cancelled) setMenuStatus('loaded');
          return;
        }

        const res = await fetch(MENU_API_URL);
        if (!res.ok) throw new Error(`Menu fetch failed: ${res.status}`);
        const json = (await res.json()) as { menu: ApiMenuItem[] };

        const next: MenuItem[] = (json.menu ?? []).map((i) => ({
          id: `${i.name}-${i.category}`.toLowerCase().replace(/\s+/g, '-'),
          title: i.name,
          description: i.description,
          price: `$${Number(i.price).toFixed(2)}`,
          imageFileName: i.image,
          category: normalizeCategory(i.category),
        }));

        await saveMenuItems(next);

        if (!cancelled) {
          setMenuStatus('loaded');
        }
      } catch {
        if (!cancelled) setMenuStatus('error');
      }
    };

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function runFilteredQuery() {
      try {
        if (!isSignedIn) return;
        if (menuStatus !== 'loaded') return;
        await initMenuDb();
        const rows = await getMenuItemsFiltered(activeCategories, debouncedQuery);
        if (!cancelled) setMenu(rows);
      } catch {
        if (!cancelled) setMenuStatus('error');
      }
    }

    runFilteredQuery();
    return () => {
      cancelled = true;
    };
  }, [activeCategories, debouncedQuery, isSignedIn, menuStatus]);

  const filteredMenu = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((i) => {
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.price.toLowerCase().includes(q)
      );
    });
  }, [menu, query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <LittleLemonLogo width={150} height={34} />
          <View style={styles.avatar}>
            <IconSymbol name="person.crop.circle.fill" size={36} color={COLORS.green} />
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Little Lemon</Text>
          <Text style={styles.heroSubtitle}>Chicago</Text>

          <View style={styles.heroContentRow}>
            <Text style={styles.heroDescription}>
              We are a family owned{'\n'}Mediterranean restaurant,{'\n'}focused on traditional{'\n'}
              recipes served with a{'\n'}modern twist.
            </Text>

            <HomeContentLogo width={150} height={150} />
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <IconSymbol name="magnifyingglass" size={18} color={COLORS.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={COLORS.muted}
                style={styles.searchInput}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search menu items"
              />
              {!!query.trim().length && (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  style={styles.clearButton}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={COLORS.muted} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.orderTitle}>ORDER FOR DELIVERY!</Text>

        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => {
            const active = activeCategories.includes(c);
            return (
              <Pressable
                key={c}
                onPress={() =>
                  setActiveCategories((prev) =>
                    prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                  )
                }
                style={[styles.categoryPill, active && styles.categoryPillActive]}>
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        {menuStatus === 'loading' && (
          <Text style={styles.menuStatusText}>Loading menu…</Text>
        )}
        {menuStatus === 'error' && (
          <Text style={styles.menuStatusText}>Couldn’t load menu. Please try again.</Text>
        )}

        {menuStatus === 'loaded' && (
          <FlatList
            data={filteredMenu}
            keyExtractor={(i) => i.id}
            style={styles.menuList}
            contentContainerStyle={styles.menuListContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            renderItem={({ item }) => (
              <View style={styles.menuItemRow}>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={styles.menuPrice}>{item.price}</Text>
                </View>

                <Image
                  source={
                    item.imageFileName?.trim()
                      ? { uri: imageUrl(item.imageFileName) }
                      : require('@/assets/images/default-food-logo.png')
                  }
                  style={styles.menuThumb}
                  contentFit="cover"
                />
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
  },
  topBarSpacer: { width: 36 },
  logo: { width: 140, height: 34 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.lightGray },

  hero: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.yellow,
    letterSpacing: 0.2,
  },
  heroSubtitle: { fontSize: 26, fontWeight: '700', color: COLORS.white, marginTop: -2 },
  heroContentRow: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroDescription: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  heroImage: {
    width: 120,
    height: 90,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  searchRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchField: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 42,
    paddingVertical: 0,
    color: COLORS.dark,
    fontSize: 14,
  },
  clearButton: {
    paddingLeft: 6,
    paddingVertical: 4,
  },

  orderTitle: {
    marginTop: 14,
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.dark,
    letterSpacing: 0.4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  categoryPillActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  categoryText: { fontSize: 13, fontWeight: '800', color: '#5A5A5A' },
  categoryTextActive: { color: COLORS.dark },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#D4D4D4', marginTop: 10 },

  itemSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: '#E6E6E6' },
  menuList: { flex: 1 },
  menuListContent: { paddingBottom: 24 },
  menuItemRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuItemTextCol: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '800', color: COLORS.dark, marginBottom: 6 },
  menuDesc: { fontSize: 12.5, lineHeight: 16, color: COLORS.muted, marginBottom: 8 },
  menuPrice: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  menuThumb: { width: 64, height: 64, borderRadius: 6, backgroundColor: COLORS.lightGray },
  menuStatusText: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});

