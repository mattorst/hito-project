import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTrails } from "@/features/parks/hooks/useTrails";
import { useAuth } from "@/features/auth/context/AuthContext";
import { startTrekking } from "@/features/trekking/services/trekkingService";

// --- Definición de Colores iOS en Fondo Blanco ---
const COLORS = {
  paper: "#F4F5F7",      // Fondo gris muy claro estilo iOS (como en el index)
  ink: "#111111",        // Texto principal oscuro
  pine: "#2E7D32",       // Verde naturaleza / iOS
  slate: "#666666",      // Texto secundario
  cloud: "#FFFFFF",      // Fondo de tarjetas blanco puro
  mist: "#E5E7EB",       // Bordes sutiles
  danger: "#FF3B30",     // Rojo para alertas
  cardBorder: "#E5E7EB", // Borde limpio para tarjetas
};

export default function ParkDetailScreen() {
  const { parkId } = useLocalSearchParams<{
    parkId: string;
  }>();

  const numericParkId = parkId ? parseInt(parkId, 10) : 0;

  const {
    trails,
    isLoading,
    error,
    reload,
  } = useTrails(numericParkId);

  const { activeTrekking, setActiveTrekking } = useAuth();

  const handleStartTrekking = async (trailId: number, trailName: string) => {
    if (activeTrekking) {
      Alert.alert(
        "Trekking en curso",
        "Ya tienes un recorrido activo. Ciérralo antes de iniciar uno nuevo.",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    Alert.alert(
      "Comenzar recorrido",
      `¿Deseas iniciar el sendero "${trailName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Iniciar",
          onPress: async () => {
            try {
              const trekking = await startTrekking({ trail: trailId });
              setActiveTrekking(trekking);
              router.push("/(protected)/trekking");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "No fue posible iniciar el trekking. Inténtalo de nuevo.");
            }
          },
          style: 'default'
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={COLORS.ink} />
        <Text style={styles.loadingText}>Cargando rutas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* Header Estilo iOS con botón de volver alineado y espaciado correcto */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={COLORS.ink} />
            <Text style={styles.backText}>Parques</Text>
        </TouchableOpacity>
        <Text style={styles.mainTitle}>Senderos</Text>
      </View>

      {error && (
        <View style={styles.statusContainer}>
          <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={reload} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && trails.length === 0 && (
        <View style={styles.center}>
           <Ionicons name="trail-sign-outline" size={48} color={COLORS.slate} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>
            Este parque aún no posee senderos registrados.
          </Text>
        </View>
      )}

      {/* Lista de Senderos Estilo iOS Claro */}
      {!error && trails.length > 0 && (
        <FlatList
          data={trails}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={reload}
          renderItem={({ item, index }) => (
            <View style={[styles.card, index === 0 && { marginTop: 4 }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/(protected)/parks/trails/${item.id}`)}
                style={styles.cardTouch}
              >
                <View style={styles.cardHeaderRow}>
                   <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                   <Ionicons name="chevron-forward" size={16} color={COLORS.slate} />
                </View>

                <Text style={styles.description} numberOfLines={3}>
                  {item.description}
                </Text>

                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                      <Ionicons name="map-outline" size={15} color={COLORS.slate} />
                      <Text style={styles.info}>{item.distance_km} km</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={15} color={COLORS.slate} />
                    <Text style={styles.info}>{item.estimated_duration}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Botón de Acción Principal - Negro Minimalista con acento iOS */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleStartTrekking(item.id, item.name)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Iniciar Trekking</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper, // Fondo claro unificado con el Index
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    marginBottom: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: -6,
      marginBottom: 6,
  },
  backText: {
      color: COLORS.ink,
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 2,
  },
  mainTitle: {
    fontSize: 30, // Título principal elegante alineado con el resto de la app
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.slate,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 36,
  },
  // Tarjeta estilo iOS Limpia y Clara
  card: {
    backgroundColor: COLORS.cloud,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTouch: {
    padding: 18,
    paddingBottom: 14,
  },
  cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.ink,
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: COLORS.slate,
    marginBottom: 14,
    lineHeight: 18,
  },
  metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: COLORS.mist,
      paddingTop: 12,
      marginTop: 2,
  },
  metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  metaDivider: {
      width: 1,
      height: 12,
      backgroundColor: COLORS.mist,
      marginHorizontal: 12,
  },
  info: {
    color: COLORS.slate,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 5,
  },
  // Botón de acción principal sólido y moderno
  actionButton: {
    flexDirection: 'row',
    backgroundColor: "#111111",
    margin: 16,
    marginTop: 4,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: 'rgba(255, 59, 48, 0.08)',
      marginVertical: 12,
      borderRadius: 12,
  },
  error: {
    color: COLORS.danger,
    fontSize: 14,
    marginHorizontal: 8,
    flex: 1,
    fontWeight: '500',
  },
  retryButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: COLORS.mist,
      borderRadius: 8,
  },
  retryText: {
      color: COLORS.ink,
      fontSize: 13,
      fontWeight: '600',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.slate,
    textAlign: "center",
    fontWeight: '500',
  },
});