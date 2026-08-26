import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function LoginScreen() {
  const { login, isLoading, isAuthenticated } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  async function handleLogin() {
    if (!username.trim() || !password) {
      Alert.alert("Atención", "Por favor ingresa usuario y contraseña.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({
        username: username.trim().toLowerCase(),
        password,
      });

      Alert.alert("Éxito", "Inicio de sesión correcto.");
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
      <View style={styles.content}>
        <Text style={styles.title}>Hito</Text>

        <TextInput
          placeholder="Usuario"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />

        <TextInput
          placeholder="Contraseña"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {isLoading || isSubmitting ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
            disabled={isSubmitting}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  content: {
    gap: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
});