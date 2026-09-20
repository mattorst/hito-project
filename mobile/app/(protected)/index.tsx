import React from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useParks } from "@/features/parks/hooks/useParks";

// --- Paleta ----------------------------------------------------------------
const COLORS = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceBorder: "rgba(255,255,255,0.08)",
  glass: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.10)",
  ink: "#FFFFFF",
  inkSecondary: "#9BA1A6",
  inkTertiary: "#6E7378",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.14)",
  black: "#0B0C0D",
};

// --- Mapeo de Assets y Ubicaciones por Parque ---
const PARK_ASSETS: Record<
  string,
  { image: any; region: string }
> = {
  // Torres del Paine
  "1": {
    image: require("../../assets/torres.jpg"),
    region: "Magallanes y de la Antártica Chilena",
  },
  // Altos de Lircay
  "2": {
    image: require("../../assets/altoslircay.jpg"),
    region: "Región del Maule",
  },
};

// Configuración por defecto si entra un parque no mapeado
const DEFAULT_ASSET = {
  image: require("../../assets/torres.jpg"),
  region: "Chile",
};

export default function ParksScreen() {
  const { logout, activeTrekking } = useAuth();
  const { parks, isLoading, error, reload } = useParks();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.lime} />
        <Text style={styles.message}>Cargando parques...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header Principal */}
      <View style={styles.header}>
        <Text style={styles.title}>Parques</Text>


         <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push("/location-test")}
        activeOpacity={0.7}
        >
        <Ionicons name="location-outline" size={19} color={COLORS.ink} />
        </TouchableOpacity>

        <TouchableOpacity
        style={styles.iconButton}
        onPress={() => router.push("/tracking-test")}
        activeOpacity={0.7}
        >
        <Ionicons name="navigate-outline" size={19} color={COLORS.ink} />
        </TouchableOpacity>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/scan")}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={19} color={COLORS.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={19} color={COLORS.ink} />
          </TouchableOpacity>
        </View>
      </View>


     

      {/* Botón condicional de Trekking Activo */}
      {activeTrekking && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => router.push("/(protected)/trekking")}
          activeOpacity={0.85}
        >
          <View style={styles.activeBannerIconWrap}>
            <Ionicons name="navigate" size={17} color={COLORS.lime} />
          </View>
          <View style={styles.activeBannerTextWrap}>
            <Text style={styles.activeBannerEyebrow}>EN CURSO</Text>
            <Text style={styles.activeBannerText}>Ver trekking activo</Text>
          </View>
          <View style={styles.activeBannerChevronWrap}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.black} />
          </View>
        </TouchableOpacity>
      )}

      {/* Botón para acceder al historial de trekkings */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => router.push("/trekking/history")}
        activeOpacity={0.8}
      >
        <View style={styles.historyIconWrap}>
          <Ionicons name="time-outline" size={17} color={COLORS.lime} />
        </View>
        <Text style={styles.historyButtonText}>Mis trekkings</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.inkTertiary} />
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {!error && parks.length === 0 && (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="map-outline" size={30} color={COLORS.inkTertiary} />
          </View>
          <Text style={styles.emptyText}>No existen parques disponibles.</Text>
        </View>
      )}

      {!error && parks.length > 0 && (
        <FlatList
          data={parks}
          keyExtractor={(item) => item.id.toString()}
          refreshing={isLoading}
          onRefresh={reload}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const parkIdStr = item.id.toString();
            const parkNameLower = item.name.toLowerCase();

            // Determinar asset según ID o nombre
            let parkData = PARK_ASSETS[parkIdStr];

            if (!parkData) {
              if (parkNameLower.includes("lircay")) {
                parkData = PARK_ASSETS["2"];
              } else if (parkNameLower.includes("paine")) {
                parkData = PARK_ASSETS["1"];
              } else {
                parkData = DEFAULT_ASSET;
              }
            }

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.92}
                onPress={() => {
                  router.push(`/(protected)/parks/${item.id}`);
                }}
              >
                {/* Imagen dinámica por Parque */}
                <Image
                  source={parkData.image}
                  style={styles.cardImage}
                  resizeMode="cover"
                />

                {/* Velo en dos capas para degradado */}
                <View style={styles.cardScrimSoft} />
                <View style={styles.cardScrimStrong} />

                {/* Fila superior: badge de región + insignia */}
                <View style={styles.cardTopRow}>
                  <View style={styles.regionBadge}>
                    <Ionicons
                      name="location"
                      size={12}
                      color={COLORS.lime}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.regionBadgeText} numberOfLines={1}>
                      {parkData.region}
                    </Text>
                  </View>

                  <View style={styles.cardLeafBadge}>
                    <Ionicons name="leaf" size={14} color={COLORS.lime} />
                  </View>
                </View>

                {/* Contenido inferior */}
                <View style={styles.cardContent}>
                  <Text style={styles.parkName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.ctaPill}>
                      <Text style={styles.ctaPillText}>Ver parque</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={COLORS.black}
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    marginTop: 6,
  },

  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },

  iconButton: {
    backgroundColor: COLORS.glass,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.8,
  },

  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lime,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
  },

  activeBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  activeBannerTextWrap: {
    flex: 1,
  },

  activeBannerEyebrow: {
    color: "rgba(11,12,13,0.6)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 1,
  },

  activeBannerText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: "800",
  },

  activeBannerChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(11,12,13,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.limeDim,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  historyButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.ink,
  },

  listContainer: {
    paddingBottom: 24,
  },

  card: {
    height: 280,
    borderRadius: 28,
    marginBottom: 18,
    overflow: "hidden",
    backgroundColor: "#1B1C1E",
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },

  cardScrimSoft: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  cardScrimStrong: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
    backgroundColor: "rgba(0,0,0,0.72)",
  },

  cardTopRow: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  regionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(11,12,13,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: "78%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  regionBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },

  cardLeafBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(11,12,13,0.55)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  cardContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },

  parkName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 4,
  },

  description: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
    marginBottom: 14,
  },

  cardFooter: {
    flexDirection: "row",
  },

  ctaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lime,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    gap: 6,
  },

  ctaPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.black,
  },

  error: {
    color: COLORS.ink,
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "600",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.bg,
  },

  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  message: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.inkSecondary,
  },

  emptyText: {
    fontSize: 15,
    color: COLORS.inkSecondary,
    fontWeight: "500",
  },
});