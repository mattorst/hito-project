import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useSync } from "@/features/sync/hooks/useSync";

export default function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Orquestador automático de sincronización en segundo plano y red
  useSync(isAuthenticated);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}