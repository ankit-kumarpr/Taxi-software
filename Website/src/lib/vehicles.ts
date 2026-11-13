import { apiGet, mediaUrl } from "@/lib/api";

type ApiImage = { url?: string } | null;

type ApiVehicle = {
  _id?: string;
  vehicleId?: string;
  vehicleName?: string;
  fuelType?: string;
  transmission?: string;
  seatingCapacity?: number;
  vehiclePhoto?: ApiImage;
  otherImages?: ApiImage[];
  vehicleType?: { name?: string } | null;
  status?: string;
};

type ListResponse = {
  success?: boolean;
  data?: ApiVehicle[];
  pagination?: { total?: number; page?: number; pages?: number; limit?: number };
};

export type WebsiteVehicle = {
  id: string;
  name: string;
  category: string;
  seats: number;
  fuel: string;
  transmission: string;
  summary: string;
  image: string;
};

function mapVehicle(v: ApiVehicle): WebsiteVehicle {
  const name = v.vehicleName || "Vehicle";
  const category = v.vehicleType?.name || "Fleet";
  const seats = Number(v.seatingCapacity) || 0;
  const fuel = v.fuelType || "";
  const transmission = v.transmission || "";
  const bits = [fuel, transmission].filter(Boolean);
  return {
    id: String(v._id || v.vehicleId || name),
    name,
    category,
    seats,
    fuel,
    transmission,
    summary: bits.length ? `${bits.join(" · ")}` : "Well-maintained taxi ready for your trip.",
    image:
      mediaUrl(v.vehiclePhoto?.url) ||
      mediaUrl(v.otherImages?.[0]?.url) ||
      "",
  };
}

export async function listPublishedVehicles(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const res = await apiGet<ListResponse>(`/website/vehicles/list${qs ? `?${qs}` : ""}`);
  const rows = res?.data || [];
  return {
    vehicles: rows.map(mapVehicle),
    pagination: res?.pagination,
  };
}
