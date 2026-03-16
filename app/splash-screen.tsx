import { useStore } from "@/stores/stores";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { ImageBackground, View } from "react-native";

const SplashScreen = () => {
  const { user, accessToken, initializeAuth } = useStore() as any;

  useEffect(() => {
    let timer: any;

    const init = async () => {
      // Ensure auth is initialized from storage
      const auth = await initializeAuth();

      timer = setTimeout(() => {
        if (auth && auth.user && auth.accessToken) {
          router.replace("/(tabs)");
        } else {
          router.replace("/(step)/step1");
        }
      }, 2000);
    };

    init();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []); // Only run on mount


  return (
    <ImageBackground
      source={require("@/assets/images/splash-screen.png")}
      resizeMode="cover"
      style={{ flex: 1, width: "100%", height: "100%" }}
    >
      <View className="flex-1 items-center justify-center">
        <Image
          source={require("@/assets/images/splash-logo.svg")}
          contentFit="contain"
          style={{
            height: 320,
            width: 320,
          }}
        />
      </View>
    </ImageBackground>
  );
};

export default SplashScreen;
