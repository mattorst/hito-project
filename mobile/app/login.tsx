import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";

const COLORS = {
  paper: "#000000",
  ink: "#FFFFFF",
  charcoal: "#A1A1AA",
  slate: "#71717A",
  mist: "#27272A",
  cloud: "#18181B",
  pine: "#34C759", // Verde exclusivo solo para los puntos del fondo
  pineLight: "transparent",
  pineGlow: "#34C759",
};

export default function LoginScreen() {
  const { login, isLoading, isAuthenticated } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignIn, setIsSignIn] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  async function handleLogin() {
    if (!username.trim() || !password) {
      Alert.alert("Atención", "Por favor ingresa usuario y contraseña.");
      return;
    }

    if (!isSignIn && password !== repeatPassword) {
      Alert.alert("Atención", "Las contraseñas no coinciden.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (isSignIn) {
        await login({
          username: username.trim().toLowerCase(),
          password,
        });
        Alert.alert("Éxito", "Inicio de sesión correcto.");
      } else {
        Alert.alert("Información", "El registro de cuentas estará disponible próximamente.");
      }
    } catch (error) {
      console.error("Error en login catch:", error);
      Alert.alert(
        "Error",
        "Usuario o contraseña incorrectos."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Fondo: crestas de montaña con puntos verdes */}
        <View style={styles.mountainBackground}>
          <View style={styles.ridgeBack} />
          <View style={styles.ridgeMid} />
          <View style={styles.ridgeFront} />
          <View style={styles.horizonLine} />
          <View style={[styles.waypointDot, styles.waypointDot1]} />
          <View style={[styles.waypointDot, styles.waypointDot2]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cabecera */}
          <View style={styles.headerContainer}>
            <View style={styles.logoBadge}>
              <Image
                source={require("../assets/hito_logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>hito</Text>
              <Ionicons
                name="location-sharp"
                size={16}
                color={COLORS.pine}
                style={styles.titlePin}
              />
            </View>
            <Text style={styles.subtitle}>
              {isSignIn ? "Inicia sesión para continuar tu ruta." : "Crea tu cuenta de aventurero."}
            </Text>
          </View>

          {/* Tarjeta */}
          <View style={styles.cardContainer}>

            {/* Tabs con línea inferior verde */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setIsSignIn(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, isSignIn && styles.tabTextActive]}>
                  Iniciar sesión
                </Text>
                {isSignIn && <View style={styles.tabIndicator} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setIsSignIn(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, !isSignIn && styles.tabTextActive]}>
                  Registrarse
                </Text>
                {!isSignIn && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            </View>

            {/* Campos de texto */}
            <View style={styles.fieldsWrapper}>
              <View
                style={[
                  styles.inputContainer,
                  focusedField === "username" && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={focusedField === "username" ? COLORS.ink : COLORS.slate}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Usuario"
                  placeholderTextColor={COLORS.slate}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  style={styles.input}
                />
              </View>

              <View
                style={[
                  styles.inputContainer,
                  focusedField === "password" && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={focusedField === "password" ? COLORS.ink : COLORS.slate}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor={COLORS.slate}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isSignIn ? "current-password" : "new-password"}
                  textContentType={isSignIn ? "password" : "newPassword"}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={styles.input}
                />
              </View>

              {!isSignIn && (
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "repeat" && styles.inputContainerFocused,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={focusedField === "repeat" ? COLORS.ink : COLORS.slate}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Repetir contraseña"
                    placeholderTextColor={COLORS.slate}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    value={repeatPassword}
                    onChangeText={setRepeatPassword}
                    onFocus={() => setFocusedField("repeat")}
                    onBlur={() => setFocusedField(null)}
                    style={styles.input}
                  />
                </View>
              )}
            </View>

            {/* Botón / Indicador de carga */}
            {isLoading || isSubmitting ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={COLORS.ink} />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleLogin}
                activeOpacity={0.88}
              >
                <Text style={styles.submitButtonText}>
                  {isSignIn ? "Iniciar sesión" : "Crear cuenta"}
                </Text>
              </TouchableOpacity>
            )}

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },

  // ---- Fondo de montañas modo oscuro ----
  mountainBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    overflow: "hidden",
    zIndex: 0,
  },
  ridgeBack: {
    position: "absolute",
    bottom: 60,
    left: -60,
    right: -60,
    height: 200,
    backgroundColor: "#121214",
    transform: [{ rotate: "-5deg" }],
    borderRadius: 60,
  },
  ridgeMid: {
    position: "absolute",
    bottom: 20,
    left: -40,
    right: -40,
    height: 180,
    backgroundColor: "#18181B",
    transform: [{ rotate: "4deg" }],
    borderRadius: 60,
  },
  ridgeFront: {
    position: "absolute",
    bottom: -40,
    left: -20,
    right: -20,
    height: 150,
    backgroundColor: "#202024",
    transform: [{ rotate: "-3deg" }],
    borderRadius: 50,
  },
  horizonLine: {
    position: "absolute",
    bottom: 208,
    left: 40,
    right: 60,
    height: 2,
    backgroundColor: COLORS.pineGlow,
    opacity: 0.25,
    borderRadius: 2,
    transform: [{ rotate: "-5deg" }],
  },
  waypointDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.pine,
    opacity: 0.45,
  },
  waypointDot1: { top: 130, right: 64 },
  waypointDot2: { top: 182, right: 118 },

  // ---- Layout general ----
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    zIndex: 1,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 84,
    height: 84,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
  },
  logoImage: {
    width: 64,
    height: 64,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  titlePin: {
    marginLeft: 3,
    marginTop: -2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.charcoal,
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },

  // ---- Tarjeta ----
  cardContainer: {
    backgroundColor: "#121212",
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: "#27272A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 4,
  },

  // ---- Tabs ----
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
    marginBottom: 28,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.slate,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    width: "40%",
    height: 2,
    backgroundColor: COLORS.pine,
    borderRadius: 2,
  },

  // ---- Campos de Texto ----
  fieldsWrapper: {
    gap: 16,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cloud,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputContainerFocused: {
    backgroundColor: "#18181B",
    borderColor: "#52525B",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.ink,
  },

  // ---- Botón / loader ----
  submitButton: {
    backgroundColor: COLORS.ink,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 3,
  },
  submitButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  loaderContainer: {
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
});