import LittleLemonLogo from '@/assets/images/LittleLemonLogo.svg';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { clearMenuTable, initMenuDb } from '@/lib/menu-db';
import {
  clearUserTable,
  getUserProfile,
  initUserDb,
  saveUserProfile,
  type UserProfile,
} from '@/lib/user-db';
import { useFocusEffect } from '@react-navigation/native';
import { copyAsync, documentDirectory } from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import CountryPicker from 'react-native-country-picker-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  green: '#495E57',
  yellow: '#F4CE14',
  lightGray: '#EDEFEE',
  dark: '#11181C',
  muted: '#6B6B6B',
  white: '#FFFFFF',
  border: '#D4D4D4',
  danger: '#B00020',
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function nationalDigitsFromProfile(p: UserProfile): string {
  return p.phoneNumber.replace(/\D/g, '');
}

function formatNationalDisplay(callingCode: string, nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, '');
  const max = callingCode === '1' ? 10 : 15;
  const x = d.slice(0, max);
  if (callingCode === '1') {
    if (x.length <= 3) return x;
    if (x.length <= 6) return `(${x.slice(0, 3)}) ${x.slice(3)}`;
    return `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}`;
  }
  return x;
}

function parseNationalFromText(callingCode: string, text: string): string {
  const max = callingCode === '1' ? 10 : 15;
  return text.replace(/\D/g, '').slice(0, max);
}

type ProfileBaseline = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneCallingCode: string;
  phoneNumberDigits: string;
  avatarUri: string | null;
  notifyOrderStatuses: boolean;
  notifyPasswordChanges: boolean;
  notifySpecialOffers: boolean;
  notifyNewsletter: boolean;
};

function profileToBaseline(row: UserProfile): ProfileBaseline {
  return {
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    email: row.email.trim(),
    phoneCountryCode: row.phoneCountryCode,
    phoneCallingCode: row.phoneCallingCode,
    phoneNumberDigits: nationalDigitsFromProfile(row),
    avatarUri: row.avatarUri,
    notifyOrderStatuses: row.notifyOrderStatuses,
    notifyPasswordChanges: row.notifyPasswordChanges,
    notifySpecialOffers: row.notifySpecialOffers,
    notifyNewsletter: row.notifyNewsletter,
  };
}

export default function ProfileScreen() {
  const baselineRef = useRef<ProfileBaseline | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNationalDigits, setPhoneNationalDigits] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [callingCode, setCallingCode] = useState('1');

  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [notifyOrderStatuses, setNotifyOrderStatuses] = useState(true);
  const [notifyPasswordChanges, setNotifyPasswordChanges] = useState(true);
  const [notifySpecialOffers, setNotifySpecialOffers] = useState(true);
  const [notifyNewsletter, setNotifyNewsletter] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await initUserDb();
        const row = await getUserProfile();
        if (cancelled) return;
        if (!row) {
          router.replace('/onboarding');
          return;
        }
        setFirstName(row.firstName);
        setLastName(row.lastName);
        setEmail(row.email);
        setCountryCode(row.phoneCountryCode);
        setCallingCode(row.phoneCallingCode);
        setPhoneNationalDigits(nationalDigitsFromProfile(row));
        setAvatarUri(row.avatarUri);
        setNotifyOrderStatuses(row.notifyOrderStatuses);
        setNotifyPasswordChanges(row.notifyPasswordChanges);
        setNotifySpecialOffers(row.notifySpecialOffers);
        setNotifyNewsletter(row.notifyNewsletter);
        baselineRef.current = profileToBaseline(row);
        setReady(true);
        setSubmitted(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!isValidEmail(email)) e.email = 'Enter a valid email';
    if (!phoneNationalDigits.trim()) e.phoneNumber = 'Phone number is required';
    return e;
  }, [firstName, lastName, email, phoneNationalDigits]);

  const canSave = Object.keys(errors).length === 0;

  function hasUnsavedChanges(): boolean {
    const b = baselineRef.current;
    if (!b) return false;
    const digits = phoneNationalDigits.replace(/\D/g, '');
    return (
      firstName.trim() !== b.firstName ||
      lastName.trim() !== b.lastName ||
      email.trim() !== b.email ||
      countryCode !== b.phoneCountryCode ||
      callingCode !== b.phoneCallingCode ||
      digits !== b.phoneNumberDigits ||
      avatarUri !== b.avatarUri ||
      notifyOrderStatuses !== b.notifyOrderStatuses ||
      notifyPasswordChanges !== b.notifyPasswordChanges ||
      notifySpecialOffers !== b.notifySpecialOffers ||
      notifyNewsletter !== b.notifyNewsletter
    );
  }

  async function persistAvatarFromPicker(sourceUri: string): Promise<string | null> {
    if (!documentDirectory) return sourceUri;
    try {
      const dest = `${documentDirectory}avatar_${Date.now()}.jpg`;
      await copyAsync({ from: sourceUri, to: dest });
      return dest;
    } catch {
      return sourceUri;
    }
  }

  async function onChangeAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const next = await persistAvatarFromPicker(result.assets[0].uri);
    setAvatarUri(next);
  }

  function onRemoveAvatar() {
    setAvatarUri(null);
  }

  async function onSave() {
    setSubmitted(true);
    if (!canSave) return;
    setSaving(true);
    try {
      await initUserDb();
      await saveUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneCountryCode: countryCode,
        phoneCallingCode: callingCode,
        phoneNumber: phoneNationalDigits.replace(/\D/g, ''),
        avatarUri,
        notifyOrderStatuses,
        notifyPasswordChanges,
        notifySpecialOffers,
        notifyNewsletter,
      });
      baselineRef.current = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneCountryCode: countryCode,
        phoneCallingCode: callingCode,
        phoneNumberDigits: phoneNationalDigits.replace(/\D/g, ''),
        avatarUri,
        notifyOrderStatuses,
        notifyPasswordChanges,
        notifySpecialOffers,
        notifyNewsletter,
      };
      Alert.alert('Success', 'Your changes have been saved.');
    } finally {
      setSaving(false);
    }
  }

  function onDiscard() {
    if (!hasUnsavedChanges()) {
      router.back();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'You have unsaved changes. If you leave now, they will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  }

  async function logout() {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await initMenuDb();
      await initUserDb();
      await clearMenuTable();
      await clearUserTable();
      router.replace('/onboarding');
    } finally {
      setLoggingOut(false);
    }
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      </SafeAreaView>
    );
  }

  function renderAvatar(size: number, style?: object) {
    const wrap = [styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }, style];
    if (avatarUri) {
      return <Image source={{ uri: avatarUri }} style={wrap} contentFit="cover" />;
    }
    return (
      <View style={[wrap, styles.avatarPlaceholder]}>
        <IconSymbol name="person.crop.circle.fill" size={size * 0.62} color={COLORS.green} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <IconSymbol name="chevron.left" size={22} color={COLORS.white} />
            </Pressable>
            <LittleLemonLogo width={150} height={34} />
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal information</Text>

            <Text style={styles.fieldLabel}>Avatar</Text>
            <View style={styles.avatarRow}>
              {renderAvatar(88)}
              <View style={styles.avatarActions}>
                <Pressable onPress={onChangeAvatar} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Change</Text>
                </Pressable>
                <Pressable onPress={onRemoveAvatar} style={styles.btnOutline}>
                  <Text style={styles.btnOutlineText}>Remove</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.fieldLabel}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
              accessibilityLabel="First name"
            />
            {submitted && errors.firstName ? <Text style={styles.error}>{errors.firstName}</Text> : null}

            <Text style={styles.fieldLabel}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
              accessibilityLabel="Last name"
            />
            {submitted && errors.lastName ? <Text style={styles.error}>{errors.lastName}</Text> : null}

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email"
            />
            {submitted && errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

            <Text style={styles.fieldLabel}>Phone number</Text>
            <View style={styles.phoneRow}>
              <Pressable style={styles.countryButton} accessibilityRole="button">
                <CountryPicker
                  withFlag
                  withCallingCode
                  withFilter
                  countryCode={countryCode as never}
                  onSelect={(c) => {
                    setCountryCode(c.cca2);
                    const code = (c.callingCode?.[0] ?? '').toString();
                    setCallingCode(code);
                  }}
                />
                <Text style={styles.callingCodeText}>+{callingCode}</Text>
              </Pressable>
              <TextInput
                value={formatNationalDisplay(callingCode, phoneNationalDigits)}
                onChangeText={(t) =>
                  setPhoneNationalDigits(parseNationalFromText(callingCode, t))
                }
                placeholder="Phone number"
                placeholderTextColor={COLORS.muted}
                style={[styles.input, styles.phoneInput]}
                keyboardType="phone-pad"
                accessibilityLabel="Phone number"
              />
            </View>
            {submitted && errors.phoneNumber ? (
              <Text style={styles.error}>{errors.phoneNumber}</Text>
            ) : null}
          </View>

          <View style={styles.notificationsBlock}>
            <Text style={[styles.sectionTitle, styles.notificationsTitle]}>Email notifications</Text>

            <CheckboxRow
              label="Order statuses"
              checked={notifyOrderStatuses}
              onToggle={() => setNotifyOrderStatuses((v) => !v)}
            />
            <CheckboxRow
              label="Password changes"
              checked={notifyPasswordChanges}
              onToggle={() => setNotifyPasswordChanges((v) => !v)}
            />
            <CheckboxRow
              label="Special offers"
              checked={notifySpecialOffers}
              onToggle={() => setNotifySpecialOffers((v) => !v)}
            />
            <CheckboxRow
              label="Newsletter"
              checked={notifyNewsletter}
              onToggle={() => setNotifyNewsletter((v) => !v)}
            />
          </View>

          <Pressable
            onPress={logout}
            disabled={loggingOut}
            style={[styles.logoutButton, loggingOut && styles.disabledOpacity]}
            accessibilityRole="button"
            accessibilityLabel="Log out">
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Pressable onPress={onDiscard} style={styles.discardButton} accessibilityRole="button">
              <Text style={styles.discardText}>Discard changes</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving}
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save changes">
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveText}>Save changes</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <IconSymbol name="checkmark" size={14} color={COLORS.white} /> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: { width: 40, height: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 6,
    marginTop: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  avatarCircle: {
    backgroundColor: COLORS.lightGray,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActions: { flex: 1, gap: 10 },
  btnPrimary: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  btnOutline: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnOutlineText: { color: COLORS.muted, fontSize: 15, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: COLORS.white,
  },
  error: { marginTop: 4, color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  countryButton: {
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callingCodeText: { fontSize: 14, fontWeight: '800', color: COLORS.dark },
  phoneInput: { flex: 1 },
  notificationsBlock: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    opacity: 0.06,
    right: -40,
    top: 20,
    zIndex: 0,
  },
  notificationsTitle: {
    position: 'relative',
    zIndex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    zIndex: 1,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkBoxOn: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  checkLabel: { fontSize: 16, color: COLORS.dark, fontWeight: '500' },
  logoutButton: {
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  logoutText: { fontSize: 17, fontWeight: '800', color: COLORS.dark },
  footerRow: { flexDirection: 'row', gap: 12 },
  discardButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.green,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  discardText: { fontSize: 15, fontWeight: '800', color: COLORS.green },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  disabledOpacity: { opacity: 0.6 },
});
