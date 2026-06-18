import React, { useState, useEffect, useRef } from "react";
import { 
  Search, MapPin, Navigation, Calendar, Users, Percent, Sparkles, 
  HelpCircle, AlertTriangle, Route, Clock, ChevronDown, Check, DollarSign, X, ArrowRight
} from "lucide-react";
import { Coordinates, RideClass, RideOption, RouteStop } from "../types";
import { RIDE_OPTIONS, MOCK_SAVED_PLACES, INDIA_STATE_STATIONS } from "../utils/mockData";

interface BookingPanelProps {
  onConfirmBooking: (ride: RideOption, pickupStr: string, dropoffStr: string, distanceKm: number, etaMin: number, priceFinal: number) => void;
  tripStatus: "idle" | "finding_driver" | "driver_en_route" | "trip_in_progress" | "trip_complete";
  activeVehicleType: RideOption | null;
  onCancelRide: () => void;
  pickupCoords: Coordinates | null;
  dropoffCoords: Coordinates | null;
  setPickup: (coords: Coordinates | null, address: string) => void;
  setDropoff: (coords: Coordinates | null, address: string) => void;
  appliedPromo: { code: string; discount: number } | null;
  onApplyPromo: (code: string) => void;
  onBeginTrip: () => void; // move from arriving to in-progress
  onResetAll: () => void;
  onActiveInputTypeChange?: (type: "pickup" | "dropoff" | null) => void;
  stops?: RouteStop[];
  setStops?: React.Dispatch<React.SetStateAction<RouteStop[]>>;
  isInterstateMode?: boolean;
  setIsInterstateMode?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function BookingPanel({
  onConfirmBooking,
  tripStatus,
  activeVehicleType,
  onCancelRide,
  pickupCoords,
  dropoffCoords,
  setPickup,
  setDropoff,
  appliedPromo,
  onApplyPromo,
  onBeginTrip,
  onResetAll,
  onActiveInputTypeChange,
  stops = [],
  setStops = () => {},
  isInterstateMode = false,
  setIsInterstateMode = () => {}
}: BookingPanelProps) {
  // Input fields
  const [pickupInput, setPickupInput] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  
  // All India state-to-state train routing selection indices
  const [originStateIdx, setOriginStateIdx] = useState(2); // Karnataka default
  const [destStateIdx, setDestStateIdx] = useState(3); // Tamil Nadu default

  const triggerStateTransitCoords = (oIdx: number, dIdx: number) => {
    const orig = INDIA_STATE_STATIONS[oIdx];
    const dest = INDIA_STATE_STATIONS[dIdx];
    if (orig && dest) {
      setPickup({ lat: orig.lat, lng: orig.lng }, `${orig.poiName}, ${orig.city}, ${orig.state}`);
      setPickupInput(`${orig.poiName}, ${orig.city}, ${orig.state}`);
      setDropoff({ lat: dest.lat, lng: dest.lng }, `${dest.poiName}, ${dest.city}, ${dest.state}`);
      setDropoffInput(`${dest.poiName}, ${dest.city}, ${dest.state}`);
      setStops([]);
    }
  };
  
  // Autocomplete UI
  const [pickupSuggs, setPickupSuggs] = useState<any[]>([]);
  const [dropoffSuggs, setDropoffSuggs] = useState<any[]>([]);
  const [activeInput, setActiveInput] = useState<"pickup" | "dropoff" | null>(null);
  
  // States of search
  const [distance, setDistance] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [searchingRoute, setSearchingRoute] = useState(false);
  const [selectedRide, setSelectedRide] = useState<RideOption>(RIDE_OPTIONS[0]);

  // Premium features
  const [surgeActive, setSurgeActive] = useState(false);
  const [surgeSeverity, setSurgeSeverity] = useState(1); // 1 to 5 index
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoError, setPromoError] = useState("");

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stopover search & autocomplete helpers
  const [stopInput, setStopInput] = useState("");
  const [stopSuggs, setStopSuggs] = useState<any[]>([]);
  const [showAddStopForm, setShowAddStopForm] = useState(false);

  const handleStopQueryChange = (val: string) => {
    setStopInput(val);
    if (val.trim().length < 3) {
      setStopSuggs([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const localMatches = MOCK_SAVED_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(val.toLowerCase()) ||
          p.address.toLowerCase().includes(val.toLowerCase())
      );

      try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&viewbox=77.3,13.2,77.9,12.7&bounded=1&q=${encodeURIComponent(val + " Bangalore")}`;
        if (pickupCoords) {
          const minLat = pickupCoords.lat - 1.5;
          const maxLat = pickupCoords.lat + 1.5;
          const minLng = pickupCoords.lng - 1.5;
          const maxLng = pickupCoords.lng + 1.5;
          url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&viewbox=${minLng},${maxLat},${maxLng},${minLat}&q=${encodeURIComponent(val)}`;
        }

        const response = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await response.json();

        const formattedResults = data.map((item: any) => ({
          name: item.name || item.display_name.split(",")[0],
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));

        const combined = [...localMatches];
        formattedResults.forEach((fr: any) => {
          if (!combined.some((c) => Math.abs(c.lat - fr.lat) < 0.001 && Math.abs(c.lng - fr.lng) < 0.001)) {
            combined.push(fr);
          }
        });

        setStopSuggs(combined);
      } catch (err) {
        setStopSuggs(localMatches);
      }
    }, 400);
  };

  // Load parent selected coordinates to inputs
  useEffect(() => {
    if (pickupCoords) {
      // check if it matches an Indian state station POI or station
      const matchedStation = INDIA_STATE_STATIONS.find(
        (s) => Math.abs(s.lat - pickupCoords.lat) < 0.05 && Math.abs(s.lng - pickupCoords.lng) < 0.05
      );
      if (matchedStation) {
        setPickupInput(`${matchedStation.poiName}, ${matchedStation.city}, ${matchedStation.state}`);
        return;
      }

      // reverse lookup or match mock
      const matched = MOCK_SAVED_PLACES.find(
        (p) => Math.abs(p.lat - pickupCoords.lat) < 0.001 && Math.abs(p.lng - pickupCoords.lng) < 0.001
      );
      if (matched) {
        setPickupInput(matched.address);
      } else {
        setPickupInput(`GPS Location (${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)})`);
      }
    }
  }, [pickupCoords]);

  useEffect(() => {
    if (dropoffCoords) {
      // check if it matches an Indian state station POI or station
      const matchedStation = INDIA_STATE_STATIONS.find(
        (s) => Math.abs(s.lat - dropoffCoords.lat) < 0.05 && Math.abs(s.lng - dropoffCoords.lng) < 0.05
      );
      if (matchedStation) {
        setDropoffInput(`${matchedStation.poiName}, ${matchedStation.city}, ${matchedStation.state}`);
        return;
      }

      const matched = MOCK_SAVED_PLACES.find(
        (p) => Math.abs(p.lat - dropoffCoords.lat) < 0.001 && Math.abs(p.lng - dropoffCoords.lng) < 0.001
      );
      if (matched) {
        setDropoffInput(matched.address);
      } else {
        setDropoffInput(`GPS Location (${dropoffCoords.lat.toFixed(4)}, ${dropoffCoords.lng.toFixed(4)})`);
      }
    }
  }, [dropoffCoords]);

  // Compute travel path statistics once both points are inputed
  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) {
      setDistance(null);
      setDurationMin(null);
      return;
    }

    calculateRouteStats();
  }, [pickupCoords, dropoffCoords, stops, isInterstateMode]);

  const calculateRouteStats = async () => {
    setSearchingRoute(true);
    
    if (isInterstateMode) {
      // Direct inter-state travel distance and super-fast VIP rail travel time specs
      setTimeout(() => {
        setDistance(348.5);
        setDurationMin(210); // 3.5 hours via high-speed inter-state express chain
        setSearchingRoute(false);
        setSurgeActive(false);
      }, 500);
      return;
    }

    const R = 6371; // Earth radius in km
    const waypoints = [pickupCoords, ...stops.map(s => ({ lat: s.lat, lng: s.lng })), dropoffCoords];
    let totalRawDistance = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      if (p1 && p2) {
        const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
        const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((p1.lat * Math.PI) / 180) *
            Math.cos((p2.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalRawDistance += R * c;
      }
    }

    // Road distance has additional wiggles. Add 25% bias
    const roadDist = parseFloat((totalRawDistance * 1.25).toFixed(1));
    const etaMin = Math.round(roadDist * 2.1 + 4);

    setTimeout(() => {
      setDistance(roadDist);
      setDurationMin(etaMin);
      setSearchingRoute(false);

      // Trigger standard 10% surge rate check
      const runSurge = Math.random() < 0.15;
      setSurgeActive(runSurge);
      if (runSurge) {
        setSurgeSeverity(Math.floor(2 + Math.random() * 4));
      }
    }, 600);
  };

  // Live Suggestion Querying with fuzzy mock list fallback
  const handleQueryChange = (val: string, type: "pickup" | "dropoff") => {
    if (type === "pickup") {
      setPickupInput(val);
    } else {
      setDropoffInput(val);
    }

    setActiveInput(type);
    if (onActiveInputTypeChange) {
      onActiveInputTypeChange(type);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 3) {
      if (type === "pickup") setPickupSuggs([]);
      else setDropoffSuggs([]);
      return;
    }

    // Debounce 400ms geocoding fetch
    debounceTimerRef.current = setTimeout(async () => {
      // 1. Check local Bangalore matches first for zero-latency lookups
      const localMatches = MOCK_SAVED_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(val.toLowerCase()) ||
          p.address.toLowerCase().includes(val.toLowerCase())
      );

      // 2. Fetch Nominatim OpenStreetMap search in parallel, with GPS coordinate viewbox bias if available
      try {
        let url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(val)}`;
        
        if (pickupCoords) {
          // Establish broad bounds of ±1.5 degrees surrounding the active pickup coordinate point
          const minLat = pickupCoords.lat - 1.5;
          const maxLat = pickupCoords.lat + 1.5;
          const minLng = pickupCoords.lng - 1.5;
          const maxLng = pickupCoords.lng + 1.5;
          url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&viewbox=${minLng},${maxLat},${maxLng},${minLat}&q=${encodeURIComponent(val)}`;
        } else {
          // Default focused constraints for Bangalore
          url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&viewbox=77.3,13.2,77.9,12.7&bounded=1&q=${encodeURIComponent(val + " Bangalore")}`;
        }

        const response = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await response.json();

        const formattedResults = data.map((item: any) => ({
          name: item.name || item.display_name.split(",")[0],
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));

        // Combine local fast presets and actual georesults (dedup by coordinates)
        const combined = [...localMatches];
        formattedResults.forEach((fr: any) => {
          if (!combined.some((c) => Math.abs(c.lat - fr.lat) < 0.001 && Math.abs(c.lng - fr.lng) < 0.001)) {
            combined.push(fr);
          }
        });

        if (type === "pickup") setPickupSuggs(combined);
        else setDropoffSuggs(combined);
      } catch (err) {
        // Fallback exclusively to mock matches if network fails or Nominatim rate-limits
        if (type === "pickup") setPickupSuggs(localMatches);
        else setDropoffSuggs(localMatches);
      }
    }, 400);
  };

  // Handle Sugestion Tap
  const selectSuggestion = (sugg: any, type: "pickup" | "dropoff") => {
    if (type === "pickup") {
      setPickup(sugg, sugg.address);
      setPickupInput(sugg.address);
      setPickupSuggs([]);
    } else {
      setDropoff(sugg, sugg.address);
      setDropoffInput(sugg.address);
      setDropoffSuggs([]);
    }
    setActiveInput(null);
    if (onActiveInputTypeChange) {
      onActiveInputTypeChange(null);
    }
  };

  // Apply Coupon promo discount coupon code
  const handlePromoApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = promoCodeInput.trim().toUpperCase();
    if (formatted === "UBER10" || formatted === "FIRST") {
      onApplyPromo(formatted);
      setPromoCodeInput("");
      setPromoError("");
    } else {
      setPromoError("Promo invalid. Try FIRST (15%)");
    }
  };

  // Price Calculation relative to active metrics
  const getRidePrice = (option: RideOption) => {
    if (!distance) return option.basePrice;
    
    // Core fare computation formula
    const surgeMultiplier = surgeActive ? (1 + surgeSeverity * 0.1) : 1;
    const promoDiscount = appliedPromo ? (1 - appliedPromo.discount) : 1;
    
    const calculated = (option.basePrice + (distance * 22 * option.multiplier)) * surgeMultiplier * promoDiscount;
    return Math.max(Math.round(calculated), 45); // minimum limit 45 Rupees
  };

  return (
    <div 
      id="booking-flow-card"
      className="p-5 flex flex-col gap-4 text-white"
    >
      {/* 1. SELECTION & LOCATION ADDRESS PANEL (IDLE PANEL STATE) */}
      {tripStatus === "idle" && (
        <>
          <div className="flex flex-col gap-3.5 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
            {/* Pickup Input field */}
            <div className="relative">
              <span className="absolute left-3 top-3.5 w-3.5 h-3.5 rounded-full border border-emerald-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </span>
              <input 
                type="text" 
                placeholder="Where to pick up?"
                value={pickupInput}
                onChange={(e) => handleQueryChange(e.target.value, "pickup")}
                onFocus={() => setActiveInput("pickup")}
                className="w-full text-sm bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-9 py-3 focus:outline-none focus:border-emerald-500 text-zinc-100 placeholder-zinc-500"
              />
              {pickupInput && (
                <button 
                  onClick={() => { setPickupInput(""); setPickupSuggs([]); setPickup(null, ""); }}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Pickup Suggestions dropdown list */}
              {activeInput === "pickup" && pickupInput.trim().length >= 3 && (
                <div className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-[180px] overflow-y-auto">
                  <button
                    key="custom-pickup-typed"
                    onClick={() => selectSuggestion({
                      name: pickupInput,
                      address: pickupInput + " (Manual Location)",
                      lat: pickupCoords ? pickupCoords.lat : 12.9716,
                      lng: pickupCoords ? pickupCoords.lng : 77.5946,
                    }, "pickup")}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-900 border-b border-zinc-900/40 flex items-center gap-2 bg-zinc-950 text-emerald-400 group"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition" />
                    <div>
                      <p className="font-bold">Use Typed Address</p>
                      <p className="text-zinc-400 text-[10px] truncate">{pickupInput}</p>
                    </div>
                  </button>

                  {pickupSuggs.map((s) => (
                    <button
                      key={s.address}
                      onClick={() => selectSuggestion(s, "pickup")}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-900 border-b border-zinc-900/40 flex items-center gap-2 text-zinc-300"
                    >
                      <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-bold text-zinc-200">{s.name}</p>
                        <p className="text-zinc-500 text-[10px] truncate">{s.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Path connector line illustration */}
            <div className="h-[2px] bg-zinc-850/60 mx-10"></div>

            {/* Dropoff Input field */}
            <div className="relative">
              <span className="absolute left-3 top-3.5 w-3.5 h-3.5 rounded-full border border-amber-500 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              </span>
              <input 
                type="text" 
                placeholder="Search drop destination?"
                value={dropoffInput}
                onChange={(e) => handleQueryChange(e.target.value, "dropoff")}
                onFocus={() => {
                  setActiveInput("dropoff");
                  if (onActiveInputTypeChange) onActiveInputTypeChange("dropoff");
                }}
                className="w-full text-sm bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-9 py-3 focus:outline-none focus:border-amber-500 text-zinc-100 placeholder-zinc-500"
              />
              {dropoffInput && (
                <button 
                  onClick={() => { setDropoffInput(""); setDropoffSuggs([]); setDropoff(null, ""); }}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Dropoff Suggestions dropdown list */}
              {activeInput === "dropoff" && dropoffInput.trim().length >= 3 && (
                <div className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-[180px] overflow-y-auto w-full">
                  <button
                    key="custom-dropoff-typed"
                    onClick={() => selectSuggestion({
                      name: dropoffInput,
                      address: dropoffInput + " (Manual Location)",
                      lat: pickupCoords ? (pickupCoords.lat + (Math.random() - 0.5) * 0.04) : 12.9816,
                      lng: pickupCoords ? (pickupCoords.lng + (Math.random() - 0.5) * 0.04) : 77.6046,
                    }, "dropoff")}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-900 border-b border-zinc-900/40 flex items-center gap-2 bg-zinc-950 text-amber-400 group"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition" />
                    <div>
                      <p className="font-bold">Use Typed Address</p>
                      <p className="text-zinc-400 text-[10px] truncate">{dropoffInput}</p>
                    </div>
                  </button>

                  {dropoffSuggs.map((s) => (
                    <button
                      key={s.address + "_drop"}
                      onClick={() => selectSuggestion(s, "dropoff")}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-900 border-b border-zinc-900/40 flex items-center gap-2 text-zinc-300"
                    >
                      <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-bold text-zinc-200">{s.name}</p>
                        <p className="text-zinc-500 text-[10px] truncate">{s.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MULTI-STOP ROUTE MANAGER PANEL */}
          <div className="flex flex-col gap-2.5 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80 -mt-1 font-sans">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase font-mono tracking-widest text-zinc-400">Intermediate Stops ({stops.length})</span>
              <button 
                type="button"
                onClick={() => {
                  setShowAddStopForm(!showAddStopForm);
                  setStopInput("");
                  setStopSuggs([]);
                }}
                className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 py-1 px-2.5 rounded-lg transition"
              >
                <span>{showAddStopForm ? "Cancel Stop" : "+ Add Stopover"}</span>
              </button>
            </div>

            {/* List of active Stops */}
            {stops.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {stops.map((stop, sIdx) => (
                  <div key={stop.id} className="flex items-center justify-between bg-zinc-950/80 border border-zinc-900 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-md bg-zinc-900 text-[10px] font-black font-mono text-amber-500 flex items-center justify-center border border-zinc-800 shrink-0">
                        {sIdx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-zinc-300 truncate">{stop.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{stop.address}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setStops(stops.filter(s => s.id !== stop.id))}
                      className="text-zinc-500 hover:text-rose-500 p-1 rounded-lg hover:bg-zinc-900/80 shrink-0 transition"
                      title="Remove stop"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form to select and add a Stop */}
            {showAddStopForm && (
              <div className="relative mt-1">
                <span className="absolute left-3 top-3.5 w-3.5 h-3.5 rounded-full border border-amber-400 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-450"></span>
                </span>
                <input 
                  type="text" 
                  placeholder="Where is the stopover?"
                  value={stopInput}
                  onChange={(e) => handleStopQueryChange(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:border-amber-500 text-zinc-100 placeholder-zinc-500 font-sans"
                />
                
                {/* Autocomplete suggestions for Stopover */}
                {stopInput.trim().length >= 3 && stopSuggs.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-[9999] overflow-hidden max-h-[160px] overflow-y-auto w-full">
                    {stopSuggs.map((s, idx) => (
                      <button
                        key={s.address + "_stop_" + idx}
                        type="button"
                        onClick={() => {
                          const newStop: RouteStop = {
                            id: Math.random().toString(36).substring(3),
                            name: s.name,
                            lat: s.lat,
                            lng: s.lng,
                            address: s.address
                          };
                          setStops([...stops, newStop]);
                          setStopInput("");
                          setStopSuggs([]);
                          setShowAddStopForm(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-900 border-b border-zinc-900/40 flex items-center gap-2 text-zinc-300"
                      >
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="font-bold text-zinc-200">{s.name}</p>
                          <p className="text-zinc-500 text-[9px] truncate">{s.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ULTRA PREMIUM INTERSTATE MULTIMODAL VIP TRANSIT TOGGLE */}
          <div className="bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-zinc-900/40 border-2 border-amber-500/30 p-4 rounded-2xl shadow-xl backdrop-blur-md flex flex-col gap-3 font-sans select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <div>
                  <span className="text-[10px] font-extrabold text-amber-450 uppercase font-mono tracking-wider block">ULTRA-PREMIUM VIP INTERSTATE</span>
                  <p className="text-xs font-black text-white mt-0.5">Inter-State Multi-modal Transit Chain</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetState = !isInterstateMode;
                  setIsInterstateMode(targetState);
                  if (targetState) {
                    triggerStateTransitCoords(originStateIdx, destStateIdx);
                  } else {
                    setPickup(null, "");
                    setPickupInput("");
                    setDropoff(null, "");
                    setDropoffInput("");
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isInterstateMode ? "bg-amber-500" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isInterstateMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              If your drop destination is interstate, board a synchronized Bullet Train chain from Bengaluru. We handle all transfers with chauffeur coordination.
            </p>
            
            {isInterstateMode && (
              <div className="flex flex-col gap-2.5 mt-1">
                {/* Custom Selection Matrix */}
                <div className="grid grid-cols-1 gap-2 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">CONFIGURE INTER-STATE ROUTE</span>
                  
                  {/* Origin State Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-amber-500 font-bold">1. Start State & Station</label>
                    <select
                      value={originStateIdx}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setOriginStateIdx(val);
                        triggerStateTransitCoords(val, destStateIdx);
                      }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none focus:border-amber-500 cursor-pointer min-h-[38px] font-sans"
                    >
                      {INDIA_STATE_STATIONS.map((st, sIdx) => (
                        <option key={st.state + "_o"} value={sIdx}>
                          {st.state} - {st.city} ({st.stationName.split(" ").pop()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Swap Button Row */}
                  <div className="flex justify-center -my-1">
                    <button
                      type="button"
                      onClick={() => {
                        const temp = originStateIdx;
                        setOriginStateIdx(destStateIdx);
                        setDestStateIdx(temp);
                        triggerStateTransitCoords(destStateIdx, temp);
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 text-amber-500 w-6 h-6 rounded-full flex items-center justify-center border border-zinc-850 transition active:scale-90"
                      title="Swap states"
                    >
                      ⇄
                    </button>
                  </div>

                  {/* Dest State Select */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-amber-500 font-bold">2. Destination State & Station</label>
                    <select
                      value={destStateIdx}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setDestStateIdx(val);
                        triggerStateTransitCoords(originStateIdx, val);
                      }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none focus:border-amber-500 cursor-pointer min-h-[38px] font-sans"
                    >
                      {INDIA_STATE_STATIONS.map((st, sIdx) => (
                        <option key={st.state + "_d"} value={sIdx} disabled={sIdx === originStateIdx}>
                          {st.state} - {st.city} ({st.stationName.split(" ").pop()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multimodal Ticket Details */}
                <div className="bg-zinc-950/60 border border-amber-500/20 p-3 rounded-xl flex flex-col gap-2 text-[10.5px] text-zinc-400 font-mono">
                  <div className="flex items-center justify-between text-amber-450 font-bold">
                    <span>🚆 ACTIVE MULTIMODAL RESERVATION</span>
                    <span className="text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 animate-pulse">EXECUTIVE</span>
                  </div>
                  <div className="space-y-1.5 divide-y divide-zinc-900 text-[10px]">
                    <p className="pt-1 select-none flex justify-between"><span>🎫 Seat Reservation:</span> <strong className="text-zinc-200">First Executive Class (S-1 14A)</strong></p>
                    <p className="pt-1 select-none flex justify-between">
                      <span>🚄 Active Railway:</span> 
                      <strong className="text-zinc-200 text-right truncate max-w-[170px]" title={`${INDIA_STATE_STATIONS[originStateIdx]?.state} to ${INDIA_STATE_STATIONS[destStateIdx]?.state} Express`}>
                        {INDIA_STATE_STATIONS[originStateIdx]?.city} ➔ {INDIA_STATE_STATIONS[destStateIdx]?.city} Vande Bharat
                      </strong>
                    </p>
                    <p className="pt-1 select-none flex justify-between"><span>🛡️ Transit Insurance:</span> <strong className="text-emerald-400">Premium 1M Cover Active</strong></p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preset Bangalore Shortcuts */}
          {!pickupCoords && !dropoffCoords && (
            <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-900/40 text-xs">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">Bangalore Core Shortcuts</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {MOCK_SAVED_PLACES.slice(0, 4).map((p) => (
                  <button 
                    key={p.name}
                    onClick={() => {
                      setPickup({ lat: p.lat, lng: p.lng }, p.address);
                      setPickupInput(p.address);
                    }}
                    className="truncate text-left px-2 py-1.5 rounded bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis text-[10px]"
                  >
                    🚀 {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. ROUTE STATISTICS & SURGE OVERLAY */}
          {pickupCoords && dropoffCoords && distance && (
            <div className="space-y-4">
              {/* Distance Pill */}
              <div className="flex items-center justify-between py-2 px-3 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Route className="w-4 h-4 text-blue-400" />
                  <span>Est. Road Distance: <strong>{distance} km</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>ETA: <strong>{durationMin} mins</strong></span>
                </div>
              </div>

              {/* Surge Warning Notification Indicator */}
              {surgeActive && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-500">Surge Pricing Active ({ (1 + surgeSeverity * 0.1).toFixed(1) }x)</p>
                    <p className="text-zinc-400 text-[10px]">Due to peak office hour traffic across Bangalore tech parks.</p>
                    {/* Interactive Surge Meter */}
                    <div className="w-full bg-zinc-850 h-1 mt-1 rounded overflow-hidden flex">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <div 
                          key={step} 
                          className={`flex-1 h-full ${
                            step <= surgeSeverity 
                              ? "bg-amber-500" 
                              : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. COUPOUNS REDEEM QUICK LINK */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/30 border border-zinc-850 text-xs">
                {appliedPromo ? (
                  <div className="flex items-center gap-1 text-emerald-500 font-mono">
                    <Check className="w-3.5 h-3.5" /> Applied Code: <strong className="font-bold">{appliedPromo.code}</strong> ({appliedPromo.discount * 100}% off)
                  </div>
                ) : (
                  <form onSubmit={handlePromoApplySubmit} className="flex gap-1.5 w-full">
                    <input 
                      type="text" 
                      placeholder="Redeem code: FIRST or UBER10"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-850 rounded px-2 py-1 placeholder-zinc-650 text-[11px] font-mono focus:outline-none"
                    />
                    <button type="submit" className="bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[10px] font-bold rounded">
                      Apply
                    </button>
                  </form>
                )}
                {promoError && <span className="text-[10px] text-rose-500">{promoError}</span>}
              </div>

              {/* 4. CHOOSE TYPE OF VEHICLE & GROUPED TIER LIST (UBER CUSTOM UL STRUCTURE) */}
              <div className="border border-zinc-850 rounded-2xl overflow-hidden bg-zinc-950/80">
                <div className="p-3 bg-zinc-900/50 border-b border-zinc-850 text-xs font-semibold flex items-center justify-between">
                  <span className="text-zinc-400">SELECT VEHICLE TIER</span>
                  <div className="bg-amber-500/10 text-amber-500 text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    ₹ INR Pricing
                  </div>
                </div>

                <ul 
                  id="ride-options-scrollable-container"
                  className="max-h-[230px] overflow-y-auto divide-y divide-zinc-900/60 bg-zinc-950/40 p-1.5 space-y-1 list-none"
                >
                  {RIDE_OPTIONS.map((ride) => {
                    const isSelected = selectedRide.id === ride.id;
                    const finalRate = getRidePrice(ride);

                    return (
                      <li 
                        key={ride.id}
                        onClick={() => setSelectedRide(ride)}
                        className={`p-3 rounded-xl flex items-center justify-between gap-3 text-left transition duration-200 cursor-pointer ${
                          isSelected 
                            ? "bg-amber-500/10 border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.1)] scale-[0.99]" 
                            : "bg-transparent border border-transparent hover:bg-zinc-900/50 hover:border-zinc-850"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Mini Custom Vehicle Avatar Image Render */}
                          <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center justify-center shrink-0 w-11 h-11 relative">
                            {ride.isJet ? (
                              <span className="text-xl">🛩️</span>
                            ) : ride.name === RideClass.UBER_AUTO ? (
                              <span className="text-xl">🛺</span>
                            ) : ride.name === RideClass.UBER_MOTO ? (
                              <span className="text-xl">🏍️</span>
                            ) : (
                              <span className="text-xl">🚗</span>
                            )}
                            
                            {/* Capacity badge */}
                            <span className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-800 text-[8px] px-1 py-0.5 rounded text-zinc-400 flex items-center gap-0.5 font-mono scale-90">
                              <Users className="w-2.5 h-2.5 text-zinc-500" /> {ride.capacity}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className={`text-xs font-bold leading-tight ${isSelected ? 'text-amber-500 font-extrabold' : 'text-zinc-150'}`}>
                                {ride.name}
                              </h5>
                              <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded scale-90 ${
                                ride.category === "Premium" ? "bg-purple-950 text-purple-400 border border-purple-900" :
                                ride.category === "Economy" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                                "bg-zinc-900 text-zinc-400 border border-zinc-800"
                              }`}>
                                {ride.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-1 max-w-[190px] leading-snug line-clamp-1">
                              {ride.tagline}
                            </p>
                          </div>
                        </div>

                        {/* Live precise fare calculations */}
                        <div className="text-right">
                          <p className="text-xs font-extrabold font-mono text-zinc-100">
                            ₹{finalRate}
                          </p>
                          <p className={`text-[9px] font-mono mt-0.5 font-semibold ${isSelected ? "text-amber-500" : "text-zinc-500"}`}>
                            {ride.etaMinutes} mins away
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* 5. SCHEDULE LATER OPTION TOGGLER */}
              <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-850">
                <button 
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>{scheduleEnabled ? "Scheduled Departure Enabled" : "Schedule for Later?"}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transform transition-transform ${scheduleEnabled ? "rotate-180 text-amber-500" : ""}`} />
                </button>

                {scheduleEnabled && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-850 animate-fade-in">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Departure Date</label>
                      <input 
                        type="date" 
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full text-xs bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Departure Time</label>
                      <input 
                        type="time" 
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full text-xs bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Trigger confirmation submit */}
              <button
                onClick={() => onConfirmBooking(
                  selectedRide, 
                  pickupInput, 
                  dropoffInput, 
                  distance, 
                  durationMin || 5, 
                  getRidePrice(selectedRide)
                )}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs tracking-widest uppercase rounded-xl hover:shadow-lg hover:shadow-amber-500/10 active:scale-95 transition"
              >
                {scheduleEnabled ? "Schedule Premium Ride" : `Book ${selectedRide.name} now`}
              </button>
            </div>
          )}
        </>
      )}

      {/* 2. RADAR SCANNING FINDING DRIVER STATE */}
      {tripStatus === "finding_driver" && (
        <div className="text-center py-7 space-y-4">
          <div className="relative mx-auto w-24 h-24 bg-amber-500/5 rounded-full border border-amber-500/20 flex items-center justify-center overflow-hidden">
            {/* Pulsing rings */}
            <div className="absolute inset-0 border border-amber-500/40 rounded-full animate-ping opacity-60"></div>
            <div className="absolute inset-2 border border-amber-500/20 rounded-full animate-ping opacity-30 delay-100"></div>
            <div className="w-12 h-12 bg-amber-500 text-black font-bold text-xs rounded-full flex items-center justify-center shadow-lg uppercase tracking-wider scale-110">
              Radar
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Matching with Nearby Driver</h4>
            <p className="text-zinc-500 text-xs mt-1">Contacting nearby {activeVehicleType?.name} pilots in Bangalore grid...</p>
          </div>
          <div className="flex justify-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce"></span>
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce delay-100"></span>
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce delay-200"></span>
          </div>
          <button 
            onClick={onCancelRide}
            className="text-xs font-semibold text-rose-500 hover:text-rose-400 underline transition block mx-auto mt-4"
          >
            Cancel Booking Request
          </button>
        </div>
      )}

      {/* 4. DRAWEER TRIP COMPLETE RECEIPTS */}
      {tripStatus === "trip_complete" && activeVehicleType && (
        <div className="p-4 space-y-5 animate-fade-in text-center">
          <div className="w-12 h-12 bg-emerald-500 text-black rouned rounded-full flex items-center justify-center mx-auto text-xl font-bold shadow-lg shadow-emerald-500/10">
            ✓
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Tripped Completed!</h4>
            <p className="text-zinc-400 text-xs mt-1">Excellent ride with {activeVehicleType.name}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-left divide-y divide-zinc-850 text-xs">
            {/* Receipt Invoice */}
            <div className="pb-3 flex justify-between items-center bg-zinc-950/20">
              <span className="text-zinc-400">Total Charged Fee</span>
              <strong className="text-base text-emerald-500 font-mono font-bold">₹{getRidePrice(activeVehicleType)}</strong>
            </div>

            <div className="py-2 flex justify-between items-center">
              <span className="text-zinc-400">Tax Invoice ID</span>
              <span className="font-mono text-zinc-500 font-medium">UBR-2026-X999</span>
            </div>

            <div className="py-2 flex justify-between items-center text-zinc-400">
              <span>Eco Saving Carbon Green Credits</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono font-bold">
                🌱 +1.2 kg CO₂ Saved
              </span>
            </div>
          </div>

          {/* User Star rating inputs */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-500 uppercase font-mono tracking-widest block">Rate your Trip Experience</span>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star}
                  className="text-xl text-amber-500 hover:scale-125 transition"
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onResetAll}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Go to Main Panel
          </button>
        </div>
      )}
    </div>
  );
}
