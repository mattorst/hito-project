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
// 1. Importamos la función que hace la petición HTTP a Django
import { login as loginService } from "@/features/auth/services/authService";

export default function LoginScreen() {
  const { login: setAuthTokens, isLoading, isAuthenticated } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  async function handleLogin() {
    try {
      // 2. Hacemos el POST /api/token/ a la API
      const tokens = await loginService({
        username: username.trim(),
        password,
      });

      // 3. Guardamos los tokens en el SecureStore/Contexto
      await setAuthTokens(tokens);

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