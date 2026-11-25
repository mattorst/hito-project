
import React from "react";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import type { Park } from "../types";

// ---------------------------------------------------------
// HITO — HORARIOS DEL PARQUE
// ---------------------------------------------------------

type ParkSchedule = Pick<
  Park,
  | "opening_time"
  | "last_entry_time"
  | "return_deadline"
>;

interface ParkScheduleCardProps {
  schedule: ParkSchedule | null;
  isLoading?: boolean;
}

const COLORS = {
  surface: "#17181B",
  innerSurface: "#222428",
  border: "rgba(255,255,255,0.09)",
  white: "#FFFFFF",
  secondary: "#9BA1A6",
  lime: "#C6FF4D",
};

// ---------------------------------------------------------
// FORMATEAR HORARIOS DE DJANGO
// ---------------------------------------------------------

function formatTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "--:--";
  }

  // Django devuelve normalmente HH:mm:ss.
  // Solo necesitamos mostrar HH:mm.
  const match =
    /^([01]\d|2[0-3]):([0-5]\d)/.exec(value);

  if (!match) {
    return "--:--";
  }

  return `${match[1]}:${match[2]}`;
}

// ---------------------------------------------------------
// ELEMENTO INDIVIDUAL DE HORARIO
// ---------------------------------------------------------

function ScheduleItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const formatted = formatTime(value);

  return (
    <View style={styles.timeItem}>
      <Text style={styles.timeLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.timeValue,
          formatted === "--:--" &&
            styles.missingValue,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatted}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------

export default function ParkScheduleCard({
  schedule,
  isLoading = false,
}: ParkScheduleCardProps) {
  const hasSchedule = Boolean(
    schedule?.opening_time ||
    schedule?.last_entry_time ||
    schedule?.return_deadline,
  );

  return (
    <View style={styles.card}>
      {/* ENCABEZADO */}

      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="time-outline"
            size={19}
            color={COLORS.lime}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Horarios de visita
          </Text>

          <Text style={styles.subtitle}>
            Información configurada por el parque
          </Text>
        </View>
      </View>

      {/* CONTENIDO */}

      {isLoading ? (
        <Text style={styles.emptyText}>
          Cargando horarios...
        </Text>
      ) : hasSchedule ? (
        <>
          <View style={styles.timesRow}>
            <ScheduleItem
              label="Apertura"
              value={schedule?.opening_time}
            />

            <ScheduleItem
              label="Último ingreso"
              value={schedule?.last_entry_time}
            />

            <ScheduleItem
              label="Retorno"
              value={schedule?.return_deadline}
            />
          </View>

          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={COLORS.lime}
            />

            <Text style={styles.noticeText}>
              Consulta los horarios antes de tu
              visita. Pueden variar según la
              temporada, las condiciones y
              el sendero.
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={COLORS.secondary}
          />

          <Text style={styles.emptyText}>
            Horario no disponible
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------
// ESTILOS — HITO iOS DARK
// ---------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 22,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(198,255,77,0.11)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
  },

  subtitle: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 4,
  },

  timesRow: {
    flexDirection: "row",
    gap: 8,
  },

  timeItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.innerSurface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },

  timeLabel: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    minHeight: 26,
  },

  timeValue: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 5,
    letterSpacing: -0.3,
  },

  missingValue: {
    color: COLORS.secondary,
  },

  notice: {
    flexDirection: "row",
    gap: 9,
    backgroundColor: "rgba(198,255,77,0.07)",
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
    alignItems: "flex-start",
  },

  noticeText: {
    flex: 1,
    color: "#B9C4B0",
    fontSize: 11,
    lineHeight: 17,
  },

  emptyBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },

  emptyText: {
    color: COLORS.secondary,
    fontSize: 13,
    textAlign: "center",
  },
});
