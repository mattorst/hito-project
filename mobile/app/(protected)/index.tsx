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

export default function ParksScreen() {
  const { logout, activeTrekking } = useAuth();

  const {
    parks,
    isLoading,
    error,
    reload,
  } = useParks();

  // --- Identificador Único para Torres del Paine ---
  const TORRES_DEL_PAINE_ID = '1'; 

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.message}>
          Cargando parques...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* Header Principal Minimalista iOS */}
      <View style={styles.header}>
        <Text style={styles.title}>Parques</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/scan")}
            activeOpacity={0.7}
          >
            <Ionicons name="scan-outline" size={20} color="#111111" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButtonOutline}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#111111" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Botón condicional de Trekking Activo */}
      {activeTrekking && (
        <TouchableOpacity
          style={styles.activeBanner}
          onPress={() => router.push("/(protected)/trekking")}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.activeBannerText}>Ver trekking activo</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      )}

      {/* Botón para acceder al historial de trekkings */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => router.push("/trekking/history")}
        activeOpacity={0.8}
      >
        <Ionicons name="time-outline" size={18} color="#111111" style={{ marginRight: 8 }} />
        <Text style={styles.historyButtonText}>
          Mis trekkings
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#666666" style={{ marginLeft: "auto" }} />
      </TouchableOpacity>

      {error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {!error && parks.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={48} color="#999999" style={{ marginBottom: 12 }} />
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
            
            const isTorresDelPaine = item.id.toString() === TORRES_DEL_PAINE_ID;

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.88}
                onPress={() => {
                  router.push(`/(protected)/parks/${item.id}`);
                }}
              >
                {/* Imagen destacada superior estilo tarjeta de viaje */}
              <View style={styles.cardImageContainer}>
                <Image
                  source={require("../../assets/torres.jpg")}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                  {isTorresDelPaine && (
                    <View style={styles.regionBadge}>
                      <Ionicons name="location" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.regionBadgeText}>Magallanes y de la Antártica Chilena</Text>
                    </View>
                  )}
                </View>

                {/* Contenido de la Tarjeta */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.parkName}>
                      {item.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#888888" />
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
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
    backgroundColor: "#F4F5F7",
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },

  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },

  iconButton: {
    backgroundColor: "#FFFFFF",
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  iconButtonOutline: {
    backgroundColor: "#FFFFFF",
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.5,
  },

  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  activeBannerText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  historyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },

  listContainer: {
    paddingBottom: 24,
  },

  // --- Estilo Tarjeta con Imagen (Estilo App de Viajes) ---
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden", // Para recortar la imagen en las esquinas superiores
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  cardImageContainer: {
    height: 160,
    width: "100%",
    backgroundColor: "#E1E4E8",
    position: "relative",
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  regionBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  regionBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },

  cardContent: {
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  parkName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
    flex: 1,
  },

  description: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
  },

  error: {
    color: "#E53935",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F4F5F7",
  },

  message: {
    marginTop: 12,
    fontSize: 15,
    color: "#666666",
  },

  emptyText: {
    fontSize: 15,
    color: "#666666",
    fontWeight: "500",
  },
});