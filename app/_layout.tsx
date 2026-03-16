import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

import { useNotificationSync } from "@/hooks/useNotificationSync";
import { useStore } from "@/stores/stores";
import { useEffect } from "react";

export default function RootLayout() {
  const { isInitialized, initializeAuth, accessToken } = useStore() as any;
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    const group = segments[0];

    const inAuthGroup = group === "(auth)";
    const inStepGroup = group === "(step)";
    const inTabsGroup = group === "(tabs)";
    const inScreensGroup = group === "screens";

    if (!isInitialized) return;

    if (!accessToken) {
      // User is NOT signed in
      // Redirect to login ONLY if trying to access protected groups (tabs, screens)
      if (inTabsGroup || inScreensGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      // User IS signed in
      if (inAuthGroup || inStepGroup) {
        // Authenticated users shouldn't see auth pages or onboarding steps
        router.replace("/(tabs)");
      }
    }
  }, [accessToken, isInitialized, segments]);

  useNotificationSync();

  if (!isInitialized) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(step)" options={{ headerShown: false }} />
        <Stack.Screen name="screens" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
