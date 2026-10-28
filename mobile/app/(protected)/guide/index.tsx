
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ─────────────────────────────────────────
// HITO — GUÍA DEL EXPLORADOR
// ─────────────────────────────────────────

const C = {
  bg: "#0B0C0D",
  surface: "#17181B",
  surfaceAlt: "#202226",
  white: "#FFFFFF",
  muted: "#9BA1A6",
  lime: "#C6FF4D",
  border: "rgba(255,255,255,0.09)",
};

// Imagen ubicada en mobile/src/assets/images/
const GUIDE_COVER = require("../../../src/assets/images/guia-explorador.png");

type IconName = keyof typeof Ionicons.glyphMap;

type GuideSection = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  icon: IconName;
  steps: {
    title: string;
    description: string;
  }[];
  note?: string;
};

// ─────────────────────────────────────────
// CONTENIDO DE LA GUÍA
// ─────────────────────────────────────────

const SECTIONS: GuideSection[] = [
  {
    id: "explore",
    number: "01",
    title: "Explora los parques",
    subtitle: "Encuentra tu próxima aventura",
    icon: "compass-outline",
    steps: [
      {
        title: "Ingresa a Explorar",
        description:
          "Desde la pantalla principal encontrarás los parques disponibles en Hito.",
      },
      {
        title: "Selecciona un parque",
        description:
          "Toca su tarjeta para conocer los senderos y consultar la información disponible.",
      },
      {
        title: "Revisa el recorrido",
        description:
          "Consulta los detalles del sendero antes de comenzar tu expedición.",
      },
    ],
  },
  {
    id: "start",
    number: "02",
    title: "Inicia tu trekking",
    subtitle: "Comienza a registrar tu recorrido",
    icon: "footsteps-outline",
    steps: [
      {
        title: "Elige un sendero",
        description:
          "Selecciona el recorrido que deseas realizar desde el parque correspondiente.",
      },
      {
        title: "Sigue el proceso de inicio",
        description:
          "Utiliza las opciones disponibles en el sendero para comenzar tu trekking.",
      },
      {
        title: "Consulta tu actividad",
        description:
          "Cuando tengas un trekking activo, podrás volver a él desde la tarjeta «Trekking en curso» de Inicio.",
      },
    ],
  },
  {
    id: "map",
    number: "03",
    title: "Mapa y checkpoints",
    subtitle: "Identifica puntos del sendero",
    icon: "map-outline",
    steps: [
      {
        title: "Consulta el mapa",
        description:
          "Visualiza el recorrido y los checkpoints representados en el mapa del sendero.",
      },
      {
        title: "Identifica los puntos",
        description:
          "Los marcadores permiten reconocer los checkpoints disponibles durante la expedición.",
      },
      {
        title: "Sigue el sendero",
        description:
          "Utiliza la información del mapa como apoyo para orientarte durante tu recorrido.",
      },
    ],
    note:
      "El mapa de la aplicación no sustituye la señalización del parque ni las indicaciones de sus guardaparques.",
  },
  {
    id: "scan",
    number: "04",
    title: "Escanea códigos QR",
    subtitle: "Registra tus checkpoints, incluso offline",
    icon: "scan-outline",
    steps: [
      {
        title: "Busca el checkpoint",
        description:
          "Cuando llegues a un punto de control, identifica su código QR.",
      },
      {
        title: "Abre el escáner",
        description:
          "Presiona «Escanear» en la barra inferior de Hito.",
      },
      {
        title: "Apunta la cámara",
        description:
          "Coloca el código dentro del recuadro de escaneo y espera a que la aplicación lo detecte.",
      },
      {
        title: "Registra el checkpoint",
        description:
          "Hito permite guardar el registro del checkpoint en el dispositivo, incluso cuando no tienes conexión a internet.",
      },
      {
        title: "Comprueba el resultado",
        description:
          "Revisa la información que muestra Hito para confirmar que el registro se realizó correctamente.",
      },
    ],
    note:
      "Los checkpoints guardados sin conexión permanecen pendientes de sincronización hasta que puedan enviarse correctamente al servidor.",
  },
  {
    id: "incident",
    number: "05",
    title: "Reportes de incidentes",
    subtitle: "Registra situaciones con o sin internet",
    icon: "warning-outline",
    steps: [
      {
        title: "Identifica una situación",
        description:
          "Si encuentras un problema durante el recorrido, evalúa primero tu seguridad.",
      },
      {
        title: "Crea un reporte",
        description:
          "Utiliza la herramienta de reportes de incidentes disponible durante tu trekking para registrar la situación.",
      },
      {
        title: "Guarda el reporte offline",
        description:
          "Si no tienes internet, Hito permite almacenar el reporte localmente en tu dispositivo.",
      },
      {
        title: "Sincroniza posteriormente",
        description:
          "Cuando recuperes la conexión, el reporte pendiente podrá sincronizarse con el servidor.",
      },
    ],
    note:
      "Un incidente guardado offline todavía no ha sido recibido por el servidor. No utilices los reportes como único medio para solicitar ayuda urgente.",
  },
  {
    id: "emergency",
    number: "06",
    title: "Asistencia y emergencias",
    subtitle: "La seguridad es lo primero",
    icon: "shield-checkmark-outline",
    steps: [
      {
        title: "Prioriza tu seguridad",
        description:
          "Si ocurre una emergencia, busca un lugar seguro y evita exponerte a nuevos riesgos.",
      },
      {
        title: "Solicita ayuda",
        description:
          "Contacta a los servicios de emergencia o a los responsables del parque cuando sea posible.",
      },
      {
        title: "Utiliza Hito como apoyo",
        description:
          "Consulta las herramientas de seguridad disponibles en la aplicación para obtener información de apoyo durante tu recorrido.",
      },
    ],
    note:
      "Hito no reemplaza los servicios de rescate ni los procedimientos de emergencia del parque. Sin conexión, no debes asumir que una solicitud de ayuda ha sido recibida.",
  },
  {
    id: "offline",
    number: "07",
    title: "Conexión y sincronización",
    subtitle: "Explora incluso sin internet",
    icon: "cloud-offline-outline",
    steps: [
      {
        title: "Continúa sin conexión",
        description:
          "Hito utiliza una arquitectura Offline-First, diseñada para funcionar en lugares donde la conexión a internet es limitada o inexistente.",
      },
      {
        title: "Registra checkpoints offline",
        description:
          "Puedes escanear y registrar checkpoints durante tu trekking aunque no tengas internet. Los registros se almacenan localmente en tu dispositivo.",
      },
      {
        title: "Reporta incidentes offline",
        description:
          "Los reportes de incidentes también pueden guardarse localmente cuando no tienes conexión, evitando perder la información registrada.",
      },
      {
        title: "Sincroniza tus registros",
        description:
          "Cuando recuperas la conexión, Hito sincroniza los registros pendientes con el servidor.",
      },
      {
        title: "Comprueba el estado",
        description:
          "Verifica que la sincronización se haya completado correctamente antes de considerar enviados tus registros.",
      },
    ],
    note:
      "Los registros guardados localmente no deben considerarse recibidos por el servidor hasta que su sincronización se complete correctamente.",
  },
  {
    id: "finish",
    number: "08",
    title: "Finaliza tu aventura",
    subtitle: "Cierra el recorrido y revisa el resumen",
    icon: "flag-outline",
    steps: [
      {
        title: "Termina el recorrido",
        description:
          "Cuando hayas completado tu trekking, utiliza la opción de finalización disponible en Hito.",
      },
      {
        title: "Revisa tu resumen",
        description:
          "Consulta la información de la expedición finalizada, incluyendo su duración.",
      },
      {
        title: "Comparte tu experiencia",
        description:
          "Utiliza la opción de compartir para enviar el resumen de tu aventura.",
      },
    ],
  },
  {
    id: "history",
    number: "09",
    title: "Consulta tu historial",
    subtitle: "Revive tus expediciones",
    icon: "time-outline",
    steps: [
      {
        title: "Abre Historial",
        description:
          "Selecciona «Historial» desde la barra inferior.",
      },
      {
        title: "Selecciona una expedición",
        description:
          "Explora tus trekkings registrados y abre el que quieras consultar.",
      },
      {
        title: "Revisa sus detalles",
        description:
          "Consulta la información guardada de cada aventura.",
      },
    ],
  },
];

// ─────────────────────────────────────────
// COMPONENTE: PASO
// ─────────────────────────────────────────

function GuideStep({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {index + 1}
        </Text>
      </View>

      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>
          {title}
        </Text>

        <Text style={styles.stepDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// COMPONENTE: CAPÍTULO
// ─────────────────────────────────────────

function GuideAccordion({
  section,
  expanded,
  visited,
  onToggle,
}: {
  section: GuideSection;
  expanded: boolean;
  visited: boolean;
  onToggle: () => void;
}) {
  return (
    <View
      style={[
        styles.accordion,
        expanded && styles.accordionExpanded,
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={section.title}
        style={({ pressed }) => [
          styles.accordionHeader,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.sectionIcon}>
          <Ionicons
            name={section.icon}
            size={21}
            color={expanded ? C.lime : C.white}
          />
        </View>

        <View style={styles.sectionCopy}>
          <Text style={styles.sectionNumber}>
            CAPÍTULO {section.number}
          </Text>

          <Text style={styles.sectionTitle}>
            {section.title}
          </Text>

          <Text style={styles.sectionSubtitle}>
            {section.subtitle}
          </Text>
        </View>

        {visited && !expanded && (
          <Ionicons
            name="checkmark-circle"
            size={17}
            color={C.lime}
          />
        )}

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={19}
          color={expanded ? C.lime : C.muted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.accordionBody}>
          <View style={styles.bodyDivider} />

          {section.steps.map((step, index) => (
            <GuideStep
              key={`${section.id}-${index}`}
              index={index}
              title={step.title}
              description={step.description}
            />
          ))}

          {section.note && (
            <View style={styles.noteBox}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={C.lime}
              />

              <Text style={styles.noteText}>
                {section.note}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────

export default function HitoGuideScreen() {
  const insets = useSafeAreaInsets();

  const [expandedId, setExpandedId] =
    useState<string | null>("explore");

  const [visitedIds, setVisitedIds] =
    useState<string[]>(["explore"]);

  const handleToggle = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    setVisitedIds((current) =>
      current.includes(id)
        ? current
        : [...current, id]
    );
  };

  const progress =
    (visitedIds.length / SECTIONS.length) * 100;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)");
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.bg}
      />

      {/* BARRA SUPERIOR */}

      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver a Explorar"
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={C.white}
          />
        </Pressable>

        <Text style={styles.topBarTitle}>
          HITO / GUÍA
        </Text>

        <View style={styles.topBarRight}>
          <Ionicons
            name="book-outline"
            size={21}
            color={C.lime}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Math.max(insets.bottom, 20) + 40,
          },
        ]}
      >
        {/* PORTADA DEL MANUAL */}

        <View style={styles.coverSection}>
          <View style={styles.coverImageFrame}>
            <Image
              source={GUIDE_COVER}
              style={styles.coverImage}
              resizeMode="contain"
              accessibilityLabel="Portada de la Guía del explorador de Hito, con un excursionista leyendo un manual en la naturaleza"
            />
          </View>

          <View style={styles.coverCaption}>
            <View style={styles.coverCaptionLeft}>
              <Text style={styles.coverEyebrow}>
                MANUAL DE AVENTURA
              </Text>

              <Text style={styles.coverCaptionTitle}>
                Tu guía del explorador
              </Text>

              <Text style={styles.coverCaptionSubtitle}>
                9 capítulos para descubrir Hito.
              </Text>
            </View>

            <View style={styles.coverCaptionIcon}>
              <Ionicons
                name="compass-outline"
                size={23}
                color={C.lime}
              />
            </View>
          </View>
        </View>

        {/* OFFLINE-FIRST */}

        <View style={styles.offlineCard}>
          <View style={styles.offlineCardTop}>
            <View style={styles.offlineIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={24}
                color={C.lime}
              />
            </View>

            <View style={styles.offlineCopy}>
              <Text style={styles.offlineEyebrow}>
                DISEÑADO PARA LA NATURALEZA
              </Text>

              <Text style={styles.offlineTitle}>
                Tu aventura no depende de la señal.
              </Text>
            </View>
          </View>

          <Text style={styles.offlineDescription}>
            Registra checkpoints y reportes de incidentes
            sin conexión. Sincroniza tus registros cuando
            vuelva internet.
          </Text>

          <View style={styles.offlineTags}>
            <View style={styles.offlineTag}>
              <Text style={styles.offlineTagText}>
                QR OFFLINE
              </Text>
            </View>

            <View style={styles.offlineTag}>
              <Text style={styles.offlineTagText}>
                INCIDENTES
              </Text>
            </View>

            <View style={styles.offlineTag}>
              <Text style={styles.offlineTagText}>
                SINCRONIZACIÓN
              </Text>
            </View>
          </View>
        </View>

        {/* PROGRESO */}

        <View style={styles.progressSection}>
          <View style={styles.progressHeading}>
            <View style={styles.progressHeadingCopy}>
              <Text style={styles.progressEyebrow}>
                TU RECORRIDO
              </Text>

              <Text style={styles.progressTitle}>
                Guía del explorador
              </Text>
            </View>

            <Text style={styles.progressCount}>
              {visitedIds.length}/{SECTIONS.length}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>

          <Text style={styles.progressHint}>
            Toca cada capítulo para descubrir cómo
            utilizar Hito.
          </Text>
        </View>

        {/* CAPÍTULOS */}

        <View style={styles.chapters}>
          {SECTIONS.map((section) => (
            <GuideAccordion
              key={section.id}
              section={section}
              expanded={expandedId === section.id}
              visited={visitedIds.includes(section.id)}
              onToggle={() => handleToggle(section.id)}
            />
          ))}
        </View>

        {/* CIERRE */}

        <View style={styles.footerCard}>
          <View style={styles.footerIcon}>
            <Ionicons
              name="compass-outline"
              size={25}
              color={C.lime}
            />
          </View>

          <Text style={styles.footerTitle}>
            ¿Listo para explorar?
          </Text>

          <Text style={styles.footerDescription}>
            Tu próxima aventura te espera.
            Descubre los parques disponibles
            y comienza a explorar con Hito.
          </Text>

          <Pressable
            onPress={() => router.replace("/(protected)")}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.exploreButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.exploreButtonText}>
              Ir a explorar
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color={C.bg}
            />
          </Pressable>
        </View>

        <Text style={styles.footerBrand}>
          HITO / EXPLORE RESPONSIBLY
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  pressed: {
    opacity: 0.8,
  },

  // NAVEGACIÓN

  topBar: {
    height: 62,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  topBarTitle: {
    color: C.white,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  topBarRight: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  // PORTADA

  coverSection: {
    marginBottom: 18,
  },

  coverImageFrame: {
    width: "82%",
    aspectRatio: 2 / 3,
    alignSelf: "center",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  coverImage: {
    width: "100%",
    height: "100%",
  },

  coverCaption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 3,
    paddingTop: 18,
  },

  coverCaptionLeft: {
    flex: 1,
  },

  coverEyebrow: {
    color: C.lime,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 7,
  },

  coverCaptionTitle: {
    color: C.white,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  coverCaptionSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 6,
  },

  coverCaptionIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  // OFFLINE-FIRST

  offlineCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(198,255,77,0.16)",
    marginBottom: 6,
  },

  offlineCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  offlineIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: "#29341F",
    alignItems: "center",
    justifyContent: "center",
  },

  offlineCopy: {
    flex: 1,
  },

  offlineEyebrow: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 6,
  },

  offlineTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },

  offlineDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 14,
  },

  offlineTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 15,
  },

  offlineTag: {
    backgroundColor: "#29341F",
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  offlineTagText: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // PROGRESO

  progressSection: {
    marginTop: 31,
    marginBottom: 22,
  },

  progressHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  progressHeadingCopy: {
    flex: 1,
  },

  progressEyebrow: {
    color: C.lime,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.7,
    marginBottom: 8,
  },

  progressTitle: {
    color: C.white,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.7,
  },

  progressCount: {
    color: C.lime,
    fontSize: 15,
    fontWeight: "700",
  },

  progressTrack: {
    height: 4,
    backgroundColor: C.surfaceAlt,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 18,
  },

  progressFill: {
    height: "100%",
    backgroundColor: C.lime,
    borderRadius: 2,
  },

  progressHint: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  // CAPÍTULOS

  chapters: {
    gap: 11,
  },

  accordion: {
    backgroundColor: C.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  accordionExpanded: {
    borderColor: "rgba(198,255,77,0.28)",
  },

  accordionHeader: {
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 86,
  },

  sectionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },

  sectionNumber: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 5,
  },

  sectionTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },

  bodyDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 19,
  },

  // PASOS

  stepRow: {
    flexDirection: "row",
    gap: 13,
    marginBottom: 21,
  },

  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#29341F",
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumberText: {
    color: C.lime,
    fontSize: 11,
    fontWeight: "800",
  },

  stepCopy: {
    flex: 1,
    paddingTop: 2,
  },

  stepTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: "700",
  },

  stepDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },

  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#232A1C",
    borderRadius: 13,
    padding: 13,
  },

  noteText: {
    flex: 1,
    color: "#C5CCB8",
    fontSize: 11,
    lineHeight: 18,
  },

  // CIERRE

  footerCard: {
    backgroundColor: C.surface,
    borderRadius: 23,
    padding: 22,
    marginTop: 28,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },

  footerIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#29341F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },

  footerTitle: {
    color: C.white,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  footerDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 23,
  },

  exploreButton: {
    width: "100%",
    height: 52,
    backgroundColor: C.lime,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },

  exploreButtonText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: "800",
  },

  footerBrand: {
    color: "#55595E",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 28,
  },
});
