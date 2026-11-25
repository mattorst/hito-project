
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getUserIdFromToken } from "@/features/auth/utils/tokenIdentity";
import { createLocalTrekkingDraft } from "@/features/trekking/storage/trekkingGroupStorage";
import type { TrekkingCompanion } from "@/features/trekking/types";

const C = {
  bg: "#0B0C0D",
  surface: "#1C1C1E",
  border: "rgba(255,255,255,0.10)",
  white: "#FFFFFF",
  muted: "#8E8E93",
  lime: "#C6FF4D",
  danger: "#FF6B5E",
};

type Mode = "solo" | "group";

function newCompanion(): TrekkingCompanion {
  return {
    local_id: Crypto.randomUUID(),
    first_name: "",
    last_name: "",
    sex: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  };
}

export default function PrepareTrekkingScreen() {
  const { trailId, trailName } = useLocalSearchParams<{
    trailId: string;
    trailName?: string;
  }>();

  const { activeTrekking, accessToken } = useAuth();

  const [mode, setMode] = useState<Mode>("solo");
  const [companions, setCompanions] = useState<
    TrekkingCompanion[]
  >([]);

  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const participantCount =
    1 + (mode === "group" ? companions.length : 0);

  const numericTrailId = Number(trailId);

  const updateCompanion = (
    id: string,
    field: keyof TrekkingCompanion,
    value: string,
  ) => {
    setCompanions((current) =>
      current.map((item) =>
        item.local_id === id
          ? { ...item, [field]: value }
          : item,
      ),
    );
  };

  const addCompanion = () => {
    setCompanions((current) => [
      ...current,
      newCompanion(),
    ]);
  };

  const removeCompanion = (id: string) => {
    setCompanions((current) =>
      current.filter((item) => item.local_id !== id),
    );
  };

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);

    if (nextMode === "group" && companions.length === 0) {
      setCompanions([newCompanion()]);
    }
  };

  const validateForm = (): boolean => {
    if (
      !Number.isInteger(numericTrailId) ||
      numericTrailId <= 0
    ) {
      Alert.alert("Error", "El sendero no es válido.");
      return false;
    }

    if (activeTrekking) {
      Alert.alert(
        "Trekking en curso",
        "Debes finalizar tu recorrido actual antes de iniciar otro.",
      );
      return false;
    }

    if (mode === "solo") {
      return true;
    }

    if (companions.length === 0) {
      Alert.alert(
        "Acompañantes",
        "Agrega al menos un acompañante.",
      );
      return false;
    }

    for (const companion of companions) {
      if (
        !companion.first_name.trim() ||
        !companion.last_name.trim() ||
        !companion.emergency_contact_name.trim() ||
        !companion.emergency_contact_phone.trim()
      ) {
        Alert.alert(
          "Datos incompletos",
          "Completa el nombre, apellido y contacto de emergencia de cada acompañante.",
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (savingRef.current || !validateForm()) return;

    savingRef.current = true;
    setSaving(true);

    try {
      if (!accessToken) {
        throw new Error(
          "Debes iniciar sesión para preparar una excursión.",
        );
      }

      const ownerUserId = getUserIdFromToken(accessToken);
      const localId = Crypto.randomUUID();

      const saved = await createLocalTrekkingDraft({
        localId,
        ownerUserId,
        trailId: numericTrailId,
        companions: mode === "group" ? companions : [],
      });

      Alert.alert(
        "Preparación guardada",
        `Se guardó localmente la excursión con ${saved.participantCount} participante(s). Todavía no se ha iniciado el trekking.`,
        [
          {
            text: "Entendido",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error(
        "Error al guardar preparación:",
        error,
      );

      Alert.alert(
        "Error",
        "No fue posible guardar la preparación en el dispositivo.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={C.white}
            />
            <Text style={styles.backText}>Volver</Text>
          </Pressable>

          <Text style={styles.eyebrow}>
            PREPARAR EXCURSIÓN
          </Text>

          <Text style={styles.title}>
            ¿Cómo realizarás tu ruta?
          </Text>

          <Text style={styles.subtitle}>
            {trailName || "Sendero seleccionado"}
          </Text>

          <Text style={styles.description}>
            Indica si realizarás el recorrido solo o acompañado.
            Esta información ayudará a registrar correctamente
            a las personas de tu excursión.
          </Text>

          <View style={styles.modeRow}>
            <Pressable
              style={[
                styles.modeCard,
                mode === "solo" && styles.modeSelected,
              ]}
              onPress={() => selectMode("solo")}
            >
              <Ionicons
                name="person-outline"
                size={26}
                color={
                  mode === "solo" ? C.lime : C.white
                }
              />
              <Text style={styles.modeTitle}>Voy solo</Text>
              <Text style={styles.modeSubtitle}>
                1 persona
              </Text>
              {mode === "solo" && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={C.lime}
                  style={styles.modeCheck}
                />
              )}
            </Pressable>

            <Pressable
              style={[
                styles.modeCard,
                mode === "group" && styles.modeSelected,
              ]}
              onPress={() => selectMode("group")}
            >
              <Ionicons
                name="people-outline"
                size={26}
                color={
                  mode === "group" ? C.lime : C.white
                }
              />
              <Text style={styles.modeTitle}>
                Voy en grupo
              </Text>
              <Text style={styles.modeSubtitle}>
                2 o más personas
              </Text>
              {mode === "group" && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={C.lime}
                  style={styles.modeCheck}
                />
              )}
            </Pressable>
          </View>

          {mode === "group" && (
            <View style={styles.groupSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.flex}>
                  <Text style={styles.sectionTitle}>
                    Acompañantes
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Tu cuenta será la líder del grupo.
                  </Text>
                </View>
              </View>

              {companions.map((companion, index) => (
                <View
                  key={companion.local_id}
                  style={styles.companionCard}
                >
                  <View style={styles.companionHeader}>
                    <Text style={styles.companionTitle}>
                      Acompañante {index + 1}
                    </Text>

                    <Pressable
                      onPress={() =>
                        removeCompanion(companion.local_id)
                      }
                      hitSlop={12}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={C.danger}
                      />
                    </Pressable>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Nombre"
                    placeholderTextColor={C.muted}
                    value={companion.first_name}
                    onChangeText={(value) =>
                      updateCompanion(
                        companion.local_id,
                        "first_name",
                        value,
                      )
                    }
                    autoCapitalize="words"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Apellido"
                    placeholderTextColor={C.muted}
                    value={companion.last_name}
                    onChangeText={(value) =>
                      updateCompanion(
                        companion.local_id,
                        "last_name",
                        value,
                      )
                    }
                    autoCapitalize="words"
                  />

                  <Text style={styles.fieldLabel}>
                    Sexo (opcional)
                  </Text>

                  <View style={styles.sexRow}>
                    {(
                      [
                        ["M", "M"],
                        ["F", "F"],
                        ["O", "Otro"],
                        ["N", "No informar"],
                      ] as const
                    ).map(([value, label]) => (
                      <Pressable
                        key={value}
                        onPress={() =>
                          updateCompanion(
                            companion.local_id,
                            "sex",
                            companion.sex === value
                              ? ""
                              : value,
                          )
                        }
                        style={[
                          styles.sexChip,
                          companion.sex === value &&
                            styles.sexChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sexText,
                            companion.sex === value &&
                              styles.sexTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>
                    Contacto de emergencia
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Nombre del contacto"
                    placeholderTextColor={C.muted}
                    value={
                      companion.emergency_contact_name
                    }
                    onChangeText={(value) =>
                      updateCompanion(
                        companion.local_id,
                        "emergency_contact_name",
                        value,
                      )
                    }
                    autoCapitalize="words"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Teléfono de emergencia"
                    placeholderTextColor={C.muted}
                    keyboardType="phone-pad"
                    value={
                      companion.emergency_contact_phone
                    }
                    onChangeText={(value) =>
                      updateCompanion(
                        companion.local_id,
                        "emergency_contact_phone",
                        value,
                      )
                    }
                  />
                </View>
              ))}

              <Pressable
                style={styles.addButton}
                onPress={addCompanion}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={21}
                  color={C.lime}
                />
                <Text style={styles.addText}>
                  Agregar acompañante
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.summary}>
            <View>
              <Text style={styles.summaryLabel}>
                Personas registradas
              </Text>
              <Text style={styles.summaryHint}>
                Incluye al líder del recorrido
              </Text>
            </View>

            <Text style={styles.summaryCount}>
              {participantCount}
            </Text>
          </View>

          <Pressable
            style={[
              styles.saveButton,
              saving && styles.disabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <>
                <Ionicons
                  name="save-outline"
                  size={19}
                  color={C.bg}
                />
                <Text style={styles.saveText}>
                  Guardar preparación
                </Text>
              </>
            )}
          </Pressable>

          <Text style={styles.footerNote}>
            La información se guardará en este dispositivo.
            El trekking todavía no comenzará.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 48,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 30,
    gap: 4,
  },
  backText: {
    color: C.white,
    fontSize: 15,
  },
  eyebrow: {
    color: C.lime,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: C.white,
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: C.lime,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  description: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    marginBottom: 25,
  },
  modeRow: {
    flexDirection: "row",
    gap: 12,
  },
  modeCard: {
    flex: 1,
    minHeight: 132,
    padding: 16,
    justifyContent: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    gap: 8,
  },
  modeSelected: {
    borderColor: C.lime,
    backgroundColor: "#26301D",
  },
  modeTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },
  modeSubtitle: {
    color: C.muted,
    fontSize: 12,
  },
  modeCheck: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  groupSection: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    marginBottom: 14,
  },
  sectionTitle: {
    color: C.white,
    fontSize: 19,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 13,
    marginTop: 5,
  },
  companionCard: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    gap: 10,
  },
  companionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  companionTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },
  input: {
    backgroundColor: C.bg,
    color: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
  },
  fieldLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  sexRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sexChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  sexChipSelected: {
    borderColor: C.lime,
  },
  sexText: {
    color: C.muted,
    fontSize: 12,
  },
  sexTextSelected: {
    color: C.lime,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(198,255,77,0.35)",
    borderStyle: "dashed",
  },
  addText: {
    color: C.lime,
    fontSize: 14,
    fontWeight: "700",
  },
  summary: {
    backgroundColor: C.surface,
    padding: 18,
    borderRadius: 16,
    marginTop: 26,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryHint: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },
  summaryCount: {
    color: C.lime,
    fontSize: 30,
    fontWeight: "800",
  },
  saveButton: {
    backgroundColor: C.lime,
    height: 54,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  disabled: {
    opacity: 0.6,
  },
  saveText: {
    color: C.bg,
    fontSize: 15,
    fontWeight: "800",
  },
  footerNote: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 15,
  },
});
