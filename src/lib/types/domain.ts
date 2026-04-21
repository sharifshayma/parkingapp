export interface Profile {
  id: string;
  phone: string;
  full_name: string | null;
  apartment_number: string | null;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParkingSpot {
  id: string;
  owner_id: string;
  spot_number: string;
  label: string | null;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  provider_id: string;
  parking_spot_id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  is_available: boolean;
  created_at: string;
}

export interface Reservation {
  id: string;
  availability_slot_id: string;
  parking_spot_id: string;
  provider_id: string;
  booker_id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  status: "confirmed" | "cancelled";
  created_at: string;
  cancelled_at: string | null;
}

export interface AggregatedAvailability {
  date: string;
  start_hour: number;
  end_hour: number;
  available_count: number;
  is_own_spot: boolean;
  slot_ids: string[];
}

export interface BookingWithDetails extends Reservation {
  provider_name: string;
  provider_phone: string;
  spot_number: string;
}

export interface ReservationWithBooker extends Reservation {
  booker_name: string;
  spot_number: string;
}
