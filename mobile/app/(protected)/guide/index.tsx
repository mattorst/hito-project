
import React, {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// =========================================================
// HITO — GUÍA DEL EXPLORADOR
//
// Tutorial horizontal, minimalista, estilo glass iOS.
//
// Flujo real:
// Parque -> Sendero -> Iniciar trekking ->
// Solo o grupo -> Acompañantes -> QR portería ->
// Checkpoints -> GPS -> Seguridad -> Offline ->
// QR portería para finalizar.
// =========================================================

const C = {
  bg: "#0B0C0D",
  surface: "#171A1B",
  surfaceAlt: "#202526",
  white: "#FFFFFF",
  muted: "#A8B0B1",
  subtle: "#778283",
  lime: "#C6FF4D",
  limeDim: "rgba(198,255,77,0.13)",
  border: "rgba(255,255,255,0.14)",
};

// Conservamos la imagen actual.
const GUIDE_COVER = require(
  "../../../src/assets/images/guia-explorador.png"
);

type IconName = keyof typeof Ionicons.glyphMap;

type GuideSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
  tip: string;
  image?: boolean;
};

// =========================================================
// CONTENIDO DEL TUTORIAL
// Ordenado según el funcionamiento actual de Hito.
// =========================================================

const SLIDES: GuideSlide[] = [
  {
    id: "welcome",
    eyebrow: "BIENVENIDO",
    title: "Tu recorrido, a tu ritmo.",
    description:
      "Explora parques, conoce sus senderos y registra tus caminatas con Hito.",
    icon: "compass-outline",
    tip: "Todo lo que necesitas para comenzar.",
    image: true,
  },
  {
    id: "explore",
    eyebrow: "01 / EXPLORA",
    title: "Elige tu sendero.",
    description:
      "Entra a un parque, revisa sus senderos y selecciona el que quieras recorrer.",
    icon: "trail-sign-outline",
    tip: "Pulsa «Iniciar trekking» para continuar.",
  },
  {
    id: "companions",
    eyebrow: "02 / PREPÁRATE",
    title: "¿Solo o acompañado?",
    description:
      "Indica si caminarás solo o en grupo. Si vas acompañado, agrega a las personas que irán contigo.",
    icon: "people-outline",
    tip: "Revisa los datos antes de comenzar.",
  },
  {
    id: "start",
    eyebrow: "03 / COMIENZA",
    title: "Escanea la portería.",
    description:
      "Cuando estés en la entrada del sendero, escanea su código QR para iniciar tu trekking.",
    icon: "scan-outline",
    tip: "El primer escaneo abre tu recorrido.",
  },
  {
    id: "checkpoints",
    eyebrow: "04 / REGISTRA",
    title: "Cada punto cuenta.",
    description:
      "Escanea los QR de ida y vuelta. En la cima, registra tu llegada y luego el inicio del descenso.",
    icon: "checkmark-circle-outline",
    tip: "Tus checkpoints se actualizan en el mapa.",
  },
  {
    id: "map",
    eyebrow: "05 / UBÍCATE",
    title: "Tu camino en el mapa.",
    description:
      "Consulta tu ubicación, el recorrido GPS y los puntos de control durante la caminata.",
    icon: "map-outline",
    tip: "Sigue también las señales del sendero.",
  },
  {
    id: "safety",
    eyebrow: "06 / SEGURIDAD",
    title: "Estamos para ayudarte.",
    description:
      "Durante tu trekking puedes reportar incidentes o registrar una solicitud de rescate.",
    icon: "shield-checkmark-outline",
    tip: "Una solicitud enviada no significa que la ayuda ya esté en camino.",
  },
  {
    id: "offline",
    eyebrow: "07 / SIN CONEXIÓN",
    title: "Sin señal, sigue registrando.",
    description:
      "Hito guarda tus registros en el teléfono e intenta enviarlos automáticamente cuando vuelve la conexión.",
    icon: "cloud-offline-outline",
    tip: "Revisa el estado para confirmar su envío.",
  },
  {
    id: "finish",
    eyebrow: "08 / FINALIZA",
    title: "Cierra tu recorrido.",
    description:
      "Al regresar a la portería, escanea nuevamente su QR para finalizar tu trekking.",
    icon: "flag-outline",
    tip: "Tu recorrido quedará guardado.",
  },
];

// =========================================================
// ILUSTRACIÓN DE MONTAÑAS
// Conserva el diseño anterior.
// =========================================================

function MountainArtwork({
  icon,
  index,
}: {
  icon: IconName;
  index: number;
}) {
  return (
    <View style={styles.artwork}>
      <View style={styles.sunGlow} />

      <View style={styles.artTop}>
        <View style={styles.artIndex}>
          <Text style={styles.artIndexText}>
            {String(index).padStart(2, "0")}
          </Text>
        </View>

        <Ionicons
          name="navigate-outline"
          size={20}
          color="rgba(255,255,255,0.55)"
        />
      </View>

      <View style={styles.artCenter}>
        <View style={styles.orbitOuter}>
          <View style={styles.orbitInner}>
            <Ionicons
              name={icon}
              size={67}
              color={C.lime}
            />
          </View>
        </View>
      </View>

      <View style={styles.mountainBack} />
      <View style={styles.mountainFront} />
    </View>
  );
}

// =========================================================
// TARJETA DEL TUTORIAL
// =========================================================

function SlideCard({
  slide,
  index,
  width,
  height,
}: {
  slide: GuideSlide;
  index: number;
  width: number;
  height: number;
}) {
  const isCover = slide.image === true;

  return (
    <View
      style={[
        styles.slidePage,
        { width },
      ]}
    >
      <View
        style={[
          styles.slideFrame,
          { height },
        ]}
      >
        <BlurView
          intensity={35}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.frameTint} />

        <View style={styles.slideContents}>
          {/* IMAGEN O ILUSTRACIÓN */}

          <View
            style={[
              styles.visualFrame,
              {
                height: Math.max(
                  175,
                  Math.min(310, height * 0.49)
                ),
              },
            ]}
          >
            {isCover ? (
              <View style={styles.coverArtwork}>
                <Image
                  source={GUIDE_COVER}
                  style={styles.coverImage}
                  resizeMode="cover"
                  accessibilityLabel="Excursionista en la naturaleza"
                />
              </View>
            ) : (
              <MountainArtwork
                icon={slide.icon}
                index={index}
              />
            )}
          </View>

          {/* INFORMACIÓN */}

          <View style={styles.copyArea}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowLine} />

              <Text style={styles.eyebrow}>
                {slide.eyebrow}
              </Text>
            </View>

            <Text
              style={styles.slideTitle}
              adjustsFontSizeToFit
              numberOfLines={3}
            >
              {slide.title}
            </Text>

            <Text style={styles.slideDescription}>
              {slide.description}
            </Text>
          </View>

          {/* NOTA BREVE */}

          <View style={styles.tipBox}>
            <Ionicons
              name="information-circle-outline"
              color={C.lime}
              size={17}
            />

            <Text style={styles.tipText}>
              {slide.tip}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// =========================================================
// PANTALLA PRINCIPAL
// =========================================================

export default function HitoGuideScreen() {
  const insets = useSafeAreaInsets();

  const {
    width: screenWidth,
    height: screenHeight,
  } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);

  const [activeIndex, setActiveIndex] =
    useState(0);

  const lastIndex = SLIDES.length - 1;

  const isLast =
    activeIndex === lastIndex;

  const horizontalPadding = 18;

  const cardWidth =
    screenWidth - horizontalPadding * 2;

  // Conservamos el tamaño de las tarjetas.
  const availableHeight =
    screenHeight -
    insets.top -
    insets.bottom -
    165;

  const cardHeight = Math.max(
    405,
    Math.min(650, availableHeight)
  );

  // -------------------------------------------------------
  // VOLVER
  // -------------------------------------------------------

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(protected)");
    }
  }, []);

  // -------------------------------------------------------
  // DESLIZAR A UNA TARJETA
  // -------------------------------------------------------

  const goToSlide = useCallback(
    (index: number) => {
      const next = Math.min(
        Math.max(index, 0),
        lastIndex
      );

      scrollRef.current?.scrollTo({
        x: next * screenWidth,
        animated: true,
      });

      setActiveIndex(next);
    },
    [lastIndex, screenWidth]
  );

  // -------------------------------------------------------
  // DETECTAR DESLIZAMIENTO MANUAL
  // -------------------------------------------------------

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const x =
      event.nativeEvent.contentOffset.x;

    const index = Math.round(
      x / screenWidth
    );

    setActiveIndex(
      Math.min(
        Math.max(index, 0),
        lastIndex
      )
    );
  };

  // -------------------------------------------------------
  // SIGUIENTE / FINALIZAR
  // -------------------------------------------------------

  const handleNext = () => {
    if (isLast) {
      router.replace("/(protected)");
      return;
    }

    goToSlide(activeIndex + 1);
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.bg}
      />

      {/* ENCABEZADO */}

      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={C.white}
          />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.headerTitle}>
            GUÍA DEL EXPLORADOR
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.replace("/(protected)")
          }
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel="Cerrar tutorial"
        >
          <Text style={styles.skipText}>
            Cerrar
          </Text>
        </Pressable>
      </View>

      {/* CARRUSEL HORIZONTAL */}

      <View style={styles.carouselArea}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={
            handleMomentumEnd
          }
          decelerationRate="fast"
          accessibilityLabel="Pasos del tutorial"
          contentContainerStyle={{
            alignItems: "center",
          }}
        >
          {SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={{
                width: screenWidth,
                paddingHorizontal:
                  horizontalPadding,
              }}
            >
              <SlideCard
                slide={slide}
                index={index}
                width={cardWidth}
                height={cardHeight}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* CONTROLES INFERIORES */}

      <View
        style={[
          styles.bottomArea,
          {
            paddingBottom: Math.max(
              insets.bottom,
              16
            ),
          },
        ]}
      >
        {/* INDICADOR DE PÁGINAS */}

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {String(activeIndex + 1).padStart(2, "0")}
            {" / "}
            {String(SLIDES.length).padStart(2, "0")}
          </Text>

          <View style={styles.dots}>
            {SLIDES.map((slide, index) => (
              <Pressable
                key={slide.id}
                onPress={() =>
                  goToSlide(index)
                }
                accessibilityRole="button"
                accessibilityLabel={`Ver paso ${index + 1}`}
                style={[
                  styles.dot,
                  index === activeIndex &&
                    styles.dotActive,
                ]}
              />
            ))}
          </View>

          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={C.subtle}
          />
        </View>

        {/* BOTONES */}

        <View style={styles.buttonRow}>
          {activeIndex > 0 && (
            <Pressable
              onPress={() =>
                goToSlide(activeIndex - 1)
              }
              accessibilityRole="button"
              accessibilityLabel="Paso anterior"
              style={({ pressed }) => [
                styles.previousButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={C.white}
              />
            </Pressable>
          )}

          <Pressable
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={
              isLast
                ? "Ir a explorar"
                : "Siguiente paso"
            }
            style={({ pressed }) => [
              styles.nextButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.nextText}>
              {isLast
                ? "Ir a explorar"
                : "Siguiente"}
            </Text>

            <Ionicons
              name={
                isLast
                  ? "compass-outline"
                  : "arrow-forward"
              }
              size={20}
              color={C.bg}
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// =========================================================
// ESTILOS
// Se conserva la estética glass anterior.
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  pressed: {
    opacity: 0.72,
  },

  // -------------------------------------------------------
  // ENCABEZADO
  // -------------------------------------------------------

  topBar: {
    height: 66,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: C.border,
  },

  topBarCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: C.white,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1.6,
    textAlign: "center",
  },

  skipButton: {
    width: 57,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  skipText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  // -------------------------------------------------------
  // CARRUSEL
  // -------------------------------------------------------

  carouselArea: {
    flex: 1,
    justifyContent: "center",
  },

  slidePage: {
    justifyContent: "center",
  },

  slideFrame: {
    backgroundColor:
      "rgba(30,35,35,0.75)",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.18)",
  },

  frameTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(13,18,18,0.32)",
  },

  slideContents: {
    flex: 1,
    padding: 17,
  },

  // -------------------------------------------------------
  // ILUSTRACIONES
  // -------------------------------------------------------

  visualFrame: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#1D2928",
  },

  coverArtwork: {
    flex: 1,
    backgroundColor: "#14201D",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  coverImage: {
    width: "100%",
    height: "100%",
  },

  artwork: {
    flex: 1,
    backgroundColor: "#182824",
    overflow: "hidden",
  },

  sunGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor:
      "rgba(198,255,77,0.07)",
    alignSelf: "center",
    top: 25,
  },

  artTop: {
    position: "absolute",
    top: 17,
    left: 17,
    right: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 3,
  },

  artIndex: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor:
      "rgba(0,0,0,0.19)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
  },

  artIndexText: {
    color: C.white,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  artCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 14,
    zIndex: 2,
  },

  orbitOuter: {
    width: 174,
    height: 174,
    borderRadius: 87,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      "rgba(198,255,77,0.25)",
    backgroundColor:
      "rgba(198,255,77,0.04)",
  },

  orbitInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(11,12,13,0.55)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.17)",
  },

  mountainBack: {
    position: "absolute",
    width: 270,
    height: 270,
    bottom: -213,
    left: -90,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "#30453A",
  },

  mountainFront: {
    position: "absolute",
    width: 325,
    height: 325,
    bottom: -267,
    right: -110,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "#24392F",
  },

  // -------------------------------------------------------
  // TEXTO DE CADA TARJETA
  // -------------------------------------------------------

  copyArea: {
    flex: 1,
    paddingHorizontal: 5,
    paddingTop: 19,
  },

  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 11,
  },

  eyebrowLine: {
    width: 18,
    height: 2,
    backgroundColor: C.lime,
    borderRadius: 2,
  },

  eyebrow: {
    color: C.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  slideTitle: {
    color: C.white,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 29,
  },

  slideDescription: {
    marginTop: 11,
    color: "#CED3D3",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "400",
  },

  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    borderRadius: 13,
    backgroundColor:
      "rgba(198,255,77,0.08)",
    borderWidth: 1,
    borderColor:
      "rgba(198,255,77,0.13)",
  },

  tipText: {
    flex: 1,
    color: "#C8D2C4",
    fontSize: 11,
    lineHeight: 17,
  },

  // -------------------------------------------------------
  // CONTROLES INFERIORES
  // -------------------------------------------------------

  bottomArea: {
    paddingHorizontal: 20,
    paddingTop: 15,
    backgroundColor: C.bg,
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  progressLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    width: 55,
  },

  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor:
      "rgba(255,255,255,0.24)",
  },

  dotActive: {
    width: 24,
    backgroundColor: C.lime,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },

  previousButton: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },

  nextButton: {
    flex: 1,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: C.lime,
    borderRadius: 16,
  },

  nextText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: "800",
  },
});
