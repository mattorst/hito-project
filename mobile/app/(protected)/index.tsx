import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useParks } from "@/features/parks/hooks/useParks";

// ─────────────────────────────────────────
// HITO — DESIGN SYSTEM
// ─────────────────────────────────────────

const C = {
  bg: "#0B0C0D",
  surface: "#1C1C1E",
  surfaceHighlight: "#292D24",

  white: "#FFFFFF",
  secondary: "#8E8E93",
  lime: "#C6FF4D",

  divider: "rgba(255,255,255,0.08)",
};

// ─────────────────────────────────────────
// ASSETS DE PARQUES
// ─────────────────────────────────────────

const PARK_ASSETS: Record<
  string,
  {
    image: any;
    region: string;
  }
> = {
  "1": {
    image: require("../../assets/torres.jpg"),
    region: "Magallanes, Chile",
  },

  "2": {
    image: require("../../assets/altoslircay.jpg"),
    region: "Región del Maule",
  },
};

const DEFAULT_ASSET = {
  image: require("../../assets/torres.jpg"),
  region: "Chile",
};

// ─────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────

type Park = {
  id: number | string;
  name: string;
  description?: string | null;
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function getParkAsset(park: Park) {
  const id = String(park.id);
  const name = park.name.toLowerCase();

  if (PARK_ASSETS[id]) {
    return PARK_ASSETS[id];
  }

  if (name.includes("lircay")) {
    return PARK_ASSETS["2"];
  }

  if (name.includes("paine")) {
    return PARK_ASSETS["1"];
  }

  return DEFAULT_ASSET;
}

// ─────────────────────────────────────────
// COMPONENTE: PARK CARD
// ─────────────────────────────────────────

function ParkCard({ park }: { park: Park }) {
  const asset = getParkAsset(park);

  return (
    <Pressable
      onPress={() =>
        router.push(`/(protected)/parks/${park.id}`)
      }
      accessibilityRole="button"
      accessibilityLabel={`Explorar ${park.name}`}
      style={({ pressed }) => [
        styles.parkCard,
        pressed && styles.pressed,
      ]}
    >
      {/* Imagen del parque */}

      <Image
        source={asset.image}
        style={styles.parkImage}
        resizeMode="cover"
      />

      {/* Información */}

      <View style={styles.parkInfo}>
        <View style={styles.parkCopy}>
          <Text style={styles.parkName}>
            {park.name}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={13}
              color={C.secondary}
            />

            <Text style={styles.parkRegion}>
              {asset.region}
            </Text>
          </View>
        </View>

        {/* Flecha minimalista */}

        <View style={styles.parkArrow}>
          <Ionicons
            name="arrow-up-outline"
            size={20}
            color={C.lime}
            style={{
              transform: [{ rotate: "45deg" }],
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────
// COMPONENTE: TREKKING ACTIVO
// ─────────────────────────────────────────

function ActiveTrekkingCard() {
  return (
    <Pressable
      onPress={() =>
        router.push("/(protected)/trekking")
      }
      accessibilityRole="button"
      accessibilityLabel="Continuar trekking activo"
      style={({ pressed }) => [
        styles.activeTrekking,
        pressed && styles.pressed,
      ]}
    >
      {/* Ícono de navegación */}

      <View style={styles.activeIcon}>
        <Ionicons
          name="navigate"
          size={19}
          color={C.lime}
        />
      </View>

      {/* Textos */}

      <View style={styles.activeCopy}>
        <Text style={styles.activeTitle}>
          Trekking en curso
        </Text>

        <Text style={styles.activeSubtitle}>
          Continúa tu recorrido
        </Text>
      </View>

      {/* Flecha verde */}

      <View style={styles.activeArrow}>
        <Ionicons
          name="chevron-forward"
          size={17}
          color={C.bg}
        />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────
// COMPONENTE NUEVO: GUÍA DEL EXPLORADOR
// ─────────────────────────────────────────

function GuideCard() {
  return (
    <Pressable
      onPress={() => router.push("/guide")}
      accessibilityRole="button"
      accessibilityLabel="Abrir guía del explorador"
      style={({ pressed }) => [
        styles.guideCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.guideTop}>
        <View style={styles.guideIcon}>
          <Ionicons
            name="book-outline"
            size={23}
            color={C.lime}
          />
        </View>

        <View style={styles.guideCopy}>
          <Text style={styles.guideEyebrow}>
            PRIMEROS PASOS
          </Text>

          <Text style={styles.guideTitle}>
            ¿Nuevo en Hito?
          </Text>

          <Text style={styles.guideDescription}>
            Aprende a explorar, registrar checkpoints
            y conocer las herramientas de Hito.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color={C.lime}
        />
      </View>

      <View style={styles.guideDivider} />

      <View style={styles.guideBottom}>
        <Text style={styles.guideLink}>
          Abrir guía del explorador
        </Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color={C.lime}
        />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────
// COMPONENTE: HEADER
// ─────────────────────────────────────────

function HomeHeader({
  activeTrekking,
  onLogout,
}: {
  activeTrekking: boolean;
  onLogout: () => void;
}) {
  return (
    <View>
      {/* Encabezado principal */}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerEyebrow}>
            HITO / EXPLORAR
          </Text>

          <Text style={styles.headerTitle}>
            Tu próxima aventura.
          </Text>

          <Text style={styles.headerSubtitle}>
            Descubre lugares para desconectarte.
          </Text>
        </View>

        {/* Perfil / cerrar sesión */}

        <Pressable
          onPress={onLogout}
          style={styles.profileButton}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons
            name="person-outline"
            size={19}
            color={C.white}
          />
        </Pressable>
      </View>

      {/* Trekking activo */}

      {activeTrekking && <ActiveTrekkingCard />}

      {/* Nueva guía */}

      <GuideCard />

      {/* Encabezado de parques */}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Explora los parques
        </Text>

        <Ionicons
          name="trail-sign-outline"
          size={20}
          color={C.lime}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────

export default function ParksScreen() {
  const { logout, activeTrekking } = useAuth();

  const {
    parks,
    isLoading,
    error,
    reload,
  } = useParks();

  const insets = useSafeAreaInsets();

  const parkList = (parks ?? []) as Park[];

  // Confirmación de cierre de sesión

  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Deseas salir de Hito?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            void logout();
          },
        },
      ]
    );
  };

  // Estado de carga

  if (isLoading && parkList.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="light-content" />

        <ActivityIndicator
          size="large"
          color={C.lime}
        />

        <Text style={styles.loadingText}>
          Preparando tu aventura...
        </Text>
      </SafeAreaView>
    );
  }

  // Render principal

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.bg}
      />

      <FlatList
        data={error ? [] : parkList}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ParkCard park={item} />
        )}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={reload}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: 110 + insets.bottom,
          },
        ]}
        ListHeaderComponent={
          <HomeHeader
            activeTrekking={Boolean(activeTrekking)}
            onLogout={handleLogout}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={
                error
                  ? "cloud-offline-outline"
                  : "map-outline"
              }
              size={30}
              color={C.secondary}
            />

            <Text style={styles.emptyText}>
              {error
                ? String(error)
                : "No hay parques disponibles."}
            </Text>

            {error && (
              <Pressable
                onPress={() => void reload()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>
                  Reintentar
                </Text>
              </Pressable>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  // PANTALLA

  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexGrow: 1,
  },

  pressed: {
    opacity: 0.82,
  },

  // HEADER

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  headerEyebrow: {
    color: C.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 9,
  },

  headerTitle: {
    color: C.white,
    fontSize: 29,
    fontWeight: "700",
    letterSpacing: -1,
    lineHeight: 35,
  },

  headerSubtitle: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  // TREKKING ACTIVO

  activeTrekking: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 28,
  },

  activeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  activeCopy: {
    flex: 1,
    minWidth: 0,
  },

  activeTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: "600",
  },

  activeSubtitle: {
    color: C.secondary,
    fontSize: 12,
    marginTop: 4,
  },

  activeArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.lime,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  // GUÍA DEL EXPLORADOR

  guideCard: {
    backgroundColor: "#17181B",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(198,255,77,0.15)",
    padding: 16,
    marginBottom: 30,
  },

  guideTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  guideIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#29341F",
    alignItems: "center",
    justifyContent: "center",
  },

  guideCopy: {
    flex: 1,
    minWidth: 0,
  },

  guideEyebrow: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 6,
  },

  guideTitle: {
    color: C.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  guideDescription: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  guideDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 15,
  },

  guideBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  guideLink: {
    color: C.white,
    fontSize: 12,
    fontWeight: "600",
  },

  // SECCIÓN PARQUES

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  sectionTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // TARJETAS

  parkCard: {
    width: "100%",
    marginBottom: 26,
  },

  parkImage: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: C.surface,
  },

  parkInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 13,
    gap: 12,
  },

  parkCopy: {
    flex: 1,
    minWidth: 0,
  },

  parkName: {
    color: C.white,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 23,
    flexShrink: 1,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },

  parkRegion: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 17,
    flexShrink: 1,
  },

  parkArrow: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // LOADING

  center: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: C.secondary,
    fontSize: 13,
    marginTop: 14,
  },

  // EMPTY STATE

  emptyState: {
    alignItems: "center",
    paddingVertical: 45,
  },

  emptyText: {
    color: C.secondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },

  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 14,
  },

  retryText: {
    color: C.lime,
    fontSize: 14,
    fontWeight: "600",
  },
});