import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Card,
  EmptyScreen,
  ErrorScreen,
  LoadingScreen,
  palette,
  ScreenHeader,
  SectionTitle,
} from '../../components/ui';
import { apiGet, apiPost } from '../../lib/api';

interface NotificationsData {
  notifications: Array<{
    id: string;
    source: 'notice' | 'broadcast';
    title: string;
    body: string;
    type: string;
    createdAt: string;
    isRead: boolean;
  }>;
  page: number;
  hasMore: boolean;
}

const typeStyles: Record<
  string,
  {
    bg: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    accent: string;
  }
> = {
  ACADEMIC: {
    bg: '#EEF0FF',
    icon: 'school-outline',
    title: 'Academic',
    accent: palette.primary,
  },
  ADMIN: {
    bg: '#EEF1FF',
    icon: 'business-outline',
    title: 'Admin',
    accent: '#6B74C9',
  },
  BROADCAST: {
    bg: '#E7FBF4',
    icon: 'people-outline',
    title: 'Class',
    accent: '#20A67C',
  },
  EVENT: {
    bg: '#FFF0E7',
    icon: 'megaphone-outline',
    title: 'Events',
    accent: '#E58E42',
  },
};

export default function AlertsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<NotificationsData>('/api/notifications'),
  });

  const markRead = useMutation({
    mutationFn: () => apiPost('/api/notifications/mark-read', {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <LoadingScreen />;
  if (isError)
    return <ErrorScreen message={(error as Error).message} onRetry={refetch} />;

  const notifications = Array.isArray(data?.notifications)
    ? data.notifications
    : [];
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={palette.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Notifications"
        subtitle="Stay updated with your child's academic journey and school life."
      />

      {/* <View style={styles.categoryGrid}>
        {['ACADEMIC', 'ADMIN', 'BROADCAST'].map((type) => {
          const config = typeStyles[type];
          return (
            <Card key={type} style={[styles.categoryCard, { backgroundColor: config.bg }]}> 
              <View style={styles.categoryIcon}>
                <Ionicons name={config.icon} size={18} color={config.accent} />
              </View>
              <Text style={styles.categoryTitle}>{config.title}</Text>
              <Text style={styles.categorySubtitle}>
                {type === 'ACADEMIC' ? 'Grades & Exams' : type === 'ADMIN' ? 'Fees & Holidays' : 'Teacher Notes'}
              </Text>
            </Card>
          );
        })}
      </View> */}

      <SectionTitle
        title="Recent Updates"
        trailing={
          unreadCount > 0 ? (
            <TouchableOpacity
              disabled={markRead.isPending}
              onPress={() => markRead.mutate()}
            >
              <Text style={styles.markReadText}>Mark all as read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyScreen
          message="No notifications yet."
          icon="notifications-off-outline"
        />
      ) : (
        <View style={styles.feed}>
          {notifications.map((item, index) => {
            const config = typeStyles[item.type] ?? typeStyles.BROADCAST;
            const buttonLabel =
              item.type === 'ADMIN' ? 'Pay Now' : 'View Report';
            return (
              <Card
                key={`${item.source}-${item.id}`}
                style={[styles.feedCard, !item.isRead && styles.feedCardUnread]}
              >
                {!item.isRead ? <View style={styles.unreadDot} /> : null}
                <Text style={styles.feedMeta}>
                  {config.title.toUpperCase()} •{' '}
                  {index === 0
                    ? 'TODAY'
                    : format(
                        new Date(item.createdAt),
                        'MMM dd',
                      ).toUpperCase()}{' '}
                  • {format(new Date(item.createdAt), 'hh:mm a')}
                </Text>
                <Text style={styles.feedTitle}>{item.title}</Text>
                <Text style={styles.feedBody} numberOfLines={4}>
                  {item.body}
                </Text>
                <View style={styles.feedActions}>
                  <TouchableOpacity
                    style={styles.primaryAction}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryActionText}>{buttonLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryActionText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <View style={styles.endWrap}>
        <Ionicons
          name="notifications-off-outline"
          size={18}
          color={palette.textSoft}
        />
        <Text style={styles.endText}>End of Notifications</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 128,
    gap: 18,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  categoryCard: {
    width: '47%',
    minHeight: 138,
    borderRadius: 24,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  categorySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textMuted,
  },
  feed: {
    gap: 14,
  },
  feedCard: {
    borderRadius: 28,
    paddingLeft: 22,
    position: 'relative',
  },
  feedCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
  },
  unreadDot: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: palette.primary,
  },
  feedMeta: {
    fontSize: 12,
    color: palette.textSoft,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  feedTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  feedBody: {
    fontSize: 15,
    color: palette.textMuted,
    lineHeight: 22,
    marginTop: 8,
  },
  feedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryAction: {
    backgroundColor: palette.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  secondaryActionText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  endWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
  },
  endText: {
    fontSize: 14,
    color: palette.textSoft,
    fontWeight: '600',
  },
});
