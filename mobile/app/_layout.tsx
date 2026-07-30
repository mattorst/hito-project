import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { ScanProvider } from "@/features/checkpoints/context/ScanContext";
import { setupInterceptors } from "@/api/interceptors";

export default function RootLayout() {
  useEffect(() => {
    setupInterceptors();
  }, []);

  return (
    <AuthProvider>
      <ScanProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ScanProvider>
    </AuthProvider>
  );
}