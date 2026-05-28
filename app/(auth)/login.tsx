import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';

import { useAuth } from '../../hooks/useAuth';
import { apiGet } from '../../lib/api';

const schema = z.object({
  username: z.string().min(1, 'Phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

interface BrandingData {
  schoolName: string;
  schoolLogo?: string | null;
  fullAddress?: string | null;
  officialEmail?: string | null;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { data: branding } = useQuery({
    queryKey: ['public-branding'],
    queryFn: () => apiGet<BrandingData>('/api/public/branding'),
    retry: 1,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: branding?.officialEmail ?? '',
      password: '',
    },
  });

  useEffect(() => {
    if (branding?.officialEmail) {
      reset((values) => ({
        username: values.username || branding.officialEmail || '',
        password: values.password,
      }));
    }
  }, [branding?.officialEmail, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null);
      await login(data.username, data.password);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            {branding?.schoolLogo ? (
              <Image
                source={{ uri: branding.schoolLogo }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.logoFallback}>
                <Ionicons name="school-outline" size={34} color="#1F2B63" />
              </View>
            )}
          </View>

          <Text style={styles.title}>
            {branding?.schoolName
              ? `Welcome to ${branding.schoolName}`
              : 'Welcome to School ERP'}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to manage your institution with ease
          </Text>

          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputShell,
                    errors.username && styles.inputError,
                  ]}
                >
                  <Ionicons name="mail" size={20} color="#A4AEC3" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#A4AEC3"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
              )}
            />
            {errors.username ? (
              <Text style={styles.fieldError}>{errors.username.message}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <View style={styles.passwordRow}>
              <Text style={styles.label}>Password</Text>
            </View>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputShell,
                    errors.password && styles.inputError,
                  ]}
                >
                  <Ionicons name="lock-closed" size={20} color="#A4AEC3" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#A4AEC3"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((value) => !value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#A4AEC3"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password.message}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={22} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF2F8',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 38,
    paddingHorizontal: 28,
    paddingVertical: 34,
    shadowColor: '#1F2B63',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#0F1734',
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 28,
    fontSize: 16,
    lineHeight: 23,
    color: '#7E869F',
    textAlign: 'center',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#18213E',
    marginBottom: 10,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputShell: {
    minHeight: 68,
    borderRadius: 24,
    backgroundColor: '#EEF3FF',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 18,
  },
  inputError: {
    borderColor: '#E45A5A',
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: '#E45A5A',
  },
  errorBanner: {
    backgroundColor: '#FFE7E1',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  errorBannerText: {
    color: '#B23434',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#1F2B63',
    borderRadius: 24,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#1F2B63',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
