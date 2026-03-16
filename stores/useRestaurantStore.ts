// useRestaurantStore.ts
import * as Location from "expo-location";
import { create } from "zustand";
import type { NearbyParams, Restaurant } from "./restaurantService";
import { restaurantService } from "./restaurantService";

export type { NearbyParams, Restaurant } from "./restaurantService";

const FALLBACK_LOCATION = { latitude: 23.780704, longitude: 90.407756 };
const isNear = (a: number, b: number, tolerance = 0.02) =>
  Math.abs(a - b) <= tolerance;

interface RestaurantState {
  // Location
  location: { latitude: number; longitude: number } | null;
  locationLoading: boolean;

  // Restaurants
  restaurants: Restaurant[];
  restaurantsLoading: boolean;
  restaurantsError: string | null;
  total: number;

  // UI
  selectedRestaurant: Restaurant | null;
  cuisineFilter: string | undefined;
  radiusMeters: number; // slider value in meters

  // Actions
  fetchLocation: () => Promise<void>;
  fetchNearbyRestaurants: (params: NearbyParams) => Promise<void>;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  setCuisineFilter: (cuisine: string | undefined) => void;
  setRadiusMeters: (radius: number) => void;
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  location: null,
  locationLoading: true,
  restaurants: [],
  restaurantsLoading: false,
  restaurantsError: null,
  total: 0,
  selectedRestaurant: null,
  cuisineFilter: undefined,
  radiusMeters: 1000,

  // ─── Fetch Location ──────────────────────────────────────────────────────────
  fetchLocation: async () => {
    set({ locationLoading: true });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        set({ location: { latitude: 23.780704, longitude: 90.407756 } });
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        set({
          location: {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          },
          locationLoading: false,
        });
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      set({
        location: {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        },
      });
    } catch {
      set({ location: { latitude: 23.780704, longitude: 90.407756 } });
    } finally {
      set({ locationLoading: false });
    }
  },

  // ─── Fetch Nearby (POST via restaurantService) ───────────────────────────────
  fetchNearbyRestaurants: async (params: NearbyParams) => {
    set({ restaurantsLoading: true, restaurantsError: null });
    try {
      const response = await restaurantService.getNearby(params);
      let restaurants = response.data ?? [];
      let total = response.pagination?.total ?? restaurants.length;

      // Fallback for environments where live GPS is far from seeded providers.
      if (restaurants.length === 0) {
        const requestedLat = params.latitude;
        const requestedLng = params.longitude;
        const alreadyUsingFallback =
          isNear(requestedLat, FALLBACK_LOCATION.latitude) &&
          isNear(requestedLng, FALLBACK_LOCATION.longitude);

        if (!alreadyUsingFallback) {
          const fallbackResponse = await restaurantService.getNearby({
            ...params,
            latitude: FALLBACK_LOCATION.latitude,
            longitude: FALLBACK_LOCATION.longitude,
            radius: Math.max(params.radius ?? 1000, 5000),
            cuisine: undefined,
          });

          if ((fallbackResponse.data ?? []).length > 0) {
            restaurants = fallbackResponse.data;
            total =
              fallbackResponse.pagination?.total ??
              fallbackResponse.data?.length ??
              restaurants.length;
          }
        }
      }

      set({
        restaurants,
        total,
      });
    } catch (err: any) {
      set({ restaurantsError: err.message ?? "Failed to load restaurants" });
    } finally {
      set({ restaurantsLoading: false });
    }
  },

  setSelectedRestaurant: (restaurant) => set({ selectedRestaurant: restaurant }),
  setCuisineFilter: (cuisine) => set({ cuisineFilter: cuisine }),
  setRadiusMeters: (radius) =>
    set({ radiusMeters: Math.max(10, Math.round(radius)) }),
}));
