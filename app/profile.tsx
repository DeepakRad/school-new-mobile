import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card, ErrorScreen, LoadingScreen, palette } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useThemePreference } from '../hooks/useThemePreference';
import { apiGet } from '../lib/api';
import { profileQueryOptions } from '../lib/query';
import type { ProfileData } from '../types/profile';

function buildFullName(student: ProfileData['student']) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useThemePreference();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<ProfileData>('/api/profile'),
    ...profileQueryOptions,
  });

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen message={(error as Error).message} />;
  if (!data) return null;

  const studentName = buildFullName(data.student);
  const themeColors = isDark
    ? {
        page: '#0F1428',
        panel: '#171E37',
        card: '#1D2542',
        hero: '#202B58',
        text: '#F6F7FB',
        muted: '#AEB8D6',
        label: '#C4CBE0',
        border: 'rgba(255,255,255,0.12)',
        topButton: '#1F294B',
      }
    : {
        page: '#F6F7FB',
        panel: '#e8ecf3',
        card: '#e8ecf3',
        hero: '#2A356B',
        text: '#1C233B',
        muted: '#8D95B2',
        label: '#6c6f7a',
        border: '#D3D8E4',
        topButton: '#FFFFFF',
      };

  const studentInfoRows = [
    { label: 'ADMISSION NO', value: data.student.admissionNo || '--' },
    { label: 'ACADEMIC YEAR', value: data.institution?.academicYear || '--' },
    {
      label: 'CLASS & SECTION',
      value: `${data.student.className}, ${data.student.section}`,
    },
    { label: 'INSTITUTION', value: data.institution?.name || '--' },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.hero }]}
    >
      <ScrollView
        style={[styles.page, { backgroundColor: themeColors.page }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.topIconButton,
              { backgroundColor: themeColors.topButton },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: themeColors.text }]}>
            Profile
          </Text>
        </View>

        <View style={[styles.heroCard, { backgroundColor: themeColors.hero }]}>
          <View style={styles.heroGlow} />
          <View style={styles.avatarShell}>
            <Ionicons name="person" size={46} color="#FFFFFF" />
          </View>

          <Text style={styles.name}>{studentName}</Text>
          <Text style={styles.grade}>
            Class {data.student.className} • {data.student.section}
          </Text>
        </View>

        <Text style={[styles.sectionHeading, { color: themeColors.label }]}>
          STUDENT INFORMATION
        </Text>

        <Card style={[styles.infoCard, { backgroundColor: themeColors.card }]}>
          {studentInfoRows.map((item) => (
            <View key={item.label} style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: themeColors.label }]}>
                {item.label}
              </Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </Card>

        <Text style={[styles.sectionHeading, { color: themeColors.label }]}>
          ACCOUNT SETTINGS
        </Text>

        <Card
          style={[
            styles.settingsCard,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.85}
            onPress={() => router.push('/parent-profile')}
          >
            <View
              style={[
                styles.settingIconWrap,
                { backgroundColor: isDark ? '#23305C' : '#DFE4ED' },
              ]}
            >
              <Ionicons
                name="person-circle-outline"
                size={26}
                color={themeColors.text}
              />
            </View>

            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: themeColors.text }]}>
                Parent Profile
              </Text>
              <Text
                style={[styles.settingSubtitle, { color: themeColors.muted }]}
              >
                Manage your contact details
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={24}
              color={themeColors.muted}
            />
          </TouchableOpacity>
        </Card>

        <Text style={[styles.sectionHeading, { color: themeColors.label }]}>
          PREFERENCES
        </Text>

        <Card
          style={[
            styles.preferenceCard,
            { backgroundColor: themeColors.panel },
          ]}
        >
          <View style={styles.preferenceHeader}>
            <View>
              <Text
                style={[styles.preferenceTitle, { color: themeColors.text }]}
              >
                Dark Mode
              </Text>
              <Text
                style={[
                  styles.preferenceSubtitle,
                  { color: themeColors.muted },
                ]}
              >
                Switch profile screens to a darker appearance
              </Text>
            </View>
            <Switch
              value={isDark}
              trackColor={{ false: '#D8DCEA', true: '#1F2B63' }}
              thumbColor="#FFFFFF"
              onValueChange={toggleTheme}
            />
          </View>
        </Card>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="log-out-outline" size={18} color={palette.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroCard: {
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: 34,
    paddingTop: 26,
    paddingBottom: 32,
    marginTop: 4,
  },
  heroGlow: {
    position: 'absolute',
    left: -22,
    bottom: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarShell: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  grade: {
    marginTop: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '700',
  },
  editButton: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    minWidth: 210,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#1F2B63',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    paddingTop: 24,
  },
  infoCard: {
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  infoBlock: {
    marginBottom: 22,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoValue: {
    marginTop: 10,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 22,
  },
  infoAddress: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '500',
  },
  preferenceCard: {
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  preferenceTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  preferenceSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 220,
  },
  settingsCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  settingSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  metaCard: {
    borderRadius: 24,
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metaHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  logoutButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFE4E0',
    borderRadius: 18,
    paddingVertical: 16,
  },
  logoutText: {
    color: palette.danger,
    fontSize: 16,
    fontWeight: '800',
  },
});
