export type UserRole = 'admin' | 'user';
export type FuelType = 'gasoline_92' | 'gasoline_95' | 'gasoline_98' | 'diesel_0';
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gasoline_92: '92#汽油',
  gasoline_95: '95#汽油',
  gasoline_98: '98#汽油',
  diesel_0: '0#柴油',
};

export interface Profile {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: UserRole;
  created_by: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  owner_id: string;
  created_at: string;
  // derived
  owner_name?: string;
}

export interface VehicleShare {
  id: string;
  vehicle_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  status: 'confirmed';
  created_at: string;
  // derived
  vehicle_name?: string;
  shared_with_username?: string;
  shared_by_username?: string;
}

export interface ChargingRecord {
  id: string;
  vehicle_id: string;
  user_id: string;
  charge_date: string;
  odometer_km: number;
  charge_duration_hours: number;
  charge_cost: number;
  distance_since_last_km: number;
  charge_number: number;
  station: string;
  notes: string;
  created_at: string;
  // derived
  vehicle_name?: string;
  user_name?: string;
}

export interface ChargingRecordInput {
  vehicle_id: string;
  charge_date: string;
  odometer_km: number;
  charge_duration_hours: number;
  charge_cost: number;
  distance_since_last_km: number;
  charge_number: number;
  station: string;
  notes: string;
  manual_charge_number?: boolean;
}

export interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DashboardStats {
  totalCost: number;
  totalCount: number;
  totalDuration: number;
  totalDistance: number;
}

export interface FuelRecord {
  id: string;
  vehicle_id: string;
  user_id: string;
  fuel_date: string;
  odometer_km: number;
  fuel_gauge: number;
  fuel_type: FuelType;
  unit_price: number;
  total_amount: number;
  liters: number;
  distance_since_last_km: number;
  station: string;
  notes: string;
  created_at: string;
  // derived
  vehicle_name?: string;
  user_name?: string;
}

export interface FuelRecordInput {
  vehicle_id: string;
  fuel_date: string;
  odometer_km: number;
  fuel_gauge: number;
  fuel_type: FuelType;
  unit_price: number;
  total_amount: number;
  liters: number;
  distance_since_last_km: number;
  station: string;
  notes: string;
}

export interface FuelDashboardStats {
  totalAmount: number;
  totalCount: number;
  totalLiters: number;
  avgConsumption: number;
}
