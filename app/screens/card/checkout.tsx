import { useStore } from "@/stores/stores";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function CheckoutContent() {
  const router = useRouter();
  const { fetchCart, createOrder, clearCart, createPaymentIntent } = useStore() as any;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState("Cash On Delivery");
  const [cartTotal, setCartTotal] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cartRawData, setCartRawData] = useState<any>(null);

  // Payment methods
  const CARDS = ["Cash On Delivery", "Mastercard - Daniel Jones", "Visa - Daniel Jones"];

  const loadCartData = useCallback(async () => {
    const cartData = await fetchCart();
    const root = cartData?.items ? cartData : cartData?.data?.items ? cartData.data : null;

    if (root) {
      setCartRawData(root);
      setCartSubtotal(root.subtotal || 0);
      setCartTotal((root.subtotal || 0) + 3.99); // Delivery fee
    }
  }, [fetchCart]);

  useEffect(() => {
    loadCartData();
  }, [loadCartData]);

  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [loadCartData]),
  );

  const resolveProviderId = (item: any) => {
    const foodData =
      item?.foodId && typeof item.foodId === "object"
        ? item.foodId
        : item?.food && typeof item.food === "object"
          ? item.food
          : null;

    const provider =
      foodData?.provider ||
      foodData?.providerId ||
      foodData?.providerID ||
      item?.provider ||
      item?.providerId;

    if (typeof provider === "string") return provider;
    return provider?._id || provider?.id || null;
  };

  const handlePlaceOrder = async () => {
    if (!cartRawData || !cartRawData.items || cartRawData.items.length === 0) {
      Alert.alert("Error", "Your cart is empty");
      return;
    }

    setIsLoading(true);
    try {
      const firstItem = cartRawData.items[0];
      const providerId =
        cartRawData.providerId ||
        cartRawData.providerID ||
        resolveProviderId(firstItem);

      if (!providerId) {
        Alert.alert("Error", "Provider not found for cart items");
        return;
      }

      const itemsForPaymentIntent = cartRawData.items
        .map((item: any) => {
          const foodData =
            item?.foodId && typeof item.foodId === "object"
              ? item.foodId
              : item?.food && typeof item.food === "object"
                ? item.food
                : null;

          return {
            foodId: foodData?._id || foodData?.id || item.foodId || item.food?.foodId,
            quantity: item.quantity,
          };
        })
        .filter((item: any) => item.foodId);

      if (itemsForPaymentIntent.length === 0) {
        Alert.alert("Error", "Could not prepare payment items");
        return;
      }

      const shouldUseStripe = selectedCard !== "Cash On Delivery";

      if (shouldUseStripe) {
        const paymentIntentResult = await createPaymentIntent({
          providerId,
          items: itemsForPaymentIntent,
        });
        const clientSecret = paymentIntentResult?.data?.clientSecret;

        if (!paymentIntentResult || paymentIntentResult?.success === false || !clientSecret) {
          Alert.alert("Error", paymentIntentResult?.message || "Failed to create payment intent");
          return;
        }

        const initResult = await initPaymentSheet({
          merchantDisplayName: "Dine Five",
          paymentIntentClientSecret: clientSecret,
          allowsDelayedPaymentMethods: true,
        });

        if (initResult.error) {
          Alert.alert("Payment Error", initResult.error.message || "Unable to initialize payment sheet");
          return;
        }

        const paymentResult = await presentPaymentSheet();
        if (paymentResult.error) {
          const isCancelled = paymentResult.error.code === "Canceled";
          Alert.alert(
            isCancelled ? "Payment Cancelled" : "Payment Failed",
            paymentResult.error.message || (isCancelled ? "Payment was cancelled." : "Unable to complete payment."),
          );
          return;
        }
      }

      const formattedItems = cartRawData.items
        .map((item: any) => {
          const foodData =
            item?.foodId && typeof item.foodId === "object"
              ? item.foodId
              : item?.food && typeof item.food === "object"
                ? item.food
                : null;

          return {
            foodId: foodData?._id || foodData?.id || item.foodId || item.food?.foodId,
            quantity: item.quantity,
            price: item.price
          };
        })
        .filter((item: any) => !!item.foodId);

      const orderData = {
        providerId: providerId,
        items: formattedItems,
        totalPrice: cartTotal,
        paymentMethod: selectedCard,
        logisticsType: "Delivery"
      };

      console.log("Submitting Order Data:", JSON.stringify(orderData, null, 2));

      const result = await createOrder(orderData);

      if (result && result.success) {
        await clearCart();
        // Get restaurant details from the first item in cart
        const firstItem = cartRawData.items[0];
        const foodData = firstItem?.foodId && typeof firstItem.foodId === 'object' ? firstItem.foodId : (firstItem?.food || {});
        const deliveryAddr = "123 Main St, Apt 4B, New York, NY"; // This matches what we show in checkout
        
        router.push({
          pathname: "/screens/card/order-success",
          params: { 
            restaurantName: foodData.restaurantName || 'Restaurant',
            restaurantAddress: foodData.restaurantAddress || 'Selected Location',
            deliveryAddress: deliveryAddr,
            amount: cartTotal.toFixed(2)
          }
        });
      } else {
        Alert.alert("Error", result?.message || "Failed to place order");
      }
    } catch (error: any) {
      console.log("Order placement error:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-center pt-2 pb-6 relative px-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 z-10 w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Checkout</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Pickup Address */}
        <View className="mb-6">
          <View className="flex-row items-start">
            <Ionicons
              name="location-outline"
              size={24}
              color="#666"
              style={{ marginTop: 2, marginRight: 12 }}
            />
            <View className="flex-1">
              <Text className="text-gray-500 text-sm mb-1">Delivery Address</Text>
              <Text className="text-gray-900 font-bold text-base">
                123 Main St, Apt 4B, New York, NY
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="mb-8"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-start">
              <Ionicons
                name="card-outline"
                size={24}
                color="#666"
                style={{ marginTop: 2, marginRight: 12 }}
              />
              <View>
                <Text className="text-gray-500 text-sm mb-1">Payment Method</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {selectedCard}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>

        {/* Summary */}
        <View className="mt-4 pt-6 border-t border-gray-100">
          <View className="flex-row justify-between mb-4">
            <Text className="text-gray-500 text-base">Subtotal</Text>
            <Text className="text-gray-900 font-bold text-base">${cartSubtotal.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-gray-500 text-base">Delivery Fee</Text>
            <Text className="text-gray-900 font-bold text-base">$3.99</Text>
          </View>
          <View className="flex-row justify-between text-lg pt-4 border-t border-gray-100">
            <Text className="text-gray-900 text-lg font-bold">Total</Text>
            <Text className="text-gray-900 text-xl font-bold">${cartTotal.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-16 left-0 right-0 bg-[#FDFBF7] px-4 py-6 border-t border-gray-100 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">${cartTotal.toFixed(2)}</Text>
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isLoading}
          className={`bg-yellow-400 px-10 py-4 rounded-2xl shadow-md ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-gray-900 font-bold text-lg">Place Order</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[40%]">
            <View className="items-center mb-6">
              <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
              <Text className="text-lg font-bold text-gray-900">
                Choose Payment Method
              </Text>
            </View>

            {CARDS.map((card, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedCard(card)}
                className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl mb-3"
              >
                <Text className="text-gray-900 font-medium">{card}</Text>
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selectedCard === card ? "border-[#FFC107]" : "border-gray-300"}`}
                >
                  {selectedCard === card && (
                    <View className="w-2.5 h-2.5 rounded-full bg-[#FFC107]" />
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="bg-yellow-400 w-full py-4 rounded-2xl shadow-md mt-6 items-center"
            >
              <Text className="text-gray-900 font-bold text-lg">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function CheckoutScreen() {
  const { fetchStripeConfig } = useStore() as any;
  const [publishableKey, setPublishableKey] = useState("");
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadStripeConfig = async () => {
      try {
        const result = await fetchStripeConfig();
        const key = result?.data?.publishableKey;
        if (isMounted && key) {
          setPublishableKey(key);
        }
      } catch (error) {
        console.log("Stripe config error:", error);
      } finally {
        if (isMounted) {
          setIsLoadingConfig(false);
        }
      }
    };

    loadStripeConfig();

    return () => {
      isMounted = false;
    };
  }, [fetchStripeConfig]);

  if (isLoadingConfig) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#000" />
        <Text className="text-gray-600 mt-4">Loading payment configuration...</Text>
      </SafeAreaView>
    );
  }

  if (!publishableKey) {
    return (
      <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center px-6">
        <StatusBar style="dark" />
        <Text className="text-xl font-bold text-gray-900 mb-2 text-center">Payment Unavailable</Text>
        <Text className="text-gray-600 text-center">
          Could not initialize Stripe. Please try again in a moment.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <CheckoutContent />
    </StripeProvider>
  );
}
