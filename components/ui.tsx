import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import {
  ActivityIndicator,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';

export const palette = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F3F9',
  primary: '#1F2B63',
  primarySoft: '#E7EBFF',
  text: '#22305E',
  textMuted: '#7B84A3',
  textSoft: '#A4ABC1',
  border: '#E7EAF4',
  success: '#21B37C',
  danger: '#E45A5A',
  warning: '#F2A94D',
  mint: '#B9F6EB',
  lavender: '#DCE1FF',
  sky: '#E8F0FF',
  peach: '#FFE7E1',
};

export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <View style={styles.centerOrb}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
      <Text style={styles.loadingTitle}>Loading your dashboard</Text>
      <Text style={styles.loadingText}>
        Fetching the latest school updates.
      </Text>
    </View>
  );
}

export function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.centerOrb, { backgroundColor: palette.peach }]}>
        <Ionicons name="warning-outline" size={28} color={palette.danger} />
      </View>
      <Text style={styles.loadingTitle}>Something went wrong</Text>
      <Text style={styles.loadingText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function EmptyScreen({
  message,
  icon = 'albums-outline',
}: {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.center}>
      <View
        style={[styles.centerOrb, { backgroundColor: palette.surfaceMuted }]}
      >
        <Ionicons name={icon} size={28} color={palette.textMuted} />
      </View>
      <Text style={styles.loadingTitle}>Nothing to show</Text>
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function BrandHeader({ action }: { action?: React.ReactNode }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandBadge}>
        <Ionicons name="school-outline" size={18} color="#fff" />
      </View>
      <View style={styles.brandTextWrap}>
        <Text style={styles.brandText}>MIPS</Text>
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.screenTitle}>{title}</Text>
      {subtitle ? <Text style={styles.brandSubtext}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: palette.background,
  },
  centerOrb: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 2,
  },
  headerWrap: {
    gap: 6,
    marginBottom: 18,
    marginTop: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brandTextWrap: {
    flex: 1,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  brandSubtext: {
    marginTop: 2,
    fontSize: 16,
    color: palette.textMuted,
  },
  headerAction: {
    marginLeft: 12,
  },
  screenTitle: {
    fontSize: 33,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1,
    color: palette.text,
  },
  sectionRow: {
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: palette.text,
    letterSpacing: -0.3,
  },
});
