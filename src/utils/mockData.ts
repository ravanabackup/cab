import { RideClass, RideOption, Driver, TripHistory, Coordinates } from "../types";

export const RIDE_OPTIONS: RideOption[] = [
  {
    id: "uber_x",
    name: RideClass.UBER_X,
    tagline: "Standard, affordable private rides.",
    multiplier: 1.0,
    basePrice: 120, // base price in INR
    capacity: 4,
    etaMinutes: 3,
    category: "Standard"
  },
  {
    id: "uber_xl",
    name: RideClass.UBER_XL,
    tagline: "Larger vehicles for up to 6 passengers.",
    multiplier: 1.6,
    basePrice: 220,
    capacity: 6,
    etaMinutes: 5,
    category: "Standard"
  },
  {
    id: "uber_comfort",
    name: RideClass.UBER_COMFORT,
    tagline: "Newer cars with extra legroom.",
    multiplier: 1.3,
    basePrice: 180,
    capacity: 4,
    etaMinutes: 4,
    category: "Standard"
  },
  {
    id: "uber_black",
    name: RideClass.UBER_BLACK,
    tagline: "Premium luxury rides with top-rated partners.",
    multiplier: 2.2,
    basePrice: 350,
    capacity: 4,
    etaMinutes: 6,
    category: "Premium"
  },
  {
    id: "uber_black_suv",
    name: RideClass.UBER_BLACK_SUV,
    tagline: "Luxury SUVs for larger groups.",
    multiplier: 2.8,
    basePrice: 500,
    capacity: 6,
    etaMinutes: 8,
    category: "Premium"
  },
  {
    id: "uber_moto",
    name: RideClass.UBER_MOTO,
    tagline: "Zip through traffic quickly and affordably on a bike.",
    multiplier: 0.5,
    basePrice: 40,
    capacity: 1,
    etaMinutes: 2,
    category: "Economy"
  },
  {
    id: "uber_auto",
    name: RideClass.UBER_AUTO,
    tagline: "Rickshaw rides across Bangalore, no bargain needed.",
    multiplier: 0.7,
    basePrice: 60,
    capacity: 3,
    etaMinutes: 3,
    category: "Economy"
  },
  {
    id: "uber_taxi",
    name: RideClass.UBER_TAXI,
    tagline: "Book licensed local taxis through your screen.",
    multiplier: 0.9,
    basePrice: 100,
    capacity: 4,
    etaMinutes: 4,
    category: "Standard"
  },
  {
    id: "uber_intercity",
    name: RideClass.UBER_INTERCITY,
    tagline: "Travel premium between cities with ease.",
    multiplier: 3.5,
    basePrice: 1500,
    capacity: 4,
    etaMinutes: 15,
    category: "Specialty"
  },
  {
    id: "uber_reserve",
    name: RideClass.UBER_RESERVE,
    tagline: "Schedule your luxury ride up to 30 days in advance.",
    multiplier: 1.5,
    basePrice: 250,
    capacity: 4,
    etaMinutes: 5,
    category: "Specialty"
  },
  {
    id: "uber_rent",
    name: RideClass.UBER_RENT,
    tagline: "Rent direct by the hour (includes professional chauffeur).",
    multiplier: 2.5,
    basePrice: 600,
    capacity: 4,
    etaMinutes: 10,
    category: "Specialty"
  },
  {
    id: "uber_shuttle",
    name: RideClass.UBER_SHUTTLE,
    tagline: "Premium shared shuttle service on select commute routes.",
    multiplier: 0.4,
    basePrice: 45,
    capacity: 16,
    etaMinutes: 8,
    category: "Economy"
  },
  {
    id: "uber_share",
    name: RideClass.UBER_SHARE,
    tagline: "Share your standard route with another rider for instant discount.",
    multiplier: 0.75,
    basePrice: 90,
    capacity: 2,
    etaMinutes: 5,
    category: "Economy"
  },
  {
    id: "uber_green",
    name: RideClass.UBER_GREEN,
    tagline: "Electric/hybrid vehicles for sustainable commuting.",
    multiplier: 1.1,
    basePrice: 130,
    capacity: 4,
    etaMinutes: 4,
    category: "Standard"
  },
  {
    id: "uber_transit",
    name: RideClass.UBER_TRANSIT,
    tagline: "Public transport schedules and ticketing information.",
    multiplier: 0.3,
    basePrice: 20,
    capacity: 50,
    etaMinutes: 9,
    category: "Economy"
  },
  {
    id: "uber_pet",
    name: RideClass.UBER_PET,
    tagline: "Pet-friendly standard rides for you and your companion.",
    multiplier: 1.4,
    basePrice: 200,
    capacity: 3,
    etaMinutes: 5,
    category: "Specialty"
  },
  {
    id: "uber_wav",
    name: RideClass.UBER_WAV,
    tagline: "Wheelchair-accessible vehicles with trained drivers.",
    multiplier: 1.0,
    basePrice: 120,
    capacity: 4,
    etaMinutes: 7,
    category: "Specialty"
  },
  {
    id: "jet",
    name: RideClass.JET,
    tagline: "Ultra-high-speed Supersonic Jet transit. Boundless high-altitude corridor above 500 km/h.",
    multiplier: 18.0,
    basePrice: 12500,
    capacity: 6,
    etaMinutes: 10,
    category: "Premium",
    isJet: true
  }
];

export const MOCK_SAVED_PLACES = [
  { name: "Home", address: "Prestige Shantiniketan, Whitefield, Bangalore", lat: 12.9844, lng: 77.7289 },
  { name: "Work", address: "Embassy TechVillage, Bellandur, Bangalore", lat: 12.9298, lng: 77.6841 },
  { name: "Kempegowda International Airport", address: "KIAB Road, Devanahalli, Bangalore", lat: 13.1986, lng: 77.7066 },
  { name: "Indiranagar Metro Station", address: "80 Feet Rd, Indiranagar, Bangalore", lat: 12.9784, lng: 77.6408 },
  { name: "Koromangala Club", address: "6th Block, Koramangala, Bangalore", lat: 12.9348, lng: 77.6224 },
  { name: "UB City Mall", address: "Vittal Mallya Rd, KG Halli, Bangalore", lat: 12.9716, lng: 77.5958 }
];

export const MOCK_HISTORY: TripHistory[] = [
  {
    id: "t_101",
    date: "June 15, 2026",
    pickup: "Indiranagar Metro Station",
    dropoff: "UB City Mall",
    price: 180,
    rideType: RideClass.UBER_X,
    status: "Completed"
  },
  {
    id: "t_102",
    date: "June 12, 2026",
    pickup: "Prestige Shantiniketan",
    dropoff: "Kempegowda International Airport",
    price: 1450,
    rideType: RideClass.UBER_BLACK,
    status: "Completed"
  },
  {
    id: "t_103",
    date: "June 08, 2026",
    pickup: "Koramangala Club",
    dropoff: "Embassy TechVillage",
    price: 75,
    rideType: RideClass.UBER_AUTO,
    status: "Completed"
  },
  {
    id: "t_104",
    date: "June 03, 2026",
    pickup: "Prestige Shantiniketan",
    dropoff: "Koramangala Club",
    price: 320,
    rideType: RideClass.UBER_XL,
    status: "Cancelled"
  }
];

export const RANDOM_DRIVERS = [
  {
    name: "Ramesh Kumar",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    rating: 4.89,
    trips: 12450,
    vehicles: {
      [RideClass.UBER_X]: { model: "Maruti Suzuki Dzire", plate: "KA-03-MD-1240" },
      [RideClass.UBER_XL]: { model: "Toyota Innova Crysta", plate: "KA-01-MV-9876" },
      [RideClass.UBER_COMFORT]: { model: "Honda City", plate: "KA-51-AA-4433" },
      [RideClass.UBER_BLACK]: { model: "Audi A6", plate: "KA-05-SR-0007" },
      [RideClass.UBER_BLACK_SUV]: { model: "Toyota Fortuner", plate: "KA-04-FF-9999" },
      [RideClass.UBER_MOTO]: { model: "Royal Enfield Classic 350", plate: "KA-53-EX-1111" },
      [RideClass.UBER_AUTO]: { model: "Bajaj RE Auto", plate: "KA-03-AU-8291" },
      [RideClass.UBER_TAXI]: { model: "Standard Yellow Cab", plate: "KA-02-TX-5678" },
      [RideClass.UBER_INTERCITY]: { model: "Toyota Etios", plate: "KA-04-IC-7722" },
      [RideClass.UBER_RESERVE]: { model: "Skoda Superb", plate: "KA-51-RES-009" },
      [RideClass.UBER_RENT]: { model: "Mercedes C-Class", plate: "KA-01-LUX-1" },
      [RideClass.UBER_SHUTTLE]: { model: "Force Traveller", plate: "KA-19-SH-8877" },
      [RideClass.UBER_SHARE]: { model: "WagonR S-CNG", plate: "KA-03-SH-2290" },
      [RideClass.UBER_GREEN]: { model: "Tata Nexon EV", plate: "KA-51-EV-4488" },
      [RideClass.UBER_TRANSIT]: { model: "BMTC Metro Bus", plate: "BMTC-METRO-01" },
      [RideClass.UBER_PET]: { model: "Hyundai Creta (Pet Friendly)", plate: "KA-05-PET-88" },
      [RideClass.UBER_WAV]: { model: "Mahindra Supro (Accessible)", plate: "KA-04-WAV-12" },
      [RideClass.JET]: { model: "Bombardier Challenger Jet", plate: "VT-BOMBARDIER-JET" }
    }
  },
  {
    name: "Arjun Singh",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    rating: 4.95,
    trips: 8900,
    vehicles: {
      [RideClass.UBER_X]: { model: "Hyundai Aura", plate: "KA-03-HA-8822" },
      [RideClass.UBER_XL]: { model: "Mahindra XUV700", plate: "KA-05-MX-8899" },
      [RideClass.UBER_COMFORT]: { model: "Hyundai Verna", plate: "KA-02-HV-3124" },
      [RideClass.UBER_BLACK]: { model: "BMW 5 Series", plate: "KA-03-BM-5555" },
      [RideClass.UBER_BLACK_SUV]: { model: "Ford Endeavour", plate: "KA-03-FE-1010" },
      [RideClass.UBER_MOTO]: { model: "KTM Duke 250", plate: "KA-02-KT-9090" },
      [RideClass.UBER_AUTO]: { model: "Piaggio Ape", plate: "KA-01-AP-1088" },
      [RideClass.UBER_TAXI]: { model: "Ambassador Classic Taxi", plate: "KA-04-TX-1002" },
      [RideClass.UBER_INTERCITY]: { model: "Maruti Ertiga", plate: "KA-53-IC-1229" },
      [RideClass.UBER_RESERVE]: { model: "Volkswagen Virtus", plate: "KA-02-VR-8756" },
      [RideClass.UBER_RENT]: { model: "BMW 3 Series Gran Limousine", plate: "KA-05-LUX-2" },
      [RideClass.UBER_SHUTTLE]: { model: "Tata Winger", plate: "KA-03-SH-5511" },
      [RideClass.UBER_SHARE]: { model: "Hyundai Grand i10", plate: "KA-03-SH-1100" },
      [RideClass.UBER_GREEN]: { model: "MG ZS EV", plate: "KA-51-EV-2233" },
      [RideClass.UBER_TRANSIT]: { model: "Namma Metro Link", plate: "NAMMA-M-202" },
      [RideClass.UBER_PET]: { model: "Honda Elevate (Furry-Safe)", plate: "KA-03-PET-99" },
      [RideClass.UBER_WAV]: { model: "Maruti Eeco Special Edition", plate: "KA-01-WAV-11" },
      [RideClass.JET]: { model: "Cessna Citation Latitude Jet", plate: "VT-CESSNA-JET" }
    }
  },
  {
    name: "Sunita Deshmukh",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    rating: 4.97,
    trips: 15300,
    vehicles: {
      [RideClass.UBER_X]: { model: "Maruti Dzire Tour S", plate: "KA-04-TR-8811" },
      [RideClass.UBER_XL]: { model: "Maruti Suzuki Ertiga Tour", plate: "KA-03-ERT-9922" },
      [RideClass.UBER_COMFORT]: { model: "Toyota Glanza", plate: "KA-02-TG-7788" },
      [RideClass.UBER_BLACK]: { model: "Mercedes-Benz E-Class", plate: "KA-01-MB-0001" },
      [RideClass.UBER_BLACK_SUV]: { model: "Audi Q7 Luxe", plate: "KA-03-AQ-7777" },
      [RideClass.UBER_MOTO]: { model: "Ather 450X Electric Scooter", plate: "KA-05-AT-3322" },
      [RideClass.UBER_AUTO]: { model: "Mahindra Treo Electric Auto", plate: "KA-51-EA-1122" },
      [RideClass.UBER_TAXI]: { model: "Local Karnataka Permit Taxi", plate: "KA-01-TA-5151" },
      [RideClass.UBER_INTERCITY]: { model: "Kia Carens", plate: "KA-04-IC-1100" },
      [RideClass.UBER_RESERVE]: { model: "Toyota Innova", plate: "KA-05-RES-777" },
      [RideClass.UBER_RENT]: { model: "Mercedes GLC Coupe", plate: "KA-01-LUX-3" },
      [RideClass.UBER_SHUTTLE]: { model: "Mahindra Cruz Bus", plate: "KA-03-SB-1122" },
      [RideClass.UBER_SHARE]: { model: "Tata Tiago iCNG", plate: "KA-02-SH-5566" },
      [RideClass.UBER_GREEN]: { model: "BYD Atto 3 Premium EV", plate: "KA-51-EV-1122" },
      [RideClass.UBER_TRANSIT]: { model: "Suburban Commuter Rail", plate: "S-RAIL-01" },
      [RideClass.UBER_PET]: { model: "Maruti Ertiga (Pet Cabin)", plate: "KA-03-PET-01" },
      [RideClass.UBER_WAV]: { model: "Toyota Commuter Custom", plate: "KA-05-WAV-88" },
      [RideClass.JET]: { model: "Gulfstream G650 Executive Jet", plate: "VT-GULFSTREAM-JET" }
    }
  }
];

export function getRandomDriver(vehicleType: RideClass): Driver {
  const baseDrivers = RANDOM_DRIVERS;
  const index = Math.floor(Math.random() * baseDrivers.length);
  const driverData = baseDrivers[index];
  const vehicle = driverData.vehicles[vehicleType] || { model: "Sedan Premium", plate: "KA-01-XX-9999" };
  
  return {
    id: `d_sim_${Math.floor(Math.random() * 100000)}`,
    name: driverData.name,
    avatar: driverData.avatar,
    rating: driverData.rating,
    vehicleModel: vehicle.model,
    plateNumber: vehicle.plate,
    tripsCount: driverData.trips,
    phoneNumber: "+91 98" + Math.floor(10000000 + Math.random() * 90000000),
    vehicleType: vehicleType
  };
}

export interface StateStation {
  state: string;
  stationName: string;
  city: string;
  lat: number;
  lng: number;
  poiName: string;
}

export const INDIA_STATE_STATIONS: StateStation[] = [
  { state: "Delhi", stationName: "New Delhi Railway Station (NDLS)", city: "New Delhi", lat: 28.6415, lng: 77.2195, poiName: "The Taj Mahal Hotel, Mansingh Road, New Delhi" },
  { state: "Maharashtra", stationName: "Mumbai Chhatrapati Shivaji Terminus (CSMT)", city: "Mumbai", lat: 18.9400, lng: 72.8355, poiName: "The Taj Mahal Palace, Colaba, Mumbai" },
  { state: "Karnataka", stationName: "KSR Bengaluru City Railway Station (SBC)", city: "Bengaluru", lat: 12.9785, lng: 77.5695, poiName: "The Leela Palace, HAL Old Airport Road, Bengaluru" },
  { state: "Tamil Nadu", stationName: "Puratchi Thalaivar Dr. M.G. Ramachandran Central (MAS)", city: "Chennai", lat: 13.0827, lng: 80.2707, poiName: "Taj Connemara, Binny Road, Chennai" },
  { state: "West Bengal", stationName: "Howrah Junction Railway Station (HWH)", city: "Kolkata", lat: 22.5841, lng: 88.3414, poiName: "The Oberoi Grand, Jawaharlal Nehru Rd, Kolkata" },
  { state: "Telangana", stationName: "Secunderabad Junction Station (SC)", city: "Hyderabad", lat: 17.4342, lng: 78.5015, poiName: "Taj Falaknuma Palace, Engine Bowli, Hyderabad" },
  { state: "Gujarat", stationName: "Ahmedabad Junction Railway Station (ADI)", city: "Ahmedabad", lat: 23.0298, lng: 72.6011, poiName: "Hyatt Regency, Ashram Road, Ahmedabad" },
  { state: "Kerala", stationName: "Trivandrum Central Railway Station (TVC)", city: "Thiruvananthapuram", lat: 8.4879, lng: 76.9515, poiName: "The Raviz Kovalam, Beach Road, Trivandrum" },
  { state: "Uttar Pradesh", stationName: "Lucknow Charbagh Railway Station (LKO)", city: "Lucknow", lat: 26.8317, lng: 80.9158, poiName: "Taj Mahal Lucknow, Vipin Khand, Lucknow" },
  { state: "Rajasthan", stationName: "Jaipur Junction Railway Station (JP)", city: "Jaipur", lat: 26.9196, lng: 75.7878, poiName: "Rambagh Palace, Bhawani Singh Road, Jaipur" },
  { state: "Punjab/Haryana", stationName: "Chandigarh Junction Railway Station (CDG)", city: "Chandigarh", lat: 30.7018, lng: 76.8222, poiName: "The Oberoi Sukhvilas Spa Resort, Chandigarh" },
  { state: "Bihar", stationName: "Patna Junction Railway Station (PNBE)", city: "Patna", lat: 25.6022, lng: 85.1376, poiName: "Maurya Patna, Fraser Road, Patna" },
  { state: "Madhya Pradesh", stationName: "Bhopal Junction Railway Station (BPL)", city: "Bhopal", lat: 23.2684, lng: 77.4116, poiName: "Taj Lakefront Bhopal, Link Road 3, Bhopal" },
  { state: "Goa", stationName: "Madgaon Junction Railway Station (MAO)", city: "Madgaon", lat: 15.2736, lng: 73.9691, poiName: "Taj Exotica Resort & Spa, Benaulim, Goa" },
  { state: "Jharkhand", stationName: "Ranchi Junction Railway Station (RNC)", city: "Ranchi", lat: 23.3444, lng: 85.3211, poiName: "Radisson Blu Hotel, Main Road, Ranchi" },
  { state: "Uttarakhand", stationName: "Dehradun Railway Station (DDN)", city: "Dehradun", lat: 30.3165, lng: 78.0322, poiName: "Taj Resort & Spa, Rishikesh near Dehradun" }
];
