import { Image } from "expo-image";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

type PromoBannerProps = {
  deal?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    image?: string;
  } | null;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500";

export const PromoBanner = ({ deal }: PromoBannerProps) => {
  const title = deal?.title || "35% OFF on Burgers!";
  const subtitle = deal?.subtitle || "35% OFF on Burgers!";
  const ctaText = deal?.ctaText || "Buy now";
  const image = deal?.image || FALLBACK_IMAGE;

  return (
    <View className="px-4 mt-4">
      <View className="bg-[#F6D977] rounded-2xl px-4 py-4 min-h-[108px] overflow-hidden">
        <View className="max-w-[58%] z-10">
          <Text className="text-[#4A3B00] text-[18px] font-bold leading-tight">
            {title}
          </Text>
          <Text className="text-[#5D4A00] text-[12px] mt-1 mb-3">{subtitle}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            className="bg-[#F2BF2B] px-4 py-1.5 rounded-lg self-start"
          >
            <Text className="text-[#3E3000] text-[12px] font-semibold">{ctaText}</Text>
          </TouchableOpacity>
        </View>

        <View className="absolute right-0 bottom-0 top-0 w-[44%] items-center justify-center">
          <View className="absolute w-24 h-24 rounded-full bg-[#BFD7A8] opacity-70" />
          <Image
            source={{ uri: image }}
            style={{ width: 110, height: 110 }}
            contentFit="contain"
            transition={300}
            cachePolicy="memory-disk"
          />
        </View>
      </View>
    </View>
  );
};
