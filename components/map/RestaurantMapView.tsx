import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, Region } from "react-native-maps";
import { Restaurant, useRestaurantStore } from "../../stores/useRestaurantStore";
import {
  buildRestaurantSearchHaystack,
  formatRestaurantDistance,
  getRestaurantImage,
  navigateToRestaurantDetail,
  normalizeRestaurantSearchQuery,
} from "../../utils/restaurantDetailNavigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_GAP = 12;
const CARD_SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

const RADIUS_STEPS = [100, 200, 500, 1000, 2000, 5000];

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatRadius = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const getRestaurantCoords = (restaurant: Restaurant | null) => {
  if (!restaurant) return null;

  const lat = toNumber(
    restaurant.location?.lat ?? (restaurant as any).latitude ?? (restaurant as any).lat,
    NaN,
  );
  const lng = toNumber(
    restaurant.location?.lng ?? (restaurant as any).longitude ?? (restaurant as any).lng,
    NaN,
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
};

export default function RestaurantMapView() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList<Restaurant>>(null);

  const {
    location,
    locationLoading,
    restaurants,
    restaurantsLoading,
    restaurantsError,
    selectedRestaurant,
    cuisineFilter,
    radiusMeters,
    fetchLocation,
    fetchNearbyRestaurants,
    setSelectedRestaurant,
    setRadiusMeters,
  } = useRestaurantStore();

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [searchText, setSearchText] = useState("");

  const userLat = location?.latitude ?? 23.780704;
  const userLng = location?.longitude ?? 90.407756;
  const hasLocation = !!location && !locationLoading;

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    if (!hasLocation) return;

    fetchNearbyRestaurants({
      latitude: userLat,
      longitude: userLng,
      radius: radiusMeters,
      cuisine: cuisineFilter,
      sortBy: "distance",
      page: 1,
      limit: 20,
    });
  }, [
    cuisineFilter,
    fetchNearbyRestaurants,
    hasLocation,
    radiusMeters,
    userLat,
    userLng,
  ]);

  // Auto-zoom to user location when it's first loaded
  const hasAutoZoomed = useRef(false);
  useEffect(() => {
    if (location && !locationLoading && !hasAutoZoomed.current && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      }, 1000);
      hasAutoZoomed.current = true;
    }
  }, [location, locationLoading]);

  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = normalizeRestaurantSearchQuery(searchText);
    if (!normalizedQuery) return restaurants;

    const queryTokens = normalizedQuery.split(" ").filter(Boolean);
    if (!queryTokens.length) return restaurants;

    return restaurants.filter((restaurant) => {
      const haystack = buildRestaurantSearchHaystack(restaurant);
      return queryTokens.every((token) => haystack.includes(token));
    });
  }, [restaurants, searchText]);

  useEffect(() => {
    if (filteredRestaurants.length === 0) {
      setActiveCardIndex(0);
      setSelectedRestaurant(null);
      return;
    }

    if (!selectedRestaurant) {
      setSelectedRestaurant(filteredRestaurants[0]);
      setActiveCardIndex(0);
      return;
    }

    const selectedIndex = filteredRestaurants.findIndex(
      (restaurant) => restaurant.providerId === selectedRestaurant.providerId,
    );

    if (selectedIndex === -1) {
      setSelectedRestaurant(filteredRestaurants[0]);
      setActiveCardIndex(0);
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      return;
    }

    if (selectedIndex !== activeCardIndex) {
      setActiveCardIndex(selectedIndex);
      flatListRef.current?.scrollToIndex({ index: selectedIndex, animated: true });
    }
  }, [activeCardIndex, filteredRestaurants, selectedRestaurant, setSelectedRestaurant]);

  useEffect(() => {
    const coords = getRestaurantCoords(selectedRestaurant);
    if (!coords) return;

    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      } as Region,
      450,
    );
  }, [selectedRestaurant]);

  const handleMarkerPress = (restaurant: Restaurant) => {
    const index = filteredRestaurants.findIndex(
      (item) => item.providerId === restaurant.providerId,
    );

    setSelectedRestaurant(restaurant);

    if (index !== -1) {
      setActiveCardIndex(index);
      flatListRef.current?.scrollToIndex({ index, animated: true });
    }
  };

  const handleCardSnap = (event: NativeSyntheticEvent<any>) => {
    if (!filteredRestaurants.length) return;

    const x = event.nativeEvent.contentOffset?.x ?? 0;
    const index = Math.round(x / CARD_SNAP_INTERVAL);
    const safeIndex = Math.max(0, Math.min(index, filteredRestaurants.length - 1));

    const restaurant = filteredRestaurants[safeIndex];
    if (!restaurant) return;

    setActiveCardIndex(safeIndex);
    if (selectedRestaurant?.providerId !== restaurant.providerId) {
      setSelectedRestaurant(restaurant);
    }
  };

  const openRestaurantDetail = (restaurant: Restaurant) =>
    navigateToRestaurantDetail(router, restaurant);

  const goToMyLocation = () => {
    if (!location) {
      fetchLocation();
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      } as Region,
      700,
    );
  };

  const handleRadiusPress = (radius: number) => {
    if (radius !== radiusMeters) {
      setRadiusMeters(radius);
      setSelectedRestaurant(null);
    }
  };

  if (locationLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7]">
        <ActivityIndicator size="large" color="#FFC107" />
        <Text className="mt-4 text-gray-500 text-sm">Locating you...</Text>
      </View>
    );
  }

  if (restaurantsError && restaurants.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FDFBF7] px-8">
        <Ionicons name="wifi-outline" size={48} color="#D1D5DB" />
        <Text className="mt-4 text-gray-500 text-center text-sm">{restaurantsError}</Text>
        <TouchableOpacity
          onPress={() =>
            fetchNearbyRestaurants({
              latitude: userLat,
              longitude: userLng,
              radius: radiusMeters,
              cuisine: cuisineFilter,
              sortBy: "distance",
              page: 1,
              limit: 20,
            })
          }
          className="mt-4 bg-[#FFC107] px-6 py-3 rounded-2xl"
        >
          <Text className="font-bold text-gray-900">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: userLat,
          longitude: userLng,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => setSelectedRestaurant(null)}
      >
        {filteredRestaurants.map((restaurant) => {
          const coords = getRestaurantCoords(restaurant);
          if (!coords) return null;

          const isSelected = selectedRestaurant?.providerId === restaurant.providerId;

          return (
            <Marker
              key={restaurant.providerId}
              coordinate={coords}
              onPress={() => handleMarkerPress(restaurant)}
            >
              <View className="items-center justify-center">
                {/* Distance Badge */}
                <View className="bg-[#FFC107] px-2 py-0.5 rounded-full mb-0.5 shadow-md border border-white">
                  <Text className="text-[11px] font-black text-gray-900">
                    {formatRestaurantDistance(restaurant.distance)}
                  </Text>
                </View>

                {/* Restaurant Icon */}
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center border-2 shadow-md ${isSelected
                      ? "bg-[#FFC107] border-[#FFC107]"
                      : "bg-white border-white"
                    }`}
                >
                  <Ionicons
                    name="restaurant"
                    size={18}
                    color={isSelected ? "#fff" : "#FFC107"}
                  />
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View className="absolute top-3 left-3 right-3">
        <View className="bg-white rounded-full px-4 h-11 shadow-md flex-row items-center">
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-sm text-gray-700"
          />
          {!!searchText && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              className="w-7 h-7 rounded-full bg-[#F3F4F6] items-center justify-center mr-1"
            >
              <Ionicons name="close" size={14} color="#6B7280" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={goToMyLocation} className="w-8 h-8 rounded-full bg-[#F3F4F6] items-center justify-center">
            <Ionicons name="locate" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
        >
          {RADIUS_STEPS.map((radius) => {
            const active = radius === radiusMeters;
            return (
              <TouchableOpacity
                key={radius}
                onPress={() => handleRadiusPress(radius)}
                className={`px-3 py-1.5 rounded-full border ${active ? "bg-[#FFC107] border-[#FFC107]" : "bg-white border-gray-200"
                  }`}
              >
                <Text className={`text-xs font-semibold ${active ? "text-gray-900" : "text-gray-500"}`}>
                  {formatRadius(radius)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="absolute top-24 left-4 bg-white px-3 py-1.5 rounded-full shadow-md">
        {restaurantsLoading ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FFC107" />
            <Text className="text-xs text-gray-500">Searching...</Text>
          </View>
        ) : (
          <Text className="text-xs font-semibold text-gray-700">
            {filteredRestaurants.length} found within {formatRadius(radiusMeters)}
          </Text>
        )}
      </View>

      <View className="absolute bottom-[90px] left-0 right-0">
        {filteredRestaurants.length === 0 ? (
          <View className="mx-4 bg-white/95 rounded-2xl px-4 py-3 shadow-md">
            <Text className="text-sm text-gray-500 text-center">
              No restaurants found in this area.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredRestaurants}
            keyExtractor={(item) => item.providerId}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_SNAP_INTERVAL}
            decelerationRate="fast"
            snapToAlignment="start"
            onMomentumScrollEnd={handleCardSnap}
            contentContainerStyle={{
              paddingLeft: 12,
              paddingRight: 12,
              gap: CARD_GAP,
            }}
            getItemLayout={(_, index) => ({
              length: CARD_SNAP_INTERVAL,
              offset: CARD_SNAP_INTERVAL * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const isActive = index === activeCardIndex;
              const isSelected = selectedRestaurant?.providerId === item.providerId;
              const cuisine = item.cuisine?.[0] || "cake";
              const rating = toNumber((item as any).rating ?? (item as any).averageRating, 4.2);

              return (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => openRestaurantDetail(item)}
                  style={{ width: CARD_WIDTH }}
                >
                  <View
                    className={`rounded-3xl bg-white overflow-hidden ${isSelected ? "border-2 border-[#FFC107]" : "border border-gray-100"
                      }`}
                    style={{
                      transform: [{ scale: isActive ? 1 : 0.96 }],
                      opacity: isActive ? 1 : 0.86,
                    }}
                  >
                    <Image
                      source={{ uri: getRestaurantImage(item) }}
                      className="w-full h-32"
                      resizeMode="cover"
                    />

                    <View className="px-3 py-2.5">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                          {item.restaurantName}
                        </Text>
                        <TouchableOpacity className="w-8 h-8 rounded-full border border-gray-200 items-center justify-center">
                          <Ionicons name="heart-outline" size={15} color="#7C7C7C" />
                        </TouchableOpacity>
                      </View>

                      <View className="flex-row items-center mt-1">
                        <Ionicons name="star" size={12} color="#F5C518" />
                        <Text className="text-xs text-gray-600 ml-1">{rating.toFixed(1)}</Text>
                        <Text className="text-xs text-gray-300 mx-2">|</Text>
                        <Text className="text-xs text-gray-600">{cuisine}</Text>
                        <Text className="text-xs text-gray-300 mx-2">|</Text>
                        <Text className="text-xs text-gray-600">10min</Text>
                      </View>

                      <Text className="text-xs text-gray-400 mt-1">{formatRestaurantDistance(item.distance)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}
