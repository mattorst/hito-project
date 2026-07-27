import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { setupInterceptors } from "@/api/interceptors";

export default function RootLayout() {
  useEffect(() => {
    setupInterceptors();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}