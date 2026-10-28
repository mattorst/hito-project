import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useSync } from "@/features/sync/hooks/useSync";

const C = {
  bg: "#0B0C0D",
  surface: "#1C1C1E",
  white: "#FFFFFF",
  muted: "#8E8E93",
  lime: "#C6FF4D",
  border: "rgba(255,255,255,0.12)",
};

type IconName = keyof typeof Ionicons.glyphMap;

const NAV_ITEMS: {
  route: string;
  label: string;
  active: IconName;
  inactive: IconName;
  center?: boolean;
}[] = [
  {
    route: "index",
    label: "Explorar",
    active: "compass",
    inactive: "compass-outline",
  },
  {
    route: "scan/index",
    label: "Escanear",
    active: "scan",
    inactive: "scan-outline",
    center: true,
  },
  {
    route: "trekking/history",
    label: "Historial",
    active: "footsteps",
    inactive: "footsteps-outline",
  },
];

function FloatingTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // La guía tiene su propia navegación.
  // No mostramos la barra flotante mientras esté abierta.
  const currentRoute = state.routes[state.index];

  if (currentRoute?.name === "guide/index") {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabPosition,
        { bottom: Math.max(insets.bottom, 12) + 4 },
      ]}
    >
      <View style={styles.tabBar}>
        {NAV_ITEMS.map((item) => {
          const route = state.routes.find(
            (r) => r.name === item.route
          );

          if (!route) return null;

          const routeIndex = state.routes.indexOf(route);
          const focused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (item.center) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.navItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel="Escanear checkpoint"
              >
                <View style={styles.scanButton}>
                  <Ionicons
                    name="scan-outline"
                    size={22}
                    color={C.bg}
                  />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.navItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
            >
              <Ionicons
                name={
                  focused
                    ? item.active
                    : item.inactive
                }
                size={21}
                color={focused ? C.lime : C.muted}
              />

              <Text
                style={[
                  styles.navLabel,
                  focused && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useSync(isAuthenticated);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.root}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Explorar" }}
        />

        <Tabs.Screen
          name="scan/index"
          options={{ title: "Escanear" }}
        />

        <Tabs.Screen
          name="trekking/history"
          options={{ title: "Historial" }}
        />

        {/* Nueva pantalla informativa */}
        <Tabs.Screen
          name="guide/index"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  tabPosition: {
    position: "absolute",
    left: 28,
    right: 28,
    alignItems: "center",
    zIndex: 20,
  },

  tabBar: {
    width: "100%",
    maxWidth: 350,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: C.surface,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: C.border,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },

  navItem: {
    flex: 1,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  navLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "500",
  },

  navLabelActive: {
    color: C.lime,
    fontWeight: "600",
  },

  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.lime,
    alignItems: "center",
    justifyContent: "center",
  },
});