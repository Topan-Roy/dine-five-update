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

const step4 = () => {
    return (
        <View className="flex-1 bg-black">
            <StatusBar barStyle="light-content" />

            <View className="flex-1 relative">
                <ImageBackground
                    source={require("@/assets/images/44.jpg")}
                    resizeMode="cover"
                    className="flex-1"
                >
                    <View className="absolute top-12 right-2">
                        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                            <Text className="text-base font-medium text-[#FFCD39]">Skip</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-between items-center px-6 pt-14">
                        {/* <View className="flex-row gap-2">
                            <View className="w-20 h-2 bg-gray-400 rounded-full" />
                            <View className="w-20 h-2 bg-gray-400 rounded-full" />
                            <View className="w-20 h-2 bg-gray-400 rounded-full" />
                            <View className="w-20 h-2 bg-yellow-400 rounded-full" />
                        </View> */}
                    </View>
                </ImageBackground>
            </View>

            <View className="h-[320px] bg-white px-6 pt-8 pb-6 items-center">
                {/* Progress indicators above title */}
                <View className="flex-row justify-center gap-2 mb-6">
                    <View className="w-6 h-2 bg-gray-200 rounded-full" />
                    <View className="w-6 h-2 bg-gray-200 rounded-full" />
                    <View className="w-6 h-2 bg-gray-200 rounded-full" />
                    <View className="w-10 h-2 bg-yellow-400 rounded-full" />
                </View>

                {/* Title */}
                <Text className="text-3xl font-bold text-[#1F2937] mb-4 text-center">
                    Your Next Meal is Ready
                </Text>

                {/* Description */}
                <Text className="text-base text-gray-600 leading-relaxed mb-8 text-center px-2">
                    No delivery fees, no markups, and no waiting. Just browse, claim your $5.99 meal, and head over to collect it fresh.
                </Text>

                {/* Get Started button */}
                <GradientButton
                    title="Get Started"
                    onPress={() => router.push("/(auth)/login")}
                    className="w-full"
                />
            </View>
        </View>
    );
};

export default step4;