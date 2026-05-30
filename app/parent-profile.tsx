import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card, ErrorScreen, LoadingScreen } from '../components/ui';
import { useThemePreference } from '../hooks/useThemePreference';
import { apiGet } from '../lib/api';
import { profileQueryOptions } from '../lib/query';
import type { ProfileData } from '../types/profile';

function displayValue(value?: string | null) {
  return value?.trim() || '--';
}

export default function ParentProfileScreen() {
  const router = useRouter();
  const { isDark } = useThemePreference();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet<ProfileData>('/api/profile'),
    ...profileQueryOptions,
  });

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen message={(error as Error).message} />;
  if (!data) return null;

  const themeColors = isDark
    ? {
        page: '#0F1428',
        hero: '#202B58',
        card: '#1D2542',
        panel: '#171E37',
        text: '#F6F7FB',
        muted: '#AEB8D6',
        label: '#C4CBE0',
        border: 'rgba(255,255,255,0.12)',
        topButton: '#1F294B',
      }
    : {
        page: '#F6F7FB',
        hero: '#2A356B',
        card: '#E8ECF3',
        panel: '#FFFFFF',
        text: '#1C233B',
        muted: '#7E869F',
        label: '#6C6F7A',
        border: '#D3D8E4',
        topButton: '#FFFFFF',
      };

  const parentInfoRows = [
    { label: 'NAME', value: displayValue(data.parent.name) },
    { label: 'PHONE NUMBER', value: displayValue(data.parent.phone) },
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
            Parent Profile
          </Text>
        </View>

        <View style={[styles.heroCard, { backgroundColor: themeColors.hero }]}> 
          <View style={styles.heroGlow} />
          <View style={styles.avatarShell}>
            <Ionicons name="people-outline" size={42} color="#FFFFFF" />
          </View>

          <Text style={styles.name}>{displayValue(data.parent.name)}</Text>
          <Text style={styles.subtitle}>{displayValue(data.parent.phone)}</Text>
        </View>

        <Text style={[styles.sectionHeading, { color: themeColors.label }]}> 
          PARENT DETAILS
        </Text>

        <Card style={[styles.infoCard, { backgroundColor: themeColors.card }]}> 
          {parentInfoRows.map((item) => (
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

        <Card
          style={[
            styles.helperCard,
            {
              backgroundColor: themeColors.panel,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.helperTitle, { color: themeColors.text }]}> 
            Need to update these details?
          </Text>
          <Text style={[styles.helperCopy, { color: themeColors.muted }]}> 
            Contact your school administration to update parent contact information.
          </Text>
        </Card>
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
    right: -18,
    top: -36,
    width: 134,
    height: 134,
    borderRadius: 67,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarShell: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  name: {
    marginTop: 18,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.68)',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    paddingTop: 10,
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
    fontWeight: '900',
    letterSpacing: 1,
  },
  infoValue: {
    marginTop: 10,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
  },
  helperCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  helperTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  helperCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
});
