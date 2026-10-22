import React, { memo } from "react";
import { Redirect, Tabs } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useSync } from "@/features/sync/hooks/useSync";

// --- Paleta iOS Dark Theme Premium Hito ---
const COLORS = {
  bg: "#0B0C0D",
  barGlassBg: Platform.OS === "ios" ? "rgba(23, 24, 27, 0.65)" : "rgba(18, 19, 22, 0.92)",
  borderGlow: "rgba(255, 255, 255, 0.14)",
  lime: "#C6FF4D",
  limeGlow: "rgba(198, 255, 77, 0.20)",
  limeBorder: "rgba(198, 255, 77, 0.40)",
  inkDark: "#0B0C0D",
  inkSecondary: "#8E8E93",
};

// Configuración de muelles nativos iOS (Respuesta táctil instantánea)
const SPRING_IOS = {
  damping: 18,
  stiffness: 280,
  mass: 0.6,
};

// --- Botón Estándar Memoizado con Animación en GPU ---
const AnimatedTabItem = memo(function AnimatedTabItem({
  isFocused,
  onPress,
  iconActive,
  iconInactive,
}: {
  isFocused: boolean;
  onPress: () => void;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}) {
  const activeValue = useDerivedValue(() => {
    return isFocused ? withSpring(1, SPRING_IOS) : withSpring(0, SPRING_IOS);
  }, [isFocused]);

  const activeCapsuleStyle = useAnimatedStyle(() => {
    return {
      opacity: activeValue.value,
      transform: [{ scale: 0.85 + activeValue.value * 0.15 }],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 0.95 + activeValue.value * 0.1 }],
    };
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabItemTouchable}
    >
      <View style={styles.tabItemContainer}>
        {/* Fondo activo (Cápsula Lima) */}
        <Animated.View style={[styles.activeCapsule, activeCapsuleStyle]} />
        
        {/* Ícono animado en GPU */}
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <Ionicons
            name={isFocused ? iconActive : iconInactive}
            size={22}
            color={isFocused ? COLORS.inkDark : COLORS.inkSecondary}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
});

// --- Botón Central QR Memoizado ---
const AnimatedCenterTabItem = memo(function AnimatedCenterTabItem({
  isFocused,
  onPress,
  iconActive,
  iconInactive,
}: {
  isFocused: boolean;
  onPress: () => void;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}) {
  const activeValue = useDerivedValue(() => {
    return isFocused ? withSpring(1, SPRING_IOS) : withSpring(0, SPRING_IOS);
  }, [isFocused]);

  const centerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 0.92 + activeValue.value * 0.14 }],
      backgroundColor: isFocused ? COLORS.lime : COLORS.limeGlow,
      borderColor: isFocused ? COLORS.lime : COLORS.limeBorder,
    };
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.centerTouchable}
    >
      <Animated.View style={[styles.centerTabItem, centerStyle]}>
        <Ionicons
          name={isFocused ? iconActive : iconInactive}
          size={22}
          color={isFocused ? COLORS.inkDark : COLORS.lime}
        />
      </Animated.View>
    </TouchableOpacity>
  );
});

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  useSync(isAuthenticated);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <View style={styles.rootWrapper}>
      <View style={styles.screenArea}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
          tabBar={({ state, navigation }) => {
            const TAB_CONFIG = [
              {
                routeName: "index",
                iconActive: "compass" as const,
                iconInactive: "compass-outline" as const,
              },
              {
                routeName: "scan/index",
                iconActive: "qr-code" as const,
                iconInactive: "qr-code-outline" as const,
                isCenterAction: true,
              },
              {
                routeName: "trekking/history",
                iconActive: "footsteps" as const,
                iconInactive: "footsteps-outline" as const,
              },
            ];

            return (
              <View style={styles.bottomBarOuterContainer}>
                <BlurView
                  intensity={Platform.OS === "ios" ? 60 : 95}
                  tint="dark"
                  style={[
                    styles.fullWidthBlurBar,
                    { paddingBottom: Math.max(insets.bottom, 12) },
                  ]}
                >
                  <View style={styles.tabItemsRow}>
                    {TAB_CONFIG.map((tab) => {
                      const route = state.routes.find((r) => r.name === tab.routeName);
                      if (!route) return null;

                      const index = state.routes.indexOf(route);
                      const isFocused = state.index === index;

                      const onPress = () => {
                        const event = navigation.emit({
                          type: "tabPress",
                          target: route.key,
                          canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                          navigation.navigate(route.name);
                        }
                      };

                      if (tab.isCenterAction) {
                        return (
                          <AnimatedCenterTabItem
                            key={route.key}
                            isFocused={isFocused}
                            onPress={onPress}
                            iconActive={tab.iconActive}
                            iconInactive={tab.iconInactive}
                          />
                        );
                      }

                      return (
                        <AnimatedTabItem
                          key={route.key}
                          isFocused={isFocused}
                          onPress={onPress}
                          iconActive={tab.iconActive}
                          iconInactive={tab.iconInactive}
                        />
                      );
                    })}
                  </View>
                </BlurView>
              </View>
            );
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          <Tabs.Screen name="scan/index" options={{ title: "Escanear" }} />
          <Tabs.Screen name="trekking/history" options={{ title: "Historial" }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenArea: {
    flex: 1,
  },
  bottomBarOuterContainer: {
    backgroundColor: COLORS.bg,
  },
  fullWidthBlurBar: {
    paddingTop: 10,
    paddingHorizontal: 36,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: COLORS.borderGlow,
    backgroundColor: COLORS.barGlassBg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 16,
  },
  tabItemsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabItemTouchable: {
    width: 60,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItemContainer: {
    width: 58,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  activeCapsule: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.lime,
    borderRadius: 21,
  },
  iconWrapper: {
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTouchable: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerTabItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});