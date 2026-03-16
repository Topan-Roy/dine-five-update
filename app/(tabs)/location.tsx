import RestaurantMapView from '@/components/map/RestaurantMapView';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LocationScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar style="dark" />

      {/* Map Container */}
      <View className="flex-1">
        <RestaurantMapView />
      </View>
    </SafeAreaView>
  );
}
