import { EmptyState } from '@/components/common/EmptyState';
import { useStore } from '@/stores/stores';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatTaxRate = (value: number) => `${(value * 100).toFixed(0)}%`;

export default function CardScreen() {
  const router = useRouter();
  const { fetchCart, updateCartQuantity, removeCartItem, clearCart } = useStore() as any;
  const [cartItems, setCartItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subtotal, setSubtotal] = React.useState(0);
  const [cartMeta, setCartMeta] = React.useState<any>(null);
  const [includeUtensils, setIncludeUtensils] = React.useState(true);

  const loadCart = React.useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const cartData = await fetchCart();
    const root = cartData?.items ? cartData : cartData?.data?.items ? cartData.data : null;
    const rawItems = Array.isArray(root?.items) ? root.items : [];

    if (root && rawItems.length) {
      setCartMeta(root);
      const formattedItems = rawItems.map((item: any) => {
        const foodData =
          item?.foodId && typeof item.foodId === 'object'
            ? item.foodId
            : item?.food && typeof item.food === 'object'
              ? item.food
              : null;

        const resolvedFoodId = pickString(
          foodData?._id,
          foodData?.id,
          item?.foodId,
          item?.food?.foodId,
          item?.food?.id,
          item?._id,
        );

        return {
          id: pickString(foodData?._id, foodData?.id, item._id, resolvedFoodId),
          cartItemId: pickString(item._id, resolvedFoodId),
          name: pickString(foodData?.title, foodData?.name, item.title, item.name, 'Unknown item'),
          price: toNumber(item.price ?? foodData?.price ?? foodData?.finalPriceTag, 0),
          image: pickString(foodData?.image, item.image),
          quantity: Math.max(1, Math.floor(toNumber(item.quantity, 1))),
          foodId: resolvedFoodId,
          providerId: pickString(item.providerId, foodData?.providerId, foodData?.providerID),
          providerProfile: pickString(item.providerProfile, foodData?.providerProfile),
          providerName: pickString(item.providerName, foodData?.providerName),
          restaurantName: pickString(
            root?.restaurantName,
            item.restaurantName,
            item.providerRestaurantName,
            foodData?.restaurantName,
            foodData?.providerRestaurantName,
            foodData?.providerName,
            item.providerName,
          ),
          restaurantAddress: pickString(
            root?.restaurantAddress,
            item.restaurantAddress,
            foodData?.restaurantAddress,
            item.address,
          ),
          distanceKm: toNumber(item.distanceKm ?? foodData?.distanceKm, NaN),
          etaMinutes: toNumber(item.etaMinutes ?? foodData?.etaMinutes, NaN),
        };
      });
      setCartItems(formattedItems);
      setSubtotal(toNumber(root.subtotal, 0));
    } else {
      setCartItems([]);
      setSubtotal(0);
      setCartMeta(null);
    }
    if (showLoading) setLoading(false);
  }, [fetchCart]);

  React.useEffect(() => {
    loadCart();
  }, [loadCart]);

  useFocusEffect(
    React.useCallback(() => {
      loadCart(false);
    }, [loadCart]),
  );

  const handleUpdateQuantity = async (foodId: string, cartItemId: string, delta: number, currentQuantity: number) => {
    if (!foodId) return;
    const newQuantity = currentQuantity + delta;

    // Optimistic Update
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.cartItemId === cartItemId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );

    try {
      if (newQuantity <= 0) await removeCartItem(foodId);
      else await updateCartQuantity(foodId, newQuantity);
      await loadCart(false);
    } catch (error) {
      console.log("Error updating quantity:", error);
      await loadCart(false);
    }
  };

  if (loading && cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] justify-center items-center">
        <StatusBar style="dark" />
        <Text>Loading Cart...</Text>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7]">
        <StatusBar style="dark" />
        <EmptyState
          title="Your cart is empty!"
          message="Explore and add items to the cart to show here..."
          buttonText="Explore"
          onButtonPress={() => router.push('/(tabs)')}
        />
      </SafeAreaView>
    );
  }

  const firstItem = cartItems[0];
  const restaurantName = pickString(
    cartMeta?.restaurantName,
    firstItem?.restaurantName,
    firstItem?.providerName,
    'Restaurant',
  );
  const restaurantAddress = pickString(
    cartMeta?.restaurantAddress,
    firstItem?.restaurantAddress,
    'Address unavailable',
  );
  const restaurantProfile = pickString(
    cartMeta?.restaurantProfile,
    firstItem?.providerProfile,
    firstItem?.image,
  );

  const distanceMiles = Number.isFinite(firstItem?.distanceKm)
    ? `${(firstItem.distanceKm * 0.621371).toFixed(1)} mi`
    : pickString(cartMeta?.distance, '3.1 mi');

  const etaText = Number.isFinite(firstItem?.etaMinutes)
    ? `${Math.max(1, Math.round(firstItem.etaMinutes - 2))}-${Math.round(firstItem.etaMinutes + 2)} min`
    : pickString(cartMeta?.eta, '20-22 min');

  const platformFee = toNumber(cartMeta?.platformFee ?? cartMeta?.serviceFee ?? 0, 0);
  const cityTaxRateRaw = toNumber(cartMeta?.cityTaxRate ?? cartMeta?.cityTax, 0);
  const normalizedCityTaxRate = cityTaxRateRaw > 1 ? cityTaxRateRaw / 100 : cityTaxRateRaw;
  const stateTaxRateRaw = toNumber(cartMeta?.stateTaxRate, normalizedCityTaxRate);
  const countyTaxRateRaw = toNumber(cartMeta?.countyTaxRate, normalizedCityTaxRate);
  const stateTaxRate = stateTaxRateRaw > 1 ? stateTaxRateRaw / 100 : stateTaxRateRaw;
  const countyTaxRate = countyTaxRateRaw > 1 ? countyTaxRateRaw / 100 : countyTaxRateRaw;
  const stateTaxAmount = toNumber(cartMeta?.stateTaxAmount, subtotal * stateTaxRate);
  const countyTaxAmount = toNumber(cartMeta?.countyTaxAmount, subtotal * countyTaxRate);
  const total = toNumber(
    cartMeta?.total ?? cartMeta?.grandTotal,
    subtotal + platformFee + stateTaxAmount + countyTaxAmount,
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F7F6F2]">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-center pt-2 pb-4 relative px-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="cart-outline" size={19} color="#111827" />
          <Text className="text-[20px] font-semibold text-gray-900">Cart</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-3"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 210 }}
      >
        <View className="bg-white rounded-2xl border border-[#ECEAE2] overflow-hidden">
          <View className="px-4 pt-4 pb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 mr-3">
                {restaurantProfile ? (
                  <Image source={{ uri: restaurantProfile }} className="w-10 h-10" resizeMode="cover" />
                ) : (
                  <View className="w-10 h-10 items-center justify-center">
                    <Ionicons name="restaurant-outline" size={16} color="#6B7280" />
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[16px] font-semibold text-gray-900">{restaurantName}</Text>
                <View className="flex-row items-center mt-0.5">
                  <Ionicons name="location-outline" size={12} color="#6B7280" />
                  <Text className="text-[12px] text-gray-500 ml-1" numberOfLines={1}>
                    {restaurantAddress}
                  </Text>
                </View>
                <Text className="text-[12px] text-gray-500 mt-1">
                  Pickup - {distanceMiles} - {etaText}
                </Text>
              </View>
            </View>
          </View>

          <View className="border-t border-[#ECEAE2] px-4 py-2 bg-[#FAF9F5] flex-row">
            <Text className="w-8 text-[12px] text-gray-400">Qty</Text>
            <Text className="flex-1 text-[12px] text-gray-400">Item</Text>
            <Text className="w-16 text-right text-[12px] text-gray-400">Price</Text>
          </View>

          {cartItems.map((item) => (
            <View key={item.cartItemId || item.id} className="px-4 py-3 border-b border-[#EFEDE5]">
              <View className="flex-row items-start">
                <Text className="w-8 text-[13px] text-gray-800">
                  {String(item.quantity).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  className="flex-1 pr-2"
                  onLongPress={() =>
                    handleUpdateQuantity(item.foodId, item.cartItemId, -1, item.quantity)
                  }
                >
                  <Text className="text-[14px] text-gray-800">{item.name}</Text>
                </TouchableOpacity>
                <Text className="w-16 text-right text-[14px] font-medium text-gray-900">
                  {formatMoney(toNumber(item.price, 0) * Math.max(1, toNumber(item.quantity, 1)))}
                </Text>
              </View>
            </View>
          ))}

          <View className="bg-[#EEF0F4] px-4 py-3 flex-row items-center">
            <Ionicons name="restaurant-outline" size={15} color="#4B5563" />
            <Text className="flex-1 ml-2 text-[13px] text-gray-700">
              Include utensils, napkins, etc
            </Text>
            <Switch
              value={includeUtensils}
              onValueChange={setIncludeUtensils}
              trackColor={{ false: "#D1D5DB", true: "#111827" }}
              thumbColor="#fff"
            />
          </View>

          <View className="px-4 py-3">
            <View className="flex-row justify-between py-1">
              <Text className="text-[14px] text-gray-600">Item subtotal</Text>
              <Text className="text-[14px] text-gray-700">{formatMoney(subtotal)}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-[14px] text-gray-600">Platform fee</Text>
              <Text className="text-[14px] text-gray-700">{formatMoney(platformFee)}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-[14px] text-gray-600">State tax</Text>
              <Text className="text-[14px] text-gray-700">{formatTaxRate(stateTaxRate)}</Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-[14px] text-gray-600">County tax</Text>
              <Text className="text-[14px] text-gray-700">{formatTaxRate(countyTaxRate)}</Text>
            </View>
            <View className="flex-row justify-between pt-2 mt-1 border-t border-[#EFEDE5]">
              <Text className="text-[16px] font-semibold text-gray-900">Total</Text>
              <Text className="text-[16px] font-semibold text-gray-900">{formatMoney(total)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-[74px] left-3 right-3 bg-[#F7F6F2] pt-2">
        <TouchableOpacity
          className="self-start flex-row items-center mb-3"
          onPress={async () => {
            await clearCart?.();
            await loadCart(false);
          }}
        >
          <Ionicons name="close" size={15} color="#F59E0B" />
          <Text className="text-[13px] text-amber-500 ml-1">Empty bag</Text>
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            className="flex-1 h-11 rounded-xl border border-[#E5E7EB] bg-white items-center justify-center flex-row"
          >
            <Ionicons name="add" size={16} color="#111827" />
            <Text className="text-[13px] font-medium text-gray-800 ml-1">Add more items</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/screens/card/confirm-order')}
            className="flex-1 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: "#F5C518" }}
          >
            <Text className="text-[13px] font-semibold text-gray-900">Continue to checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
