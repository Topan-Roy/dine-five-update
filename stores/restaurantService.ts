// restaurantService.ts
import { API_BASE_URL } from "@/utils/api";

export interface Restaurant {
  providerId: string;
  restaurantName: string;
  location: { lat: number; lng: number };
  distance: number; // in km from API
  distanceMeters?: number;
  cuisine: string[];
  restaurantAddress: string;
  city: string;
  state: string;
  phoneNumber: string;
  contactEmail: string;
  profile: string; // image URL
  isVerify: boolean;
  verificationStatus: string;
  availableFoods: number;
  rating?: number;
  deliveryTimeMinutes?: number;
}

export interface NearbyParams {
  latitude: number;
  longitude: number;
  radius?: number; // meters
  cuisine?: string;
  sortBy?: "distance" | "rating";
  page?: number;
  limit?: number;
}

export interface NearbyResponse {
  success: boolean;
  message: string;
  data: Restaurant[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

const BASE_URL = `${API_BASE_URL}/api/v1`;

type RetryableError = Error & { retryable?: boolean };

const getAuthHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  // Authorization: `Bearer ${yourToken}`,
});

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const isValidLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90;
const isValidLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180;

const extractCoordinates = (item: any): { lat: number; lng: number } | null => {
  const directLat = toNumber(
    item?.location?.lat ?? item?.location?.latitude ?? item?.latitude ?? item?.lat,
    NaN,
  );
  const directLng = toNumber(
    item?.location?.lng ?? item?.location?.longitude ?? item?.longitude ?? item?.lng,
    NaN,
  );

  if (isValidLatitude(directLat) && isValidLongitude(directLng)) {
    return { lat: directLat, lng: directLng };
  }

  const coords = item?.location?.coordinates ?? item?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    // GeoJSON order: [lng, lat]
    const geoLng = toNumber(coords[0], NaN);
    const geoLat = toNumber(coords[1], NaN);
    if (isValidLatitude(geoLat) && isValidLongitude(geoLng)) {
      return { lat: geoLat, lng: geoLng };
    }
  }

  return null;
};

const normalizeDistanceKm = (raw: any): number => {
  const fromMeters = toNumber(raw?.distanceMeters ?? raw?.distanceInMeters, NaN);
  if (Number.isFinite(fromMeters)) return Math.max(0, fromMeters / 1000);

  const unit = String(raw?.distanceUnit ?? raw?.unit ?? "").toLowerCase();
  const value = toNumber(raw?.distance ?? raw?.distanceKm ?? raw?.dist, 0);

  if (!Number.isFinite(value)) return 0;

  if (unit.includes("meter") || unit === "m") return Math.max(0, value / 1000);
  if (unit.includes("km") || unit.includes("kilometer")) return Math.max(0, value);

  // Nearby API is radius-limited; very large values are usually meters.
  if (value > 30) return Math.max(0, value / 1000);
  return Math.max(0, value);
};

const normalizeRestaurant = (item: any, index: number): Restaurant => {
  const coords = extractCoordinates(item);
  const distanceKm = normalizeDistanceKm(item);

  const cuisine = Array.isArray(item?.cuisine)
    ? item.cuisine
    : Array.isArray(item?.cuisines)
      ? item.cuisines
      : typeof item?.cuisine === "string"
        ? item.cuisine.split(",").map((value: string) => value.trim()).filter(Boolean)
        : [];

  const rating = toNumber(item?.rating ?? item?.averageRating ?? item?.avgRating, 4.2);
  const deliveryTime = toNumber(
    item?.deliveryTimeMinutes ?? item?.deliveryTime ?? item?.estimatedDeliveryMinutes,
    5 + Math.min(15, Math.round(distanceKm * 2)),
  );

  return {
    providerId: String(item?.providerId ?? item?.id ?? item?._id ?? `provider-${index}`),
    restaurantName: String(item?.restaurantName ?? item?.name ?? "Restaurant"),
    location: { lat: coords?.lat ?? NaN, lng: coords?.lng ?? NaN },
    distance: distanceKm,
    distanceMeters: Math.round(distanceKm * 1000),
    cuisine,
    restaurantAddress: String(item?.restaurantAddress ?? item?.address ?? ""),
    city: String(item?.city ?? ""),
    state: String(item?.state ?? ""),
    phoneNumber: String(item?.phoneNumber ?? item?.phone ?? ""),
    contactEmail: String(item?.contactEmail ?? item?.email ?? ""),
    profile: String(item?.profile ?? item?.image ?? item?.imageUrl ?? ""),
    isVerify: Boolean(item?.isVerify ?? item?.isVerified ?? false),
    verificationStatus: String(item?.verificationStatus ?? ""),
    availableFoods: toNumber(item?.availableFoods ?? item?.foodCount, 0),
    rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 4.2,
    deliveryTimeMinutes: Math.max(5, Math.min(60, deliveryTime)),
  };
};

const normalizeNearbyResponse = (payload: any): NearbyResponse => {
  const rawData = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.restaurants)
      ? payload.restaurants
      : Array.isArray(payload)
        ? payload
        : [];

  const normalized = rawData
    .map((item: any, index: number) => normalizeRestaurant(item, index))
    .filter((item: Restaurant) => isValidLatitude(item.location.lat) && isValidLongitude(item.location.lng));

  return {
    success: payload?.success !== false,
    message: payload?.message ?? "Nearby restaurants loaded",
    data: normalized,
    pagination: payload?.pagination
      ? {
          total: toNumber(payload.pagination.total, normalized.length),
          page: toNumber(payload.pagination.page, 1),
          limit: toNumber(payload.pagination.limit, normalized.length || 20),
        }
      : undefined,
  };
};

export const restaurantService = {
  /**
   * POST /provider/nearby
   * Backend expects radius in kilometers (max 100).
   */
  getNearby: async (params: NearbyParams): Promise<NearbyResponse> => {
    const radiusMeters = Math.max(10, Math.round(params.radius ?? 1000));
    const radiusKm = Math.min(100, Number((radiusMeters / 1000).toFixed(2)));
    const common = {
      sortBy: params.sortBy ?? "distance",
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.cuisine ? { cuisine: params.cuisine } : {}),
    };

    const payloads: Record<string, any>[] = [
      {
        latitude: params.latitude,
        longitude: params.longitude,
        radius: radiusKm,
        radiusKm,
        radiusMeters,
        ...common,
      },
      {
        lat: params.latitude,
        lng: params.longitude,
        radius: radiusKm,
        radiusKm,
        radiusMeters,
        ...common,
      },
    ];

    const endpoints = [
      `${BASE_URL}/provider/nearby`,
      `${BASE_URL}/providers/nearby`,
      `${BASE_URL}/restaurants/nearby`,
    ];

    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      for (const body of payloads) {
        console.log("Nearby request payload:", JSON.stringify({ endpoint, body }));
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(body),
          });

          const responseText = await res.text();
          let json: any = null;
          try {
            json = responseText ? JSON.parse(responseText) : null;
          } catch {
            json = null;
          }

          console.log("Nearby response status:", res.status);

          if (!res.ok) {
            const errorMessage =
              json?.message ||
              json?.error?.message ||
              responseText ||
              `Request failed with status ${res.status}`;

            const error = new Error(errorMessage) as RetryableError;
            // Retry only when endpoint is missing/not allowed; otherwise stop immediately.
            error.retryable = res.status === 404 || res.status === 405;
            throw error;
          }

          const normalized = normalizeNearbyResponse(json);
          if (!normalized.success && normalized.data.length === 0) {
            lastError = new Error(normalized.message || "Unknown API error");
            continue;
          }

          return normalized;
        } catch (error: any) {
          if (error && typeof error === "object" && error.retryable === false) {
            throw error;
          }
          lastError = error;
        }
      }
    }

    console.log("Nearby request error:", lastError);
    throw lastError || new Error("Failed to load nearby restaurants");
  },
};

