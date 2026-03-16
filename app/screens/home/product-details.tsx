import { ViewCart } from "@/components/home/ViewCart";
import { CustomerReviews } from "@/components/product/CustomerReviews";
import { useStore } from "@/stores/stores";
import { API_BASE_URL } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const firstParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80";

const normalizeImageUri = (value: string | string[] | undefined): string => {
  const raw = firstParam(value).trim().replace(/^['"]|['"]$/g, "");
  if (!raw) return "";
  if (raw === "undefined" || raw === "null" || raw === "N/A") return "";

  if (
    raw.startsWith("https://") ||
    raw.startsWith("file://") ||
    raw.startsWith("content://") ||
    raw.startsWith("data:image")
  ) {
    return raw;
  }

  if (raw.startsWith("http://")) {
    return `https://${raw.slice("http://".length)}`;
  }

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${API_BASE_URL}${raw}`;
  }

  // Handle backend relative paths like "uploads/..." or "public/uploads/..."
  return `${API_BASE_URL}/${raw.replace(/^\.?\//, "")}`;
};

export default function ProductDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFavorite, removeFavorite, addToCart, favorites, fetchFavorites, fetchReviewsByFoodId } =
    useStore() as any;
  const {
    id,
    foodId,
    name,
    price,
    image,
    description,
    restaurantName,
    restaurantProfile,
  } = params;
  const productId = firstParam(id as string | string[] | undefined) || firstParam(foodId as string | string[] | undefined) || "1";

  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [heroImageError, setHeroImageError] = useState(false);
  const [heroImageUri, setHeroImageUri] = useState<string>(DEFAULT_PRODUCT_IMAGE);

  const normalizedProductImage = normalizeImageUri(image as string | string[] | undefined);
  const normalizedRestaurantProfile = normalizeImageUri(
    restaurantProfile as string | string[] | undefined,
  );

  useEffect(() => {
    const loadReviews = async () => {
      const targetId =
        firstParam(foodId as string | string[] | undefined) ||
        firstParam(id as string | string[] | undefined);
      if (targetId) {
        try {
          const result = await fetchReviewsByFoodId(targetId);
          if (result && result.data) {
            setReviewsData(result.data);
            setTotalReviews(result.meta?.total || result.data.length || 0);

            // Calculate average rating if not provided by backend
            if (result.data.length > 0) {
              const total = result.data.reduce((sum: number, review: any) => sum + (review.rating || 0), 0);
              const avg = total / result.data.length;
              setAverageRating(parseFloat(avg.toFixed(1)));
            }
          }
        } catch (error) {
          console.log("Error loading reviews:", error);
        }
      }
    };
    loadReviews();
  }, [fetchReviewsByFoodId, foodId, id]);

  useEffect(() => {
    setHeroImageError(false);
    setHeroImageUri(
      normalizedProductImage ||
        normalizedRestaurantProfile ||
        DEFAULT_PRODUCT_IMAGE,
    );
  }, [normalizedProductImage, normalizedRestaurantProfile]);

  const product: any = {
    id: productId,
    foodId:
      firstParam(foodId as string | string[] | undefined) ||
      firstParam(id as string | string[] | undefined) ||
      "1",
    name: firstParam(name as string | string[] | undefined) || "Pepperoni Cheese Pizza",
    price: (price as string) || "5.99",
    image:
      normalizedProductImage ||
      normalizedRestaurantProfile ||
      DEFAULT_PRODUCT_IMAGE,
    rating: averageRating || parseFloat(params.rating as string) || 0,
    reviews: totalReviews,
    calories: 300,
    time: 25,
    description:
      firstParam(description as string | string[] | undefined) ||
      "A classic favorite! Indulge in a crispy, thin crust topped with rich tomato sauce, layers of gooey mozzarella cheese, and delicious pepperoni slices. Perfectly baked with a hint of herbs for a mouth-watering experience in every bite.",
    restaurantName: firstParam(restaurantName as string | string[] | undefined) || "The Gourmet Kitchen",
    restaurantProfile: normalizedRestaurantProfile,
  };

  const isFav =
    favorites.includes(product.id) || favorites.includes(product.foodId);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (favorites.length === 0) {
      fetchFavorites();
    }
  }, [favorites.length, fetchFavorites]);

  const handleToggleFavorite = async () => {
    console.log("Toggling favorite for foodId:", product.foodId);
    if (isFav) {
      await removeFavorite(product.foodId);
    } else {
      await addFavorite(product.foodId);
    }
  };

  const handleAddToCart = async () => {
    try {
      const result = await addToCart(product, quantity);
      if (result) {
        // Only navigate if successful
        router.push("/(tabs)/card");
      } else {
        const latestError = (useStore.getState() as any)?.error;
        Alert.alert("Failed", latestError || "Failed to add to cart. Please try again.");
      }
    } catch (error) {
      console.log("Error adding to cart:", error);
      Alert.alert("Failed", "Something went wrong while adding to cart.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Fixed Background Image */}
      <View className="absolute top-0 w-full h-[45vh] bg-gray-200">
        {!!heroImageUri && !heroImageError ? (
          <Image
            source={{ uri: heroImageUri }}
            className="w-full h-full"
            resizeMode="cover"
            onError={() => {
              if (heroImageUri !== DEFAULT_PRODUCT_IMAGE) {
                setHeroImageUri(DEFAULT_PRODUCT_IMAGE);
                return;
              }
              setHeroImageError(true);
            }}
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-gray-200">
            <Ionicons name="image-outline" size={46} color="#9CA3AF" />
          </View>
        )}
        <View className="absolute w-full h-full bg-black/10" />
      </View>

      {/* Fixed Header Actions */}
      <SafeAreaView className="absolute top-0 w-full z-50">
        <View className="flex-row justify-between px-4 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30">
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30"
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={20}
                color={isFav ? "#EF4444" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Spacer to push content down below visible image area */}
        <View className="h-[40vh]" />

        {/* White Content Container */}
        <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-32 min-h-screen">
          {/* Stats Row */}
          <View className="flex-row justify-between mb-6 border border-[#E3E6F0] rounded-lg p-3 bg-white shadow-sm">
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text className="text-sm font-bold text-[#1F2A33]">
                {product.rating}
              </Text>
              <Text className="text-sm font-normal text-[#7A7A7A]">
                ({product.reviews} Reviews)
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text className="text-sm font-normal text-[#7A7A7A]">
                {product.calories}kcal
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time" size={16} color="#24B5D4" />
              <Text className="text-sm font-normal text-[#7A7A7A]">
                {product.time}mins
              </Text>
            </View>
          </View>

          {/* Restaurant Info */}
          {/* <View className="flex-row items-center gap-3 mb-4">
            {product.restaurantProfile ? (
              <Image
                source={{ uri: product.restaurantProfile }}
                className="w-10 h-10 rounded-full bg-gray-100"
              />
            ) : (
              <View className="w-10 h-10 rounded-full bg-yellow-100 items-center justify-center">
                <Ionicons name="restaurant" size={18} color="#FFC107" />
              </View>
            )}
            <Text className="text-sm font-medium text-gray-700">
              {product.restaurantName}
            </Text>
          </View> */}

          {/* Title & Quantity */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-medium text-[#363A33] w-[60%]">
              {product.name}
            </Text>
            <View className="flex-row items-center  rounded-full px-2 py-1">
              <TouchableOpacity
                onPress={() => quantity > 1 && setQuantity((q) => q - 1)}
                className="w-10 h-10 items-center justify-center bg-[#FFF3CD] rounded-full"
              >
                <Text className="text-lg font-bold text-[#332701]">-</Text>
              </TouchableOpacity>
              <Text className="mx-4 text-lg font-medium text-[#1F2A33]">
                {quantity}
              </Text>
              <TouchableOpacity
                onPress={() => setQuantity((q) => q + 1)}
                className="w-10 h-10  items-center justify-center bg-[#FFF3CD] rounded-full"
              >
                <Text className="text-lg font-bold text-[#332701]">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <Text className="text-[#7A7A7A] text-sm font-normal leading-6 mb-8">
            {product.description}
            <Text className="text-[#363A33] font-bold"> Read more...</Text>
          </Text>

          {/* Price & Add Button */}
          <View className="flex-row items-center justify-between mb-8">
            <Text className="text-2xl font-semibold text-[#363A33]">
              ${product.price}
            </Text>
            <TouchableOpacity
              onPress={handleAddToCart}
              className="bg-yellow-400 px-8 py-4 rounded-2xl shadow-md min-w-[160px] items-center"
            >
              <Text className="text-[#1F2A33] font-medium text-base">
                Add to cart
              </Text>
            </TouchableOpacity>
          </View>

          {/* Customer Reviews */}
          <CustomerReviews reviews={reviewsData} />
        </View>
      </ScrollView>

      <ViewCart count={quantity} total={quantity * parseFloat(product.price)} />
    </View>
  );
}
