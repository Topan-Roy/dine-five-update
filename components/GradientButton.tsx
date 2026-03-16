import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity } from "react-native";

interface GradientButtonProps {
  title: string;
  onPress?: () => void;
  className?: string;
  textClassName?: string;
}

const GradientButton = ({
  title,
  onPress,
  className = "",
  textClassName = "",
}: GradientButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress} className={className}>
      <LinearGradient
        colors={["#FFCD39", "#f5d78c", "#FFCD39"]} // Light yellow to darker yellow
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.2, 0.7]}
        style={{
          borderRadius: 12,
        }}
        className="py-4 px-8 rounded-full items-center justify-center"
      >
        <Text className={`text-black text-lg font-semibold ${textClassName}`}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default GradientButton;
