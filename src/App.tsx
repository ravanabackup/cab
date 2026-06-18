import { useState, useEffect } from "react";
import { 
  Menu, Navigation, MapPin, Compass, Shield, Clock, 
  Map, Award, Calendar, Heart, BellRing, Sparkles, X, Star
} from "lucide-react";
import { Coordinates, Driver, RideClass, RideOption, TripHistory, RouteStop } from "./types";
import { RIDE_OPTIONS, MOCK_HISTORY, getRandomDriver } from "./utils/mockData";
import MapContainer from "./components/MapContainer";
import BookingPanel from "./components/BookingPanel";
import DriverCard from "./components/DriverCard";
import SideMenu from "./components/SideMenu";

// Web Audio API Synthesizer - Clean double chime "ping" for arrival alerts
function playSubtleArrivalPing() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // Primary Tone: A5 (880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);
    
    // Delayed Second Tone: E6 (1320Hz) - Plays with a delay of 120ms
    setTimeout(() => {
      try {
        if (ctx.state === "closed") return;
        const now2 = ctx.currentTime;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1320, now2);
        gain2.gain.setValueAtTime(0.0, now2);
        gain2.gain.linearRampToValueAtTime(0.12, now2 + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.3);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now2);
        osc2.stop(now2 + 0.3);
      } catch (err) {
        console.warn("Audio feedback secondary oscillator failure:", err);
      }
    }, 120);
  } catch (err) {
    console.warn("Web Audio API is blocked or unsupported:", err);
  }
}

export default function App() {
  // Navigation & Menu Status
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "warning" | "info"; msg: string } | null>(null);

  // Geographic Markers
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [dropoff, setDropoff] = useState<Coordinates | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  // Tracking details
  const [tripStatus, setTripStatus] = useState<"idle" | "finding_driver" | "driver_en_route" | "trip_in_progress" | "trip_complete">("idle");
  const [activeVehicleType, setActiveVehicleType] = useState<RideOption | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
  const [followDriver, setFollowDriver] = useState(true);

  // Promotion Coupons code system
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [tripHistory, setTripHistory] = useState<TripHistory[]>(MOCK_HISTORY);

  // Active Trip metrics
  const [speed, setSpeed] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [currentSignalState, setCurrentSignalState] = useState("No signals ahead");
  const [pickupWaitCountdown, setPickupWaitCountdown] = useState<number | null>(null);
  const [activeInputType, setActiveInputType] = useState<"pickup" | "dropoff" | null>(null);
  const [activeSignal, setActiveSignal] = useState<{ state: "RED" | "YELLOW" | "GREEN"; timer: number } | null>(null);

  // Multi-stop and Interstate Luxury Multi-leg tracking
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [isInterstateMode, setIsInterstateMode] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeLeg, setActiveLeg] = useState<"car_to_station" | "train_interstate" | "station_to_dest" | null>(null);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  // Summary of confirmed trip for receipt calculations
  const [bookedStats, setBookedStats] = useState<{
    pickupStr: string;
    dropoffStr: string;
    distanceKm: number;
    etaMin: number;
    priceFinal: number;
  } | null>(null);

  // Quick helper to show high-fidelity toast alerts
  const triggerToast = (msg: string, type: "success" | "warning" | "info" = "success") => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Weather widget parameters calculators based on coordinates
  const getWeatherIcon = (p: any) => {
    if (!p) return "🌤️";
    if (isInterstateMode && progressPercent > 50) return "☀️";
    const val = Math.floor(Math.abs(p.lat + p.lng) * 10) % 3;
    if (val === 0) return "🌦️";
    if (val === 1) return "🌤️";
    return "⛅";
  };

  const getWeatherTemp = (p: any) => {
    if (!p) return "24.2";
    if (isInterstateMode) {
      const scale = 24.2 + (31.8 - 24.2) * (progressPercent / 100);
      return scale.toFixed(1);
    }
    const skew = (Math.floor(Math.abs(p.lat + p.lng) * 10) % 5) - 2;
    return (23.8 + skew).toFixed(1);
  };

  const getWeatherCond = (p: any) => {
    if (!p) return "pleasant hills";
    if (isInterstateMode) {
      if (progressPercent < 30) return "pleasant valleys";
      if (progressPercent < 75) return "warm crosswinds";
      return "coastal tropical";
    }
    const val = Math.floor(Math.abs(p.lat + p.lng) * 10) % 3;
    if (val === 0) return "passing drizzle";
    if (val === 1) return "scattered sun";
    return "gentle fog";
  };

  // Attempt to fetch exact browser current location on launch
  useEffect(() => {
    triggerToast("Fetching your real-time GPS location...", "info");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickup(userCoords);
          setPickupAddress("My Current GPS Coordinate");
          triggerToast("Exact position fetched successfully!", "success");
        },
        (err) => {
          console.warn("Geolocation blocked or failed. Loading Bangalore HQ presets.", err);
          // Standard highly polished Bangalore coordinates (UB City Mall center)
          setPickup({ lat: 12.9716, lng: 77.5958 });
          setPickupAddress("UB City Mall, Vittal Mallya Road, Bangalore");
          triggerToast("Loaded Bangalore Elite Hub location.", "info");
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Wait countdown clock decrement automatically after 2 minutes (120 seconds)
  useEffect(() => {
    if (pickupWaitCountdown === null) return;
    if (pickupWaitCountdown <= 0) {
      setPickupWaitCountdown(null);
      handleBeginTrip();
      return;
    }

    const timer = setTimeout(() => {
      setPickupWaitCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [pickupWaitCountdown]);

  // Sync saved place selections from Drawer side-panel shortcut
  const handleSelectSavedPlace = (place: { name: string; address: string; lat: number; lng: number }, type: "pickup" | "dropoff") => {
    const coords = { lat: place.lat, lng: place.lng };
    if (type === "pickup") {
      setPickup(coords);
      setPickupAddress(place.address);
      triggerToast(`Selected Pickup: ${place.name}`, "info");
    } else {
      setDropoff(coords);
      setDropoffAddress(place.address);
      triggerToast(`Selected Dropoff: ${place.name}`, "info");
    }
    setSideMenuOpen(false);
  };

  // Apply Coupon discount
  const handleApplyPromo = (code: string) => {
    if (code === "FIRST") {
      setAppliedPromo({ code, discount: 0.15 });
      triggerToast("Coupon approved: 15% VIP discount applied!", "success");
    } else if (code === "UBER10") {
      setAppliedPromo({ code, discount: 0.10 });
      triggerToast("Coupon approved: 10% discount applied!", "success");
    }
  };

  // Confirm booking step -> trigger search state radar
  const handleConfirmBooking = (
    ride: RideOption, 
    pAddress: string, 
    dAddress: string, 
    distanceKm: number, 
    etaMin: number, 
    priceFinal: number
  ) => {
    setActiveVehicleType(ride);
    setPickupAddress(pAddress || "Pickup Ground Station");
    setDropoffAddress(dAddress || "Dropoff Terminus");
    
    setBookedStats({
      pickupStr: pAddress || "Custom Address",
      dropoffStr: dAddress || "Custom Destination",
      distanceKm,
      etaMin,
      priceFinal
    });

    setTripStatus("finding_driver");
    triggerToast(`Searching nearby ${ride.name} pilots...`, "info");

    // Hold radar 3 seconds, then assign random crew
    setTimeout(() => {
      const assigned = getRandomDriver(ride.name);
      setAssignedDriver(assigned);
      setTripStatus("driver_en_route");
      triggerToast(`Pilot ${assigned.name} assigned! Arriving in ${ride.etaMinutes} mins.`, "success");
    }, 3200);
  };

  // Skip en route -> Start trip
  const handleBeginTrip = () => {
    setPickupWaitCountdown(null);
    setTripStatus("trip_in_progress");
    triggerToast("Trip started. Cruising securely...", "success");
  };

  // Complete Trip -> receipt
  const handleCompleteTrip = () => {
    setPickupWaitCountdown(null);
    setTripStatus("trip_complete");
    triggerToast(`Arrived safely! Total charge applied. Thank you.`, "success");

    // Add trip to side menu history log
    if (bookedStats && activeVehicleType) {
      const newLog: TripHistory = {
        id: `t_user_${Date.now()}`,
        date: "Today, Just Now",
        pickup: bookedStats.pickupStr.split(",")[0],
        dropoff: bookedStats.dropoffStr.split(",")[0],
        price: bookedStats.priceFinal,
        rideType: activeVehicleType.name,
        status: "Completed"
      };
      setTripHistory((prev) => [newLog, ...prev]);
    }
  };

  // Cancel ride during any phase back to idle
  const handleCancelRide = () => {
    setPickupWaitCountdown(null);
    setTripStatus("idle");
    setAssignedDriver(null);
    setActiveVehicleType(null);
    setBookedStats(null);
    triggerToast("Booking request cancelled successfully.", "warning");
  };

  const handleResetAll = () => {
    setPickupWaitCountdown(null);
    setTripStatus("idle");
    setAssignedDriver(null);
    setActiveVehicleType(null);
    setBookedStats(null);
    setDropoff(null);
    setDropoffAddress("");
    setStops([]);
    setIsInterstateMode(false);
    setProgressPercent(0);
    setActiveLeg(null);
  };

  const handleArrivedAtPickup = () => {
    setPickupWaitCountdown(120); // 120 seconds countdown
    triggerToast("Driver has arrived! 2 minute waiting period started.", "success");
    playSubtleArrivalPing();
  };

  const handleArrivedAtDestination = () => {
    playSubtleArrivalPing();
    handleCompleteTrip();
  };

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-sans select-none flex">
      
      {/* 1. LEFT UTILITY COLUMN: STORES PRIMARY CONTROLS (Locks layout, doesn't crowd map viewport) */}
      <div 
        id="control-sidebar-rail"
        className={`fixed md:relative bottom-0 left-0 right-0 z-[110] w-full md:w-[420px] md:max-w-[420px] bg-zinc-950 border-t md:border-t-0 md:border-r border-zinc-900 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] md:shadow-2xl flex flex-col shrink-0 transition-all duration-300 ease-in-out
          ${isMobileCollapsed ? "h-[76px] md:h-full overflow-hidden" : "h-[72vh] md:h-full"}
        `}
      >
        {/* Mobile Pull / Expand notch indicator */}
        <div 
          onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
          className="flex md:hidden items-center justify-center p-2 cursor-pointer bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-950 transition border-b border-zinc-900 shrink-0"
        >
          <div className={`w-12 h-1.5 rounded-full transition-colors ${isMobileCollapsed ? "bg-amber-500 animate-pulse" : "bg-zinc-800"}`} />
          <span className="text-[9px] text-zinc-600 font-mono uppercase ml-2 select-none tracking-widest block md:hidden">
            {isMobileCollapsed ? "Tap to Expand Controls" : "Tap to Shrink Controls"}
          </span>
        </div>
        {/* Elite Brand Header */}
        <header className="p-4 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSideMenuOpen(true)}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-amber-500 transition border border-zinc-850 active:scale-95"
              aria-label="Open side panel menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent italic">
                UBER ELITE
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Select Transit Services</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-amber-500 text-xs font-mono font-bold flex items-center gap-1 bg-zinc-90 w/20 py-1 px-2 rounded-lg border border-zinc-850">
              <Clock className="w-3.5 h-3.5" /> UTC 2026
            </div>
          </div>
        </header>

        {/* Primary Interactive Panels & Forms */}
        <div className="flex-1 overflow-y-auto bg-zinc-950">
          {(tripStatus === "idle" || tripStatus === "finding_driver" || tripStatus === "trip_complete") ? (
            <BookingPanel 
              onConfirmBooking={handleConfirmBooking}
              tripStatus={tripStatus}
              activeVehicleType={activeVehicleType}
              onCancelRide={handleCancelRide}
              pickupCoords={pickup}
              dropoffCoords={dropoff}
              setPickup={(coords, addr) => { setPickup(coords); setPickupAddress(addr); }}
              setDropoff={(coords, addr) => { setDropoff(coords); setDropoffAddress(addr); }}
              appliedPromo={appliedPromo}
              onApplyPromo={handleApplyPromo}
              onBeginTrip={handleBeginTrip}
              onResetAll={handleResetAll}
              onActiveInputTypeChange={setActiveInputType}
              stops={stops}
              setStops={setStops}
              isInterstateMode={isInterstateMode}
              setIsInterstateMode={setIsInterstateMode}
            />
          ) : (
            assignedDriver && (
              <div className="p-5 space-y-4">
                <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-850 text-xs space-y-2">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">RESERVED ROUTE TRACE</span>
                  <div className="font-semibold divide-y divide-zinc-850/50">
                    <p className="py-1.5 text-zinc-300"><span className="text-emerald-500 font-bold font-mono text-[10px] mr-1">●</span> {pickupAddress}</p>
                    <p className="py-1.5 text-zinc-300"><span className="text-amber-500 font-bold font-mono text-[10px] mr-1">■</span> {dropoffAddress}</p>
                  </div>
                </div>

                <DriverCard 
                  driver={assignedDriver}
                  activeVehicleType={activeVehicleType}
                  tripStatus={tripStatus}
                  speed={speed}
                  distanceRemainingKm={distanceRemaining}
                  etaSeconds={etaSeconds}
                  currentSignalState={currentSignalState}
                  followDriver={followDriver}
                  onToggleFollowDriver={() => setFollowDriver(!followDriver)}
                  onCancel={handleCancelRide}
                  onBeginTrip={handleBeginTrip}
                  onCompleteTrip={handleCompleteTrip}
                  pickupWaitCountdown={pickupWaitCountdown}
                />
              </div>
            )
          )}
        </div>

        {/* VIP Member Footer Card */}
        <footer className="p-4 bg-zinc-950 border-t border-zinc-900 text-center text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <span>VIP Secure Console</span>
          </div>
          <span className="font-mono text-zinc-750">VIP CONSOLE HQ</span>
        </footer>
      </div>

      {/* 2. MAP VIEWPORT: Sits on the right and fills remaining screen space completely */}
      <div className="flex-1 h-full relative z-10 bg-zinc-900">
        <MapContainer 
          pickup={pickup}
          dropoff={dropoff}
          stops={stops}
          isInterstateMode={isInterstateMode}
          driverLoc={null}
          tripStatus={tripStatus}
          activeVehicleType={activeVehicleType}
          followDriver={followDriver}
          onSelectCoordinates={(coords, type) => {
            if (type === "pickup") {
              setPickup(coords);
              setPickupAddress(`Map Location Set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
              triggerToast("Pickup coordinates set via map!", "info");
            } else {
              setDropoff(coords);
              setDropoffAddress(`Map Location Set (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
              triggerToast("Dropoff coordinates set via map!", "info");
            }
          }}
          onSimulationUpdate={(stats) => {
            setSpeed(stats.speed);
            setDistanceRemaining(stats.distanceRemainingKm);
            setEtaSeconds(stats.etaSeconds);
            setCurrentSignalState(stats.currentSignalState);
            setActiveSignal(stats.activeSignal || null);
            if (stats.progressPercent !== undefined) {
              setProgressPercent(stats.progressPercent);
            }
            if (stats.interstateLeg !== undefined) {
              setActiveLeg(stats.interstateLeg);
            }
          }}
          isJetMode={activeVehicleType?.isJet || false}
          onArrivedAtPickup={handleArrivedAtPickup}
          onArrivedAtDestination={handleArrivedAtDestination}
          clickToSetTypeOverride={activeInputType}
        />

         {/* PREMIUM REAL-TIME WEATHER HUD CARD */}
        <div 
          id="premium-weather-card"
          className="absolute top-[72px] md:top-4 left-4 z-[998] pointer-events-auto font-sans select-none"
        >
          <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-2xl shadow-xl backdrop-blur-md text-white flex flex-col gap-1.5 w-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono font-bold tracking-widest text-zinc-500 uppercase">LOCAL WEATHER</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl shrink-0">{getWeatherIcon(pickup)}</span>
              <div className="truncate">
                <p className="text-sm font-black tracking-tight leading-none">{getWeatherTemp(pickup)}°C</p>
                <p className="text-[9px] font-semibold text-zinc-400 capitalize truncate mt-1">{getWeatherCond(pickup)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 border-t border-zinc-900 pt-1.5 mt-0.5">
              <span>🌦️ Hum: 62%</span>
              <span>💨 8km/h</span>
            </div>
          </div>
        </div>

        {/* HUD Dashboard Overlay: Traffic Signal Wait-Time & Telemetry HUD */}
        {tripStatus !== "idle" && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[999] flex flex-col items-center gap-2 pointer-events-none">
            {activeSignal ? (
              <div className="bg-zinc-950/95 border border-zinc-800 py-2.5 px-4 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3.5 pointer-events-auto">
                {/* Traffic lights loop */}
                <div className="flex gap-1.5 bg-zinc-900/80 p-1 rounded-full border border-zinc-800 shrink-0">
                  <div className={`w-3 h-3 rounded-full shadow-md transition ${activeSignal.state === "RED" ? "bg-red-500 shadow-red-500/50 scale-110" : "bg-red-950"}`} />
                  <div className={`w-3 h-3 rounded-full shadow-md transition ${activeSignal.state === "YELLOW" ? "bg-amber-400 shadow-amber-400/50 scale-110" : "bg-amber-950"}`} />
                  <div className={`w-3 h-3 rounded-full shadow-md transition ${activeSignal.state === "GREEN" ? "bg-emerald-500 shadow-emerald-500/50 scale-110" : "bg-emerald-950"}`} />
                </div>
                
                <div className="text-left shrink-0">
                  <span className="text-[9px] font-extrabold text-zinc-500 uppercase font-mono tracking-wider block leading-none">Traffic Signal State</span>
                  <p className="text-xs font-black text-white mt-0.5">
                    Light is <span className={
                      activeSignal.state === "RED" ? "text-red-500 animate-pulse" :
                      activeSignal.state === "YELLOW" ? "text-amber-400" :
                      "text-emerald-400"
                    }>
                      {activeSignal.state} {activeSignal.state === "RED" ? `(Hold: ${activeSignal.timer}s)` : `(${activeSignal.timer}s)`}
                    </span>
                  </p>
                </div>

                {activeSignal.state === "RED" && (
                  <span className="text-[9px] bg-red-500/10 text-red-400 font-mono border border-red-500/20 px-2 py-0.5 rounded-md animate-pulse">
                    Stopped
                  </span>
                )}
              </div>
            ) : (
              <div className="bg-zinc-950/90 border border-zinc-900 py-1.5 px-3 rounded-full shadow-xl backdrop-blur-md pointer-events-auto flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Cruising clear • Speed: {Math.round(speed)} km/h</span>
              </div>
            )}
          </div>
        )}

        {/* Active tracking widget overlaying map top for status indicator check */}
        {tripStatus !== "idle" && activeVehicleType && (
          <div className="absolute top-4 right-16 z-[999] bg-zinc-950/95 border border-zinc-850 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs flex gap-3 text-white font-sans">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">
                {activeVehicleType.isJet ? "🛩️" : activeVehicleType.name === RideClass.UBER_AUTO ? "🛺" : "🚗"}
              </span>
              <div>
                <p className="font-extrabold text-[11px] text-amber-500 font-mono uppercase tracking-wider">{activeVehicleType.name}</p>
                <div className="flex gap-2 text-[10px] text-zinc-400 mt-0.5">
                  <span>₹{bookedStats?.priceFinal} total</span>
                  <span>•</span>
                  <span>{bookedStats?.distanceKm} km</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Glowing Ride Progress Bar HUD overlay */}
        {tripStatus !== "idle" && bookedStats && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[999] w-[90%] max-w-[480px] pointer-events-auto font-sans select-none">
            <div className="bg-zinc-950/95 border border-zinc-800 p-4 rounded-2xl shadow-2xl backdrop-blur-md text-white flex flex-col gap-3">
              {/* Node Labels */}
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                <span className="truncate max-w-[130px] font-bold text-emerald-400">● {bookedStats.pickupStr.split(",")[0]}</span>
                
                {isInterstateMode ? (
                  <span className="text-amber-400 font-extrabold animate-pulse uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[9px]">
                    {activeLeg === "car_to_station" ? "🚕 Driver ➔ Station Leg" : 
                     activeLeg === "train_interstate" ? "🚆 Interstate Fast Rail" :
                     "🚗 Terminal Custom Luxury Car"}
                  </span>
                ) : stops.length > 0 ? (
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[9px]">
                    Via {stops.length} Premium Stop{stops.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-zinc-500 font-medium">In Transit</span>
                )}

                <span className="truncate max-w-[130px] font-bold text-red-500">■ {bookedStats.dropoffStr.split(",")[0]}</span>
              </div>

              {/* Graphical progress line */}
              <div className="relative w-full h-2 bg-zinc-900 rounded-full my-1">
                {/* Active progress fill */}
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
                
                {/* Micro avatar or car emoji shifting over progress bar */}
                <div 
                  className="absolute -top-2 flex items-center justify-center text-xs transition-all duration-350 bg-zinc-950 rounded-full p-1 border border-zinc-800 shadow-md w-6 h-6"
                  style={{ left: `calc(${progressPercent}% - 12px)` }}
                >
                  {isInterstateMode ? (
                    activeLeg === "train_interstate" ? "🚆" : "🚗"
                  ) : activeVehicleType?.isJet ? (
                    "🛩️"
                  ) : activeVehicleType?.name === RideClass.UBER_AUTO ? (
                    "🛺"
                  ) : activeVehicleType?.name === RideClass.UBER_MOTO ? (
                    "🏍️"
                  ) : (
                    "🚗"
                  )}
                </div>

                {/* Statically positioned Waypoint Stop dots */}
                {!isInterstateMode && stops.map((stop, sIdx) => {
                  const stopPercent = ((sIdx + 1) / (stops.length + 1)) * 100;
                  return (
                    <div 
                      key={stop.id}
                      className="absolute -top-1 w-4 h-4 rounded-full bg-zinc-950 border-2 border-amber-500 flex items-center justify-center text-[8px] font-black text-amber-500 shadow-lg"
                      style={{ left: `${stopPercent}%`, transform: 'translateX(-50%)' }}
                      title={stop.name}
                    >
                      {sIdx + 1}
                    </div>
                  );
                })}
              </div>

              {/* Progress metrics and details */}
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-t border-zinc-900/60 pt-2.5">
                <span className="flex items-center gap-1">Speed: <strong className="text-zinc-200">{Math.round(speed)} km/h</strong></span>
                <span className="flex items-center gap-1">Distance Left: <strong className="text-zinc-200">{distanceRemaining.toFixed(1)} km</strong></span>
                <span className="flex items-center gap-1">Est: <strong className="text-zinc-200">
                  {etaSeconds > 60 ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` : `${etaSeconds}s`}
                </strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. FLOATING COMPREHENSIVE TOAST ALERTS */}
      {toast && (
        <div 
          role="alert"
          id="system-notification-toast"
          className={`fixed bottom-4 right-4 z-[20000] px-4.5 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold font-sans animate-bounce max-w-sm ${
            toast.type === "success" 
              ? "bg-zinc-950/95 border-emerald-500/50 text-emerald-400" 
              : toast.type === "warning"
              ? "bg-zinc-950/95 border-rose-500/50 text-rose-400"
              : "bg-zinc-950/95 border-sky-500/50 text-sky-400"
          }`}
        >
          <div className="flex items-center justify-between gap-4 w-full">
            <span>🚀 {toast.msg}</span>
            <button onClick={() => setToast(null)} className="hover:opacity-80 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. SLIDE OUT COMPREHENSIVE DRAWER PANELS */}
      <SideMenu 
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
        onSelectSavedPlace={handleSelectSavedPlace}
        tripHistory={tripHistory}
        promoCodes={[
          { code: "FIRST", discount: 0.15, description: "15% off first ride" },
          { code: "UBER10", discount: 0.10, description: "10% off anytime ride" }
        ]}
        onApplyPromo={handleApplyPromo}
        isJetMode={activeVehicleType?.isJet || false}
      />
    </div>
  );
}
