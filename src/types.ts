export enum RideClass {
  UBER_X = "UberX",
  UBER_XL = "UberXL",
  UBER_COMFORT = "Uber Comfort",
  UBER_BLACK = "Uber Black",
  UBER_BLACK_SUV = "Uber Black SUV",
  UBER_MOTO = "Uber Moto / Uber Bike",
  UBER_AUTO = "Uber Auto",
  UBER_TAXI = "Uber Taxi",
  UBER_INTERCITY = "Uber Intercity",
  UBER_RESERVE = "Uber Reserve",
  UBER_RENT = "Uber Rent",
  UBER_SHUTTLE = "Uber Shuttle",
  UBER_SHARE = "Uber Share",
  UBER_GREEN = "Uber Green",
  UBER_TRANSIT = "Uber Transit",
  UBER_PET = "Uber Pet",
  UBER_WAV = "Uber WAV",
  JET = "Supersonic Jet Mode",
}

export interface RideOption {
  id: string;
  name: RideClass;
  tagline: string;
  multiplier: number; // For pricing
  basePrice: number; // Base fee in INR
  capacity: number;
  etaMinutes: number; // Approximate match ETA
  category: "Standard" | "Premium" | "Economy" | "Specialty";
  isJet?: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  display_name: string;
  lat: number;
  lng: number;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  avatar: string;
  vehicleModel: string;
  plateNumber: string;
  tripsCount: number;
  phoneNumber: string;
  vehicleType: RideClass;
}

export interface TripHistory {
  id: string;
  date: string;
  pickup: string;
  dropoff: string;
  price: number;
  rideType: RideClass;
  status: "Completed" | "Cancelled";
}

export interface TrafficSignal {
  id: string;
  lat: number;
  lng: number;
  state: "RED" | "YELLOW" | "GREEN";
  timer: number; // current phase timer
}

export interface NearbyVehicle {
  id: string;
  lat: number;
  lng: number;
  type: RideClass;
  heading: number;
  speed: number;
  wobblePhase: number;
}

export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

