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

  // Si ya está autenticado, redirige automáticamente a las pantallas protegidas
  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  async function handleLogin() {
    try {
      await login({
        username: username.trim(),
        password,
      });

      Alert.alert("Éxito", "Inicio de sesión correcto.");
    } catch {
      Alert.alert(
        "Error",
        "Usuario o contraseña incorrectos.",
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hito</Text>

        <TextInput
          placeholder="Usuario"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />

        <TextInput
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
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