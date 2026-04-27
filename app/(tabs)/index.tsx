import { useStore } from "@/stores/stores";
import {
  type Restaurant,
  useRestaurantStore,
} from "@/stores/useRestaurantStore";
import { Ionicons } from "@expo/vector-icons";
import { getUserAvatarUri, normalizeImageUri } from "@/utils/userAvatar";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PromoBanner } from "@/components/home/PromoBanner";

type BannerData = {
  title: string;
  subtitle: string;
  ctaText: string;
  image: string;
};

type RestaurantSection = {
  title: string;
  items: Restaurant[];
};

const FALLBACK_PROMO: BannerData = {
  title: "35% OFF on Burgers!",
  subtitle: "35% OFF on Burgers!",
  ctaText: "Buy now",
  image:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80",
};
const DEFAULT_CATEGORIES = ["All", "Burger", "Pizza", "Donut"];

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const normalizeBannerList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.banners)) return payload.banners;
  return [];
};

const normalizeBanner = (payload: any): BannerData => {
  const banner = normalizeBannerList(payload)[0] ?? payload?.data ?? payload ?? {};

  return {
    title:
      pickString(banner?.title, banner?.headline, banner?.name) ||
      FALLBACK_PROMO.title,
    subtitle:
      pickString(
        banner?.subtitle,
        banner?.description,
        banner?.tagline,
        banner?.subTitle,
      ) || FALLBACK_PROMO.subtitle,
    ctaText:
      pickString(
        banner?.ctaText,
        banner?.buttonText,
        banner?.actionText,
      ) || FALLBACK_PROMO.ctaText,
    image:
      normalizeImageUri(
        pickString(
          banner?.image,
          banner?.imageUrl,
          banner?.bannerImage,
          banner?.thumbnail,
        ),
      ) || FALLBACK_PROMO.image,
  };
};

const formatDistance = (distanceKm?: number) => {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(1)} mi`;
};

const getCuisineLabel = (restaurant: Restaurant) =>
  restaurant.cuisine?.filter(Boolean).join(" • ") || "Restaurant";

function HomeHeader({
  name,
  location,
  profileImage,
  notificationCount = 1,
}: {
  name: string;
  location: string;
  profileImage?: string;
  notificationCount?: number;
}) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-orange-400 items-center justify-center overflow-hidden">
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <Ionicons name="person" size={18} color="#fff" />
          )}
        </View>
        <View className="max-w-[220px]">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text className="text-xs text-gray-400" numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => router.push("/screens/home/notifications")}
        className="w-9 h-9 rounded-full border border-gray-200 items-center justify-center relative"
      >
        <Ionicons name="notifications-outline" size={18} color="#374151" />
        {notificationCount > 0 && (
          <View
            className="absolute -top-0.5 -right-0.5 min-w-[14] h-[14] rounded-full bg-red-500 items-center justify-center px-1"
            style={{ minWidth: 14 }}
          >
            <Text className="text-[9px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SearchBar({
  searchText,
  onSearch,
}: {
  searchText: string;
  onSearch: (value: string) => void;
}) {
  return (
    <View className="mx-4 mb-4">
      <View className="flex-row items-center bg-gray-100 rounded-full px-4 h-11">
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          value={searchText}
          onChangeText={onSearch}
          placeholder="Search dishes, restaurants"
          placeholderTextColor="#9CA3AF"
          className="flex-1 ml-2 text-sm text-gray-700"
        />
      </View>
    </View>
  );
}

function Categories({
  active,
  categories,
  onChange,
}: {
  active: string;
  categories: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View className="mb-5">
      <View className="flex-row justify-between items-center px-4 mb-3">
        <Text className="text-base font-bold text-gray-900">Top Categories</Text>
        <TouchableOpacity>
          <Text className="text-sm font-semibold" style={{ color: "#F5C518" }}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {categories.map((category) => {
          const isActive = category === active;

          return (
            <TouchableOpacity
              key={category}
              onPress={() => onChange(category)}
              className="rounded-full px-4 py-2"
              style={{
                backgroundColor: isActive ? "#F5C518" : "transparent",
                borderWidth: isActive ? 0 : 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: isActive ? "#1F2937" : "#6B7280" }}
              >
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RestaurantCard({
  restaurant,
  onOpen,
}: {
  restaurant: Restaurant;
  onOpen: () => void;
}) {
  const distanceLabel = formatDistance(restaurant.distance);
  const rating = (restaurant.rating ?? 4.2).toFixed(1);
  const cuisineLabel = getCuisineLabel(restaurant);
  const deliveryMin =
    restaurant.deliveryTimeMinutes ??
    Math.max(5, Math.min(30, Math.round(restaurant.distance * 2) + 5));

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      className="w-44 mr-3"
    >
      <View className="rounded-2xl overflow-hidden bg-gray-100 mb-2 relative">
        {restaurant.profile ? (
          <Image
            source={{ uri: restaurant.profile }}
            className="w-44 h-32"
            resizeMode="cover"
          />
        ) : (
          <View className="w-44 h-32 items-center justify-center bg-gray-100">
            <Ionicons name="restaurant-outline" size={28} color="#9CA3AF" />
          </View>
        )}

        <View className="absolute top-2 left-2 px-2 py-1 rounded-full bg-[#F5C518]">
          <Text className="text-[10px] font-bold text-gray-900">
            {restaurant.availableFoods > 0
              ? `${restaurant.availableFoods} items`
              : "Open"}
          </Text>
        </View>

        <View className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white items-center justify-center shadow-sm">
          <Ionicons name="heart-outline" size={14} color="#374151" />
        </View>
      </View>

      <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
        {restaurant.restaurantName}
      </Text>

      <View className="flex-row items-center mt-0.5 gap-1 flex-wrap">
        <Ionicons name="star" size={11} color="#F5C518" />
        <Text className="text-xs text-gray-500">{rating}</Text>
        <Text className="text-xs text-gray-400">•</Text>
        <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
          {cuisineLabel}
        </Text>
        <Text className="text-xs text-gray-500">{deliveryMin}min</Text>
      </View>

      <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
        {distanceLabel || "•"}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  restaurants,
  onOpenRestaurant,
}: {
  title: string;
  restaurants: Restaurant[];
  onOpenRestaurant: (restaurant: Restaurant) => void;
}) {
  if (!restaurants.length) return null;

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center px-4 mb-3">
        <Text className="text-base font-bold text-gray-900">{title}</Text>
        <TouchableOpacity>
          <Text className="text-sm font-semibold" style={{ color: "#F5C518" }}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.providerId}
            restaurant={restaurant}
            onOpen={() => onOpenRestaurant(restaurant)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const { fetchBanners, fetchProfile, user } = useStore() as any;
  const {
    location,
    locationLoading,
    restaurants,
    restaurantsLoading,
    restaurantsError,
    fetchLocation,
    fetchNearbyRestaurants,
  } = useRestaurantStore();

  const [searchText, setSearchText] = React.useState("");
  const [filterModalVisible, setFilterModalVisible] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState("All");
  const [bannerPayload, setBannerPayload] = React.useState<any>(null);
  const [currentLocationLabel, setCurrentLocationLabel] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);

  const loadBannerData = React.useCallback(async () => {
    try {
      const payload = await fetchBanners?.();
      setBannerPayload(payload ?? null);
    } catch {
      setBannerPayload(null);
    }
  }, [fetchBanners]);

  const loadNearbyRestaurants = React.useCallback(
    async (
      targetLocation: { latitude: number; longitude: number } | null | undefined,
    ) => {
      if (!targetLocation) return;

      await fetchNearbyRestaurants({
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
        radius: 100000,
        limit: 100,
        sortBy: "distance",
      });
    },
    [fetchNearbyRestaurants],
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      const nextLocationPromise = fetchLocation().catch(() => undefined);

      await Promise.allSettled([
        loadBannerData(),
        fetchProfile?.(),
        nextLocationPromise,
      ]);

      const latestLocation = useRestaurantStore.getState().location ?? location;
      await loadNearbyRestaurants(latestLocation);
    } finally {
      setRefreshing(false);
    }
  }, [fetchLocation, fetchProfile, loadBannerData, loadNearbyRestaurants, location]);

  React.useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  React.useEffect(() => {
    loadBannerData();
  }, [loadBannerData]);

  React.useEffect(() => {
    if (params.category) {
      setActiveCategory(String(params.category));
    }
  }, [params.category]);

  React.useEffect(() => {
    let isMounted = true;

    const resolveLocationLabel = async () => {
      if (!location) return;

      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (!isMounted) return;

        const place = result?.[0];
        const label = pickString(
          place?.district,
          place?.subregion,
          place?.city,
          place?.region,
          place?.street,
        );

        setCurrentLocationLabel(label);
      } catch {
        if (isMounted) {
          setCurrentLocationLabel("");
        }
      }
    };

    resolveLocationLabel();

    return () => {
      isMounted = false;
    };
  }, [location]);

  React.useEffect(() => {
    loadNearbyRestaurants(location);
  }, [loadNearbyRestaurants, location]);

  const categories = React.useMemo(() => {
    const cuisineSet = new Set<string>(DEFAULT_CATEGORIES.slice(1));

    restaurants.forEach((restaurant) => {
      restaurant.cuisine.forEach((cuisine) => {
        const normalized = pickString(cuisine);
        if (normalized && !DEFAULT_CATEGORIES.includes(normalized)) {
          cuisineSet.add(normalized);
        }
      });
    });

    return ["All", ...Array.from(cuisineSet)];
  }, [restaurants]);

  React.useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  const filteredRestaurants = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesCategory =
        activeCategory === "All" ||
        restaurant.cuisine.some(
          (cuisine) => cuisine.toLowerCase() === activeCategory.toLowerCase(),
        );

      const searchable = [
        restaurant.restaurantName,
        restaurant.restaurantAddress,
        restaurant.city,
        restaurant.state,
        restaurant.contactEmail,
        ...restaurant.cuisine,
      ]
        .join(", ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, restaurants, searchText]);

  const sections = React.useMemo<RestaurantSection[]>(() => {
    if (!filteredRestaurants.length) return [];

    if (filteredRestaurants.length <= 4) {
      return [{ title: "Start the Day", items: filteredRestaurants }];
    }

    if (filteredRestaurants.length <= 8) {
      const midpoint = Math.ceil(filteredRestaurants.length / 2);
      return [
        { title: "Start the Day", items: filteredRestaurants.slice(0, midpoint) },
        {
          title: "Late Night Cravings",
          items: filteredRestaurants.slice(midpoint),
        },
      ].filter((section) => section.items.length > 0);
    }

    const third = Math.ceil(filteredRestaurants.length / 3);
    return [
      { title: "Start the Day", items: filteredRestaurants.slice(0, third) },
      {
        title: "Late Night Cravings",
        items: filteredRestaurants.slice(third, third * 2),
      },
      {
        title: "Popular Near You",
        items: filteredRestaurants.slice(third * 2),
      },
    ].filter((section) => section.items.length > 0);
  }, [filteredRestaurants]);

  const promoDeals = React.useMemo((): BannerData[] => {
    const list = normalizeBannerList(bannerPayload);
    if (Array.isArray(list) && list.length > 0) {
      return list.map((b: any) => normalizeBanner(b));
    }
    return [normalizeBanner(bannerPayload)];
  }, [bannerPayload]);

  const userName = React.useMemo(() => {
    const fullName = pickString(user?.fullName, user?.name);
    if (fullName) return fullName;

    const firstName = pickString(user?.firstName);
    const lastName = pickString(user?.lastName);
    const combinedName = [firstName, lastName].filter(Boolean).join(", ").trim();

    return combinedName || pickString(user?.email) || "Maria's Kitchen";
  }, [user]);

  const locationLabel = React.useMemo(() => {
    return (
      pickString(
        currentLocationLabel,
        user?.address?.street,
        user?.address?.line1,
        user?.address?.address,
        user?.city,
        user?.state,
      ) || "Fetching location..."
    );
  }, [currentLocationLabel, user]);

  const profileImage = React.useMemo(
    () => getUserAvatarUri(user),
    [user],
  );

  const openRestaurantDetail = React.useCallback(
    (restaurant: Restaurant) => {
      router.push({
        pathname: "/(tabs)/hotel-details",
        params: {
          id: restaurant.providerId,
          providerId: restaurant.providerId,
          name: restaurant.restaurantName,
          image: restaurant.profile,
          rating: "",
          address: restaurant.restaurantAddress,
          distance: formatDistance(restaurant.distance),
          city: restaurant.city,
          state: restaurant.state,
          cuisine: restaurant.cuisine.join(", "),
          availableFoods: String(restaurant.availableFoods || 0),
        },
      } as any);
    },
    [router],
  );

  const isInitialLoading =
    (locationLoading && restaurants.length === 0) ||
    (restaurantsLoading && restaurants.length === 0);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top }} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F5C518"
              colors={["#F5C518"]}
            />
          }
        >
          <HomeHeader
            name={userName}
            location={locationLabel}
            profileImage={profileImage || undefined}
          />

          <SearchBar searchText={searchText} onSearch={setSearchText} />
          <PromoBanner deals={promoDeals ?? [FALLBACK_PROMO]} />

          <Categories
            active={activeCategory}
            categories={categories}
            onChange={setActiveCategory}
          />

          {isInitialLoading && (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color="#F5C518" />
              <Text className="text-xs text-gray-400 mt-2">
                Loading restaurants...
              </Text>
            </View>
          )}

          {!isInitialLoading &&
            sections.map((section) => (
              <Section
                key={section.title}
                title={section.title}
                restaurants={section.items}
                onOpenRestaurant={openRestaurantDetail}
              />
            ))}

          {!isInitialLoading && !sections.length && (
            <View className="px-4 py-8">
              <Text className="text-sm text-gray-400 text-center">
                No restaurants found.
              </Text>
            </View>
          )}

          {!!restaurantsError && (
            <View className="px-4 pb-4">
              <Text className="text-xs text-amber-700 text-center">
                {restaurantsError}
              </Text>
            </View>
          )}
        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={filterModalVisible}
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
            className="flex-1 bg-black/40 items-center justify-center"
          >
            <View className="bg-white m-4 p-4 rounded-2xl w-3/4 shadow-xl">
              <Text className="text-lg font-bold text-gray-900 mb-4 text-center">
                Filter Options
              </Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="p-3 rounded-xl mb-2 flex-row justify-between items-center"
                style={{
                  backgroundColor: "#FFF7E0",
                  borderWidth: 1,
                  borderColor: "#F5C518",
                }}
              >
                <Text className="font-semibold" style={{ color: "#B45309" }}>
                  Restaurants
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#F5C518"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="mt-4 p-3 rounded-xl bg-gray-900"
              >
                <Text className="text-white text-center font-bold">Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}
