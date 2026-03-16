import GradientButton from "@/components/GradientButton";
import { router } from "expo-router";
import React from "react";
import {
  ImageBackground,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


const step2 = () => {
  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      {/* Full screen image background */}
      <View className="flex-1 relative">
        <ImageBackground
          source={require("@/assets/images/222.png")}
          resizeMode="cover"
          className="flex-1"
        >
          {/* Skip button */}
          <View className="absolute top-12 right-2">
            <TouchableOpacity onPress={() => router.push("/(step)/step4")}>
              <Text className="text-base font-medium text-[#FFCD39]">Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Progress indicators - Step 2 active */}
          {/* <View className="flex-row justify-between items-center px-6 pt-14">
            <View className="flex-row gap-2">
              <View className="w-20 h-2 bg-gray-400 rounded-full" />
              <View className="w-20 h-2 bg-yellow-400 rounded-full" />
              <View className="w-20 h-2 bg-gray-400 rounded-full" />
              <View className="w-20 h-2 bg-gray-400 rounded-full" />
            </View>
          </View> */}
        </ImageBackground>
      </View>

      {/* Bottom section - increased height and reduced pb to move button up */}
      <View className="h-[320px] bg-white px-6 pt-8 pb-6">
        {/* Progress indicators above title */}
        <View className="flex-row justify-center gap-2 mb-4">
          <View className="w-6 h-2 bg-gray-200 rounded-full" />
          <View className="w-10 h-2 bg-yellow-400 rounded-full" />
          <View className="w-6 h-2 bg-gray-200 rounded-full" />
          <View className="w-6 h-2 bg-gray-200 rounded-full" />
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Good for You, Great for Local Shops
        </Text>

        {/* Description */}
        <Text className="text-base text-gray-600 leading-relaxed mb-8 text-center">
          In an expensive economy, we help local businesses thrive by recouping ingredient costs. You get a fresh meal; they keep their doors open. It's a win-win.
        </Text>

        {/* Next button - full width */}
        <GradientButton
          title="Next"
          onPress={() => router.push("/(step)/step3")}
          className="w-full"
        />
      </View>
    </View>
  );
};



export default step2;