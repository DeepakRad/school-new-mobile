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
import { apiGet } from '../lib/api';

interface ProfileData {
  student: {
    id: string;
    admissionNo: string;
    rollNo: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    className: string;
    section: string;
  };
  parent: {
    phone?: string | null;
    username?: string | null;
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<ProfileData>('/api/profile'),
  });

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen message={(error as Error).message} />;
  if (!data) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.topIconButton}
          >
            <Ionicons name="arrow-back" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Profile</Text>
          <TouchableOpacity style={styles.topIconButton}>
            <Ionicons name="settings-outline" size={20} color={palette.text} />
          </TouchableOpacity>
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.avatarFrame}>
            <Ionicons name="person" size={42} color="#fff" />
          </View>
          <Text style={styles.name}>
            {data.student.firstName} {data.student.lastName}
          </Text>
          <Text style={styles.grade}>
            Grade {data.student.className}-{data.student.section}
          </Text>

          <TouchableOpacity style={styles.editButton} activeOpacity={0.85}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </Card>

        <SectionLabel title="PREFERENCES" />
        <View style={styles.prefList}>
          <PreferenceCard
            title="Dark Mode"
            subtitle="Reduce eye strain at night"
            value={false}
          />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={palette.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function PreferenceCard({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: boolean;
}) {
  return (
    <Card style={styles.preferenceCard}>
      <View style={styles.prefHeader}>
        <View style={styles.rowIconWrap}>
          <Ionicons
            name="notifications-outline"
            size={18}
            color={palette.primary}
          />
        </View>
        <Switch
          value={value}
          trackColor={{ false: '#D8DCEA', true: '#1F2B63' }}
          thumbColor="#fff"
          onValueChange={() => {}}
        />
      </View>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowSubtitle}>{subtitle}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B5BFF',
  },
  content: {
    backgroundColor: palette.background,
    minHeight: '100%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#2A356B',
    paddingVertical: 28,
    borderRadius: 30,
  },
  avatarFrame: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: '#1A2247',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  grade: {
    marginTop: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  achievementChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 124,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
  },
  chipValue: {
    marginTop: 4,
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  editButton: {
    marginTop: 18,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
  },
  editButtonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.textSoft,
    letterSpacing: 1,
  },
  groupCard: {
    paddingVertical: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingsRowBordered: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  prefList: {
    gap: 12,
  },
  preferenceCard: {
    borderRadius: 24,
  },
  prefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontWeight: '700',
  },
});
