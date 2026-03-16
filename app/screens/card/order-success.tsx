import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrderSuccessScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Get values from params
    const restaurantName = (params.restaurantName as string) || 'Restaurant';
    const restaurantAddress = (params.restaurantAddress as string) || 'Location';
    const deliveryAddress = (params.deliveryAddress as string) || '123 Main St, Apt 4B, New York, NY';
    const amountPaid = params.amount ? `$${params.amount}` : '$32.12';

    const handleBackToHome = () => {
        // Navigate to tabs root (index) and reset stack roughly or just push to /
        // router.replace does not exist on plain expo-router cleanly for tabs sometimes, 
        // but router.dismissAll() + replace or navigate is common.
        // Easiest is navigate to root.
        router.dismissAll();
        router.navigate('/(tabs)');
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FDFBF7] justify-between">
            <StatusBar style="dark" />

            {/* Close Button */}
            <View className="px-6 pt-4">
                <TouchableOpacity
                    onPress={handleBackToHome}
                    className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View className="flex-1 items-center justify-center px-8">
                {/* Check Icon */}
                <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-6">
                    <Ionicons name="checkmark" size={32} color="#fff" />
                </View>

                <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
                    Yay! Your order{'\n'}has been placed.
                </Text>

                <Text className="text-gray-500 text-center mb-12">
                    Your order would be delivered in the{'\n'}30 mins atmost
                </Text>

                {/* Details */}
                <View className="w-full space-y-4">
                    <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                            <Text className="text-gray-500 text-base">Estimated time</Text>
                        </View>
                        <Text className="text-gray-900 font-bold text-base">30mins</Text>
                    </View>

                    {/* <View className="flex-row justify-between items-start mt-4">
                        <View className="flex-row items-center">
                            <Ionicons name="restaurant-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                            <Text className="text-gray-500 text-base">Pickup from</Text>
                        </View>
                        <View className="items-end flex-1 ml-4">
                            <Text className="text-gray-900 font-bold text-base text-right">{restaurantName}</Text>
                        </View>
                    </View> */}

                    <View className="flex-row justify-between items-start mt-4">
                        <View className="flex-row items-center">
                            <Ionicons name="location-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                            <Text className="text-gray-500 text-base">Pickup from</Text>
                        </View>
                        <View className="items-end flex-1 ml-4">
                            {/* <Text className="text-gray-900 font-bold text-base text-right">Home</Text> */}
                            <Text className="text-gray-500 text-xs text-right" numberOfLines={2}>{deliveryAddress}</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-4">
                        <View className="flex-row items-center">
                            <Ionicons name="card-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                            <Text className="text-gray-500 text-base">Amount Paid</Text>
                        </View>
                        <Text className="text-gray-900 font-bold text-base">{amountPaid}</Text>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View className="px-6 pb-8">
                <TouchableOpacity
                    onPress={handleBackToHome}
                    className="bg-yellow-400 w-full py-4 rounded-2xl shadow-md items-center">
                    <Text className="text-gray-900 font-bold text-lg">Back to home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
