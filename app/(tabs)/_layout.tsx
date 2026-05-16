import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader, palette } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    height: 78,
    borderTopWidth: 0,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 12,
  },
  tabBarItem: {
    paddingVertical: 0,
  },
  tabItem: {
    minWidth: 72,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: palette.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.textMuted,
  },
  tabLabelActive: {
    color: '#fff',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  stickyHeader: {
    paddingHorizontal: 22,
    paddingBottom: 12,
    backgroundColor: palette.background,
  },
  profileAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function TabIcon({
  name,
  label,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Ionicons
        name={name}
        size={18}
        color={focused ? '#fff' : palette.textMuted}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.root}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
        <BrandHeader
          action={
            <TouchableOpacity
              style={styles.profileAction}
              activeOpacity={0.85}
              onPress={() => router.push('/profile')}
            >
              <Ionicons
                name="person-circle-outline"
                size={22}
                color={palette.primary}
              />
            </TouchableOpacity>
          }
        />
      </View>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabBarItem,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="grid" label="Home" focused={focused} />
            ),
            headerRight: () => (
              <Pressable
                onPress={() => router.push('/profile')}
                style={styles.headerButton}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color={palette.primary}
                />
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: 'Attendance',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name="calendar-clear"
                label="Attendance"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name="wallet-outline"
                label="Calendar"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="notifications" label="Alerts" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
