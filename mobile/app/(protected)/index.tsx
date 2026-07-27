import { Button, SafeAreaView, StyleSheet, Text } from "react-native";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function HomeScreen() {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bienvenido a Hito</Text>

      <Button
        title="Cerrar sesión"
        onPress={logout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
});