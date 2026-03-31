import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import CountryPicker from 'react-native-country-picker-modal';
import LittleLemonLogo from '@/assets/images/LittleLemonLogo.svg';
import HomeContentLogo from '@/assets/images/HomeContentLogo.svg';
import { router } from 'expo-router';
import { initUserDb, saveUserProfile } from '@/lib/user-db';

const COLORS = {
  green: '#495E57',
  yellow: '#F4CE14',
  lightGray: '#EDEFEE',
  dark: '#11181C',
  muted: '#6B6B6B',
  white: '#FFFFFF',
  danger: '#B00020',
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function OnboardingScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('MY');
  const [callingCode, setCallingCode] = useState('60');
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!isValidEmail(email)) e.email = 'Enter a valid email';
    if (!phoneNumber.trim()) e.phoneNumber = 'Phone number is required';
    if (!countryCode || !callingCode) e.country = 'Country is required';
    return e;
  }, [firstName, lastName, email, phoneNumber, countryCode, callingCode]);

  const canSubmit = Object.keys(errors).length === 0;

  async function onSubmit() {
    setSubmitted(true);
    if (!canSubmit) return;
    await initUserDb();
    await saveUserProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phoneCountryCode: countryCode,
      phoneCallingCode: callingCode,
      phoneNumber: phoneNumber.trim(),
    });
    router.replace('/home');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <View style={styles.topBarSpacer} />
            <LittleLemonLogo width={150} height={34} />
            <View style={styles.topBarSpacer} />
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
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="words"
              accessibilityLabel="First name"
            />
            {submitted && errors.firstName ? <Text style={styles.error}>{errors.firstName}</Text> : null}

            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="words"
              accessibilityLabel="Last name"
            />
            {submitted && errors.lastName ? <Text style={styles.error}>{errors.lastName}</Text> : null}

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@email.com"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Email"
            />
            {submitted && errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

            <Text style={styles.label}>Phone</Text>
            <View style={styles.phoneRow}>
              <Pressable style={styles.countryButton} accessibilityRole="button">
                <CountryPicker
                  withFlag
                  withCallingCode
                  withFilter
                  countryCode={countryCode as any}
                  onSelect={(c) => {
                    setCountryCode(c.cca2);
                    const code = (c.callingCode?.[0] ?? '').toString();
                    setCallingCode(code);
                  }}
                />
                <Text style={styles.callingCode}>+{callingCode}</Text>
              </Pressable>

              <TextInput
                value={phoneNumber}
                onChangeText={(t) => setPhoneNumber(t.replace(/[^\d]/g, ''))}
                placeholder="Phone number"
                placeholderTextColor={COLORS.muted}
                style={[styles.input, styles.phoneInput]}
                keyboardType="phone-pad"
                accessibilityLabel="Phone number"
              />
            </View>
            {submitted && (errors.phoneNumber || errors.country) ? (
              <Text style={styles.error}>{errors.phoneNumber ?? errors.country}</Text>
            ) : null}

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save and continue"
            >
              <Text style={styles.submitText}>Continue</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  screen: { paddingBottom: 24, backgroundColor: COLORS.white },

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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },

  hero: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
  },
  heroTitle: { fontSize: 40, fontWeight: '800', color: COLORS.yellow, letterSpacing: 0.2 },
  heroSubtitle: { fontSize: 26, fontWeight: '700', color: COLORS.white, marginTop: -2 },
  heroContentRow: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroDescription: { flex: 1, color: COLORS.white, fontSize: 14, lineHeight: 18, fontWeight: '500' },

  form: { paddingHorizontal: 16, paddingTop: 14 },
  label: { fontSize: 13, fontWeight: '800', color: COLORS.dark, marginTop: 12, marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12,
    color: COLORS.dark,
    fontSize: 14,
  },
  error: { marginTop: 6, color: COLORS.danger, fontSize: 12, fontWeight: '700' },

  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  countryButton: {
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callingCode: { fontSize: 14, fontWeight: '800', color: COLORS.dark },
  phoneInput: { flex: 1 },

  submitButton: {
    marginTop: 18,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
});

