import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Coordinates, RideClass, TrafficSignal, NearbyVehicle, RideOption, RouteStop } from "../types";
import { INDIA_STATE_STATIONS } from "../utils/mockData";

// Web Audio API Synthesizer - Simulates a premium supersonic physical pressure wave & sonic boom roar
function playSonicBoomAudio() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Heavy low-frequency shockwave rumble
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(30, now + 1.2);

    gainNode.gain.setValueAtTime(1.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.4);

    // High frequency metal canopy crack
    const oscHigh = ctx.createOscillator();
    const gainHigh = ctx.createGain();

    oscHigh.type = "triangle";
    oscHigh.frequency.setValueAtTime(1400, now);
    oscHigh.frequency.linearRampToValueAtTime(350, now + 0.4);

    gainHigh.gain.setValueAtTime(0.7, now);
    gainHigh.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    oscHigh.connect(gainHigh);
    gainHigh.connect(ctx.destination);

    oscHigh.start(now);
    oscHigh.stop(now + 0.5);
  } catch (err) {
    console.warn("Audio Context playback barred or blocked by browser policy:", err);
  }
}

export interface LiveFlight {
  id: string;
  callsign: string;
  lat: number;
  lng: number;
  altitude: number; // in meters
  speed: number;    // in km/h
  heading: number;  // in degrees
  airline: string;
}

interface MapContainerProps {
  pickup: Coordinates | null;
  dropoff: Coordinates | null;
  stops?: RouteStop[];
  isInterstateMode?: boolean;
  driverLoc: Coordinates | null;
  tripStatus: "idle" | "finding_driver" | "driver_en_route" | "trip_in_progress" | "trip_complete";
  activeVehicleType: RideOption | null;
  followDriver: boolean;
  onSelectCoordinates: (coords: Coordinates, type: "pickup" | "dropoff") => void;
  onSimulationUpdate: (stats: { 
    speed: number; 
    distanceRemainingKm: number; 
    etaSeconds: number; 
    currentSignalState: string;
    activeSignal?: { state: "RED" | "YELLOW" | "GREEN"; timer: number } | null;
    progressPercent?: number;
    interstateLeg?: "car_to_station" | "train_interstate" | "station_to_dest" | null;
  }) => void;
  isJetMode: boolean;
  speedMultiplier?: number;
  onArrivedAtPickup?: () => void;
  onArrivedAtDestination?: () => void;
  clickToSetTypeOverride?: "pickup" | "dropoff" | null;
}

export default function MapContainer({
  pickup,
  dropoff,
  stops = [],
  isInterstateMode = false,
  driverLoc,
  tripStatus,
  activeVehicleType,
  followDriver,
  onSelectCoordinates,
  onSimulationUpdate,
  isJetMode,
  speedMultiplier = 1.0,
  onArrivedAtPickup,
  onArrivedAtDestination,
  clickToSetTypeOverride,
}: MapContainerProps) {
  const mapContainerId = "leaflet-map-root";
  const mapRef = useRef<L.Map | null>(null);
  
  // Layers references
  const tilesLayerRef = useRef<L.TileLayer | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const stopsMarkersRef = useRef<L.Marker[]>([]);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const driverEnRoutePolylineRef = useRef<L.Polyline | null>(null);
  
  // Traffic signals & nearby cars
  const [trafficSignals, setTrafficSignals] = useState<TrafficSignal[]>([]);
  const trafficMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const [nearbyVehicles, setNearbyVehicles] = useState<NearbyVehicle[]>([]);
  const nearbyMarkersRef = useRef<{ [id: string]: L.Marker }>({});

  // Real-time commercial air traffic and dodging systems
  const [airTraffic, setAirTraffic] = useState<LiveFlight[]>([]);
  const airTrafficRef = useRef<LiveFlight[]>([]);
  const airTrafficMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const [dodgeAlert, setDodgeAlert] = useState<{ target: string; distance: number } | null>(null);

  const [mapTheme, setMapTheme] = useState<"dark" | "light">("dark");
  const [clickToSetType, setClickToSetType] = useState<"pickup" | "dropoff">("pickup");

  // Keep references to prevent Leaflet listener stale closure issues when state changes dynamically
  const clickToSetTypeRef = useRef<"pickup" | "dropoff">("pickup");
  const onSelectCoordinatesRef = useRef(onSelectCoordinates);

  useEffect(() => {
    clickToSetTypeRef.current = clickToSetType;
  }, [clickToSetType]);

  useEffect(() => {
    onSelectCoordinatesRef.current = onSelectCoordinates;
  }, [onSelectCoordinates]);

  // Synchronize clickToSetType state whenever parent activeInputFocus type changes
  useEffect(() => {
    if (clickToSetTypeOverride) {
      setClickToSetType(clickToSetTypeOverride);
    }
  }, [clickToSetTypeOverride]);

  // Dynamic values
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pathCoordinatesRef = useRef<L.LatLng[]>([]);
  const driverPathIndexRef = useRef<number>(0);
  const activeSpeedRef = useRef<number>(0);
  const currentDriverCoordsRef = useRef<L.LatLng | null>(null);
  const sonicBoomTriggeredRef = useRef<boolean>(false);
  const isSonicBoomingRef = useRef<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current) return; // avoid double init

    const defaultCenter: L.LatLngTuple = [12.9716, 77.5946]; // Bangalore
    const map = L.map(mapContainerId, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control at top-right to keep it out of the side drawer's way
    L.control.zoom({ position: "topright" }).addTo(map);

    // Initial Dark Tile layer
    const tilesUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    const tiles = L.tileLayer(tilesUrl, {
      maxZoom: 19,
    }).addTo(map);

    tilesLayerRef.current = tiles;
    mapRef.current = map;

    // Direct click-to-set listener on map using refs to prevent stale closure bugs
    map.on("click", (e) => {
      const activeType = clickToSetTypeRef.current;
      onSelectCoordinatesRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }, activeType);
      // Only transition to dropoff if we just set pickup, to avoid flipping endlessly on adjustments
      if (activeType === "pickup") {
        setClickToSetType("dropoff");
      }
    });

    // Generate random static nearby cars around user
    generateNearbyOnIdle(defaultCenter[0], defaultCenter[1]);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map tile theme
  useEffect(() => {
    if (!mapRef.current || !tilesLayerRef.current) return;
    mapRef.current.removeLayer(tilesLayerRef.current);

    const tilesUrl = mapTheme === "dark" 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const newTiles = L.tileLayer(tilesUrl, { maxZoom: 19 }).addTo(mapRef.current);
    tilesLayerRef.current = newTiles;
  }, [mapTheme]);

  // Generate 5 animated idle cars
  const generateNearbyOnIdle = (centerLat: number, centerLng: number) => {
    const classes = [RideClass.UBER_X, RideClass.UBER_AUTO, RideClass.UBER_MOTO, RideClass.UBER_BLACK, RideClass.JET];
    const pool: NearbyVehicle[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.005 + Math.random() * 0.015;
      pool.push({
        id: `idle_car_${i}`,
        lat: centerLat + Math.sin(angle) * dist,
        lng: centerLng + Math.cos(angle) * dist,
        type: classes[i % classes.length],
        heading: Math.floor(Math.random() * 360),
        speed: 15 + Math.random() * 30,
        wobblePhase: Math.random() * 100,
      });
    }
    setNearbyVehicles(pool);
  };

  // Idle vehicles movement simulation
  useEffect(() => {
    if (tripStatus !== "idle" && tripStatus !== "finding_driver") {
      // Clear idle marker layers during active trip
      (Object.values(nearbyMarkersRef.current) as L.Marker[]).forEach((m) => m.remove());
      nearbyMarkersRef.current = {};
      return;
    }

    const interval = setInterval(() => {
      setNearbyVehicles((prev) =>
        prev.map((v) => {
          // slight random movement (jitter/creep)
          const rad = (v.heading * Math.PI) / 180;
          const deltaLat = Math.sin(rad) * 0.0001;
          const deltaLng = Math.cos(rad) * 0.0001;
          
          // periodic rotation update
          const newHeading = (v.heading + (Math.random() - 0.5) * 20 + 360) % 360;
          
          return {
            ...v,
            lat: v.lat + deltaLat,
            lng: v.lng + deltaLng,
            heading: newHeading,
            wobblePhase: v.wobblePhase + 1,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [tripStatus]);

  // Draw or update nearby idle vehicle markers on Leaflet
  useEffect(() => {
    if (!mapRef.current || (tripStatus !== "idle" && tripStatus !== "finding_driver")) return;

    nearbyVehicles.forEach((v) => {
      const customIcon = L.divIcon({
        className: "custom-leaflet-div-icon",
        html: getVehicleMarkup(v.type, v.heading, true),
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (nearbyMarkersRef.current[v.id]) {
        nearbyMarkersRef.current[v.id].setLatLng([v.lat, v.lng]);
        nearbyMarkersRef.current[v.id].setIcon(customIcon);
      } else {
        const marker = L.marker([v.lat, v.lng], { icon: customIcon }).addTo(mapRef.current!);
        nearbyMarkersRef.current[v.id] = marker;
      }
    });

    // Cleanup markers that disappeared
    Object.keys(nearbyMarkersRef.current).forEach((id) => {
      if (!nearbyVehicles.some((v) => v.id === id)) {
        nearbyMarkersRef.current[id].remove();
        delete nearbyMarkersRef.current[id];
      }
    });
  }, [nearbyVehicles, tripStatus]);

  // Real-time Flight Traffic Tracker Effect: Fetch real world flights or generate resilient high-fidelity fallbacks
  useEffect(() => {
    // Only fetch flights when we have selected coordinates and driver is on an active Jet trip
    if (!pickup || !dropoff || !isJetMode) {
      setAirTraffic([]);
      airTrafficRef.current = [];
      Object.keys(airTrafficMarkersRef.current).forEach((id) => {
        airTrafficMarkersRef.current[id].remove();
      });
      airTrafficMarkersRef.current = {};
      setDodgeAlert(null);
      return;
    }

    const fetchRealFlights = async () => {
      try {
        // Fetch flights inside India airspace (approx cover Bangalore, Mumbai, Delhi, Chennai)
        const lamin = 6.0;
        const lamax = 24.0;
        const lomin = 71.0;
        const lomax = 89.0;
        const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("OpenSky Server error status code: " + res.status);
        const data = await res.json();
        
        if (data && data.states) {
          const fetched: LiveFlight[] = data.states.slice(0, 20).map((s: any) => {
            const icao = s[0];
            const callsign = (s[1] || `FLIGHT_${icao}`).trim();
            const lng = parseFloat(s[5]);
            const lat = parseFloat(s[6]);
            const altitude = Math.round(parseFloat(s[7] || "10500")); // meters
            const speed = Math.round(parseFloat(s[9] || "220") * 3.6); // m/s to km/h
            const heading = Math.round(parseFloat(s[10] || "180"));
            
            let airline = "Commercial Jet";
            if (callsign.startsWith("AIC") || callsign.startsWith("AI")) airline = "Air India";
            else if (callsign.startsWith("IGO") || callsign.startsWith("6E")) airline = "IndiGo";
            else if (callsign.startsWith("SEJ") || callsign.startsWith("SG")) airline = "SpiceJet";
            else if (callsign.startsWith("VTI") || callsign.startsWith("UK")) airline = "Vistara";
            else if (callsign.startsWith("UAE") || callsign.startsWith("EK")) airline = "Emirates";
            else if (callsign.startsWith("SIA") || callsign.startsWith("SQ")) airline = "Singapore Air";
            
            return { id: icao, callsign, lat, lng, altitude, speed, heading, airline };
          });
          
          if (fetched.length > 0) {
            setAirTraffic((prev) => {
              const list = [...fetched];
              if (list.length < 15) {
                const simulated = generateHighFidelitySimulatedFlights(15 - list.length);
                list.push(...simulated);
              }
              airTrafficRef.current = list;
              return list;
            });
            return;
          }
        }
      } catch (err) {
        console.warn("CORS or network blockage on OpenSky API fetch. Deploying luxury real-time tracking fallback data:", err);
      }

      // Offline or CORS fallback scenario: Seed pristine flight layout near current route region 
      setAirTraffic((prev) => {
        if (prev.length > 0) return prev; // keep moving current seeded flights
        const seeded = generateHighFidelitySimulatedFlights(18);
        airTrafficRef.current = seeded;
        return seeded;
      });
    };

    const generateHighFidelitySimulatedFlights = (count: number): LiveFlight[] => {
      const airlines = [
        { name: "Air India", prefix: "AI" },
        { name: "IndiGo", prefix: "6E" },
        { name: "SpiceJet", prefix: "SG" },
        { name: "Emirates", prefix: "EK" },
        { name: "Lufthansa", prefix: "LH" },
        { name: "Singapore Air", prefix: "SQ" },
        { name: "Qatar Airways", prefix: "QR" },
        { name: "Vistara", prefix: "UK" }
      ];
      
      const list: LiveFlight[] = [];
      const routeCenterLats = [12.9716, 13.04, 14.12, 11.45, 12.23, 13.58, 15.18, 10.82];
      const routeCenterLngs = [77.5946, 78.18, 76.45, 76.78, 79.12, 75.82, 74.45, 78.92];

      for (let i = 0; i < count; i++) {
        const air = airlines[Math.floor(Math.random() * airlines.length)];
        const callsign = `${air.prefix}${Math.floor(100 + Math.random() * 899)}`;
        const refLatKey = routeCenterLats[i % routeCenterLats.length];
        const refLngKey = routeCenterLngs[i % routeCenterLngs.length];

        // Seed them around current tracking areas to ensure they cross paths for dodging!
        const lat = refLatKey + (Math.random() - 0.5) * 2.8;
        const lng = refLngKey + (Math.random() - 0.5) * 2.8;

        list.push({
          id: `f_sim_${callsign}_${i}_${Date.now()}`,
          callsign,
          lat,
          lng,
          altitude: Math.floor(9000 + Math.random() * 3200), // FL300 - FL400 flight level
          speed: Math.floor(750 + Math.random() * 160), // 750 - 910 km/h cruising velocity
          heading: Math.floor(Math.random() * 360),
          airline: air.name
        });
      }
      return list;
    };

    fetchRealFlights();
    const interval = setInterval(fetchRealFlights, 8500);
    return () => clearInterval(interval);
  }, [pickup, dropoff, isJetMode]);

  // Leaflet Rendering effect to handle drawing flight markers onto the map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!isJetMode || airTraffic.length === 0) {
      Object.keys(airTrafficMarkersRef.current).forEach((id) => {
        airTrafficMarkersRef.current[id].remove();
      });
      airTrafficMarkersRef.current = {};
      return;
    }

    airTraffic.forEach((v) => {
      const customIcon = L.divIcon({
        className: "custom-leaflet-div-icon flight-marker-layer",
        html: `
          <div class="relative w-10 h-10 flex items-center justify-center pointer-events-none">
            <!-- Intercept warning halo if close -->
            <div class="absolute inset-0 w-8 h-8 rounded-full border border-sky-400/30 bg-sky-500/5 animate-pulse"></div>
            
            <div style="transform: rotate(${v.heading}deg);">
              <svg width="22" height="22" viewBox="0 0 40 40">
                ${getVehicleMarkup("COMMERCIAL_JET" as any, 0, false)}
              </svg>
            </div>
            
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-sky-500/35 text-sky-400 text-[8px] font-mono px-1 rounded shadow-md whitespace-nowrap leading-none py-0.5 tracking-tighter">
              ${v.callsign} <span class="text-zinc-500">•</span> FL${Math.round(v.altitude / 30.48)}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (airTrafficMarkersRef.current[v.id]) {
        airTrafficMarkersRef.current[v.id].setLatLng([v.lat, v.lng]);
        airTrafficMarkersRef.current[v.id].setIcon(customIcon);
      } else {
        const marker = L.marker([v.lat, v.lng], { icon: customIcon }).addTo(mapRef.current!);
        airTrafficMarkersRef.current[v.id] = marker;
      }
    });

    Object.keys(airTrafficMarkersRef.current).forEach((id) => {
      if (!airTraffic.some((v) => v.id === id)) {
        airTrafficMarkersRef.current[id].remove();
        delete airTrafficMarkersRef.current[id];
      }
    });
  }, [airTraffic, isJetMode]);

  // Handle Red/Yellow/Green Traffic lights blinking
  useEffect(() => {
    const timer = setInterval(() => {
      setTrafficSignals((prev) =>
        prev.map((signal) => {
          let nextState: "RED" | "YELLOW" | "GREEN" = signal.state;
          let nextTimer = signal.timer - 1;

          if (nextTimer <= 0) {
            if (signal.state === "GREEN") {
              nextState = "YELLOW";
              nextTimer = 2; // yellow is short
            } else if (signal.state === "YELLOW") {
              nextState = "RED";
              nextTimer = 5; // standard red phase
            } else {
              nextState = "GREEN";
              nextTimer = 6; // standard green phase
            }
          }
          return { ...signal, state: nextState, timer: nextTimer };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [trafficSignals.length]);

  // Center map on pickup changes during idle to support automatic GPS centering
  useEffect(() => {
    if (!mapRef.current || !pickup) return;
    if (tripStatus === "idle") {
      mapRef.current.setView([pickup.lat, pickup.lng], mapRef.current.getZoom() || 13, { animate: true });
      generateNearbyOnIdle(pickup.lat, pickup.lng);
    }
  }, [pickup, tripStatus]);

  // Draw Traffic light icons on active Leaflet road route
  useEffect(() => {
    if (!mapRef.current) return;

    trafficSignals.forEach((sig) => {
      const colorClass = 
        sig.state === "RED" 
          ? "bg-rose-500 shadow-rose-500/80 animate-pulse" 
          : sig.state === "YELLOW"
          ? "bg-amber-400 shadow-amber-400/80"
          : "bg-emerald-500 shadow-emerald-500/80";

      const signalHtml = `
        <div class="relative flex flex-col items-center justify-center p-0.5 bg-black/90 rounded border border-zinc-700 shadow-xl" style="width: 20px; height: 35px;">
          <div class="w-3.5 h-3.5 rounded-full ${colorClass} border border-black flex items-center justify-center">
            <span class="text-[6px] font-bold text-black" style="font-size: 7px;">${sig.timer}</span>
          </div>
          <div class="w-1.5 h-3 bg-zinc-600 mt-1 rounded-sm"></div>
        </div>
      `;

      const signalIcon = L.divIcon({
        className: "custom-traffic-signal",
        html: signalHtml,
        iconSize: [20, 35],
        iconAnchor: [10, 35],
      });

      if (trafficMarkersRef.current[sig.id]) {
        trafficMarkersRef.current[sig.id].setLatLng([sig.lat, sig.lng]);
        trafficMarkersRef.current[sig.id].setIcon(signalIcon);
      } else {
        const marker = L.marker([sig.lat, sig.lng], { icon: signalIcon }).addTo(mapRef.current!);
        trafficMarkersRef.current[sig.id] = marker;
      }
    });

    return () => {
      // Cleanup traffic signals if they should be empty
      if (trafficSignals.length === 0) {
        (Object.values(trafficMarkersRef.current) as L.Marker[]).forEach((m) => m.remove());
        trafficMarkersRef.current = {};
      }
      
      // Cleanup orphan traffic markers not present in traffic signals anymore
      Object.keys(trafficMarkersRef.current).forEach((id) => {
        if (!trafficSignals.some((sig) => sig.id === id)) {
          trafficMarkersRef.current[id].remove();
          delete trafficMarkersRef.current[id];
        }
      });
    };
  }, [trafficSignals]);

  // Draw Pickup, Dropoff Pin markings
  useEffect(() => {
    if (!mapRef.current) return;

    // Pickup marker
    // Fitting bounds when points are selected
    if (pickup) {
      const htmlMarkup = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-emerald-500/30 rounded-full animate-ping"></div>
          <div class="w-4.5 h-4.5 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-black rounded-full"></div>
          </div>
        </div>
      `;
      const pIcon = L.divIcon({
        html: htmlMarkup,
        className: "custom-pickup-pulse-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
      } else {
        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pIcon }).addTo(mapRef.current);
      }
    } else {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.remove();
        pickupMarkerRef.current = null;
      }
    }

    // Clear old stops markers
    stopsMarkersRef.current.forEach((m) => m.remove());
    stopsMarkersRef.current = [];

    // Draw intermediate stops on Leaflet
    if (mapRef.current && stops && stops.length > 0) {
      stops.forEach((stop, idx) => {
        const htmlMarkup = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-7 h-7 bg-amber-500/30 rounded-full animate-ping"></div>
            <div class="w-5 h-5 bg-zinc-950 border-2 border-amber-500 rounded-full shadow-lg flex items-center justify-center text-[10px] font-black text-amber-500">
              ${idx + 1}
            </div>
          </div>
        `;
        const sIcon = L.divIcon({
          html: htmlMarkup,
          className: `custom-stopover-marker-${idx}`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([stop.lat, stop.lng], { icon: sIcon }).addTo(mapRef.current!);
        stopsMarkersRef.current.push(marker);
      });
    }

    // Dropoff marker (Red Pin as requested by user)
    if (dropoff) {
      const htmlMarkup = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-red-500/25 rounded-full animate-pulse"></div>
          <div class="w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-zinc-950 rounded-full"></div>
          </div>
        </div>
      `;
      const dIcon = L.divIcon({
        html: htmlMarkup,
        className: "custom-dropoff-pin-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
      } else {
        dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], { icon: dIcon }).addTo(mapRef.current);
      }
    } else {
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.remove();
        dropoffMarkerRef.current = null;
      }
    }

    // Fit-to-Bounds when both are selected
    if (pickup && dropoff && tripStatus === "idle") {
      const points = [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]];
      stops.forEach(s => points.push([s.lat, s.lng]));
      const bounds = L.latLngBounds(points as L.LatLngExpression[]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60], animate: true });
    }
  }, [pickup, dropoff, stops, tripStatus]);

  // Start Driver Simulation Run & Interpolate Smooth Speed
  useEffect(() => {
    // Clear active intervals
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    if (tripStatus === "idle") {
      // Clear route lines and signal state
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
      if (driverEnRoutePolylineRef.current) {
        driverEnRoutePolylineRef.current.remove();
        driverEnRoutePolylineRef.current = null;
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      setTrafficSignals([]);
      return;
    }

    if (tripStatus === "driver_en_route" || tripStatus === "trip_in_progress") {
      buildAndStartSimulation();
    }

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, [tripStatus, pickup, dropoff, isJetMode]);

  // Create routes and trigger driving loop
  const buildAndStartSimulation = async () => {
    if (!pickup || !dropoff || !mapRef.current) return;

    const getSegmentPoints = async (start: Coordinates, end: Coordinates, straightSteps = 30): Promise<L.LatLng[]> => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates; // arrays of [lng, lat]
          return coords.map((c: number[]) => new L.LatLng(c[1], c[0]));
        }
      } catch (err) {
        // Fallback straight line
      }
      const points: L.LatLng[] = [];
      for (let i = 0; i <= straightSteps; i++) {
        const ratio = i / straightSteps;
        const lat = start.lat + (end.lat - start.lat) * ratio;
        const lng = start.lng + (end.lng - start.lng) * ratio;
        points.push(new L.LatLng(lat, lng));
      }
      return points;
    };

    let routePoints: L.LatLng[] = [];
    let colorLine = "#fbbf24"; // default Amber

    if (isInterstateMode && tripStatus === "trip_in_progress") {
      colorLine = "#ec4899"; // Elite Purple / Hot Pink theme for VIP Inter-State rail chains!
      
      // Find the closest predefined state stations to user's pickup & dropoff coordinates
      const getGeodeticDistRaw = (c1: Coordinates, c2: Coordinates) => {
        return Math.sqrt(Math.pow(c1.lat - c2.lat, 2) + Math.pow(c1.lng - c2.lng, 2));
      };

      let startStation = INDIA_STATE_STATIONS[2]; // Default KSR Bengaluru
      let endStation = INDIA_STATE_STATIONS[3]; // Default Chennai Central
      
      let minStartDist = Infinity;
      let minEndDist = Infinity;

      for (const st of INDIA_STATE_STATIONS) {
        const dStart = getGeodeticDistRaw(pickup, st);
        if (dStart < minStartDist) {
          minStartDist = dStart;
          startStation = st;
        }
        const dEnd = getGeodeticDistRaw(dropoff, st);
        // Ensure starting and ending station are distinct if possible
        if (dEnd < minEndDist) {
          minEndDist = dEnd;
          endStation = st;
        }
      }

      // Leg 1: Urban luxury sedan transfer to starting station
      const seg1 = await getSegmentPoints(pickup, startStation, 20);

      // Leg 2: Dynamic high-speed Vande Bharat interstate spline across states
      const railwayLandmarks: Coordinates[] = [startStation];
      const curvesCount = 5;
      for (let s = 1; s < curvesCount; s++) {
        const ratio = s / curvesCount;
        let lat = startStation.lat + (endStation.lat - startStation.lat) * ratio;
        let lng = startStation.lng + (endStation.lng - startStation.lng) * ratio;
        
        // Add geographical route wind curvature
        const waveOffset = Math.sin(ratio * Math.PI) * 0.15;
        if (Math.abs(startStation.lat - endStation.lat) > Math.abs(startStation.lng - endStation.lng)) {
          lng += waveOffset;
        } else {
          lat += waveOffset;
        }
        railwayLandmarks.push({ lat, lng });
      }
      railwayLandmarks.push(endStation);

      let seg2: L.LatLng[] = [];
      for (let sIdx = 0; sIdx < railwayLandmarks.length - 1; sIdx++) {
        const r1 = railwayLandmarks[sIdx];
        const r2 = railwayLandmarks[sIdx+1];
        const steps = 18;
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          const lat = r1.lat + (r2.lat - r1.lat) * ratio;
          const lng = r1.lng + (r2.lng - r1.lng) * ratio;
          seg2.push(new L.LatLng(lat, lng));
        }
      }

      // Leg 3: S-Class chauffeur meeting you at the destination platform to final drop point
      const seg3 = await getSegmentPoints(endStation, dropoff, 20);

      routePoints = [...seg1, ...seg2, ...seg3];
      setTrafficSignals([]); // No road lights on major interstate rail tracks!
    } else {
      let finalParts: Coordinates[] = [];

      if (tripStatus === "driver_en_route") {
        colorLine = "#3b82f6"; // Blue dashed
        const driverStart = {
          lat: pickup.lat + 0.007 + (Math.random() - 0.5) * 0.003,
          lng: pickup.lng - 0.007 + (Math.random() - 0.5) * 0.003,
        };
        finalParts = [driverStart, pickup];
      } else {
        colorLine = "#10b981"; // Green solid route
        finalParts = [pickup, ...stops, dropoff];
      }

      if (isJetMode) {
        // Direct flight spline ignoring streets
        const startPt = finalParts[0];
        const endPt = finalParts[finalParts.length - 1];
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          const lat = startPt.lat + (endPt.lat - startPt.lat) * ratio;
          const lng = startPt.lng + (endPt.lng - startPt.lng) * ratio;
          routePoints.push(new L.LatLng(lat, lng));
        }
        setTrafficSignals([]);
      } else {
        // Sequential road segments OSRM builder
        let combined: L.LatLng[] = [];
        for (let pIdx = 0; pIdx < finalParts.length - 1; pIdx++) {
          const seg = await getSegmentPoints(finalParts[pIdx], finalParts[pIdx+1], 35);
          if (combined.length > 0 && seg.length > 0) {
            combined.pop();
          }
          combined = [...combined, ...seg];
        }
        routePoints = combined;

        // Populate traffic indicators
        if (routePoints.length > 25) {
          const index1 = Math.floor(routePoints.length * 0.35);
          const index2 = Math.floor(routePoints.length * 0.7);
          setTrafficSignals([
            { id: "signal_1", lat: routePoints[index1].lat, lng: routePoints[index1].lng, state: "GREEN", timer: 6 },
            { id: "signal_2", lat: routePoints[index2].lat, lng: routePoints[index2].lng, state: "RED", timer: 4 },
          ]);
        } else {
          setTrafficSignals([]);
        }
      }
    }

    if (routePoints.length === 0) return;

    if (tripStatus === "driver_en_route") {
      if (driverEnRoutePolylineRef.current) driverEnRoutePolylineRef.current.remove();
      driverEnRoutePolylineRef.current = L.polyline(routePoints, {
        color: colorLine,
        dashArray: "6, 6",
        weight: 5,
        opacity: 0.85,
      }).addTo(mapRef.current);
    } else {
      if (routePolylineRef.current) routePolylineRef.current.remove();
      routePolylineRef.current = L.polyline(routePoints, {
        color: colorLine,
        weight: 6,
        opacity: 0.9,
      }).addTo(mapRef.current);
    }

    // Prepare driver marker and location simulation values
    pathCoordinatesRef.current = routePoints;
    driverPathIndexRef.current = 0;
    currentDriverCoordsRef.current = routePoints[0];
    
    // Zoom map bounding box to cover the entire active driver trek
    const bounds = L.latLngBounds(routePoints);
    mapRef.current.fitBounds(bounds, { padding: [80, 80], animate: true });

    // Set stable starting position
    const startPoint = routePoints[0];
    const initialHeading = getBearing(startPoint, routePoints[1] || startPoint);

    const vehicleType = activeVehicleType?.name || RideClass.UBER_X;
    const initialIcon = L.divIcon({
      className: "custom-leaflet-div-icon",
      html: getVehicleMarkup(vehicleType, initialHeading, false),
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(startPoint);
      driverMarkerRef.current.setIcon(initialIcon);
    } else {
      driverMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], { icon: initialIcon }).addTo(mapRef.current);
    }

    // Active speed variables inside simulation loop
    activeSpeedRef.current = 0;
    sonicBoomTriggeredRef.current = false;
    isSonicBoomingRef.current = false;

    // Run active animation: fast & responsive (100ms intervals!)
    simIntervalRef.current = setInterval(() => {
      runDriverAdvanceTick();
    }, 100);
  };

  // Perform driving step along path utilizing precise physical metrics
  const runDriverAdvanceTick = () => {
    const coords = pathCoordinatesRef.current;
    let idx = driverPathIndexRef.current;

    if (idx >= coords.length - 1) {
      // Path complete
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      if (tripStatus === "driver_en_route" && onArrivedAtPickup) {
        onArrivedAtPickup();
      } else if (tripStatus === "trip_in_progress" && onArrivedAtDestination) {
        onArrivedAtDestination();
      }
      return;
    }

    if (!currentDriverCoordsRef.current) {
      currentDriverCoordsRef.current = coords[0];
    }

    const currentLoc = currentDriverCoordsRef.current;
    const nextLoc = coords[idx + 1];

    // Compute vehicle bearing heading
    const angleHeading = getBearing(currentLoc, nextLoc);

    // Detect if driver is approaching a traffic signal (closer than 45 meters)
    let approachingSignal: TrafficSignal | null = null;
    trafficSignals.forEach((sig) => {
      const distance = getDistanceMeters(currentLoc.lat, currentLoc.lng, sig.lat, sig.lng);
      if (distance < 45) {
        approachingSignal = sig;
      }
    });

    // Check speed & acceleration parameters tailored for elite vehicles:
    // Bike, auto, and copters should feel responsive 
    // Speed should transition smoothly (no jagged frames)
    let targetSpeed = 45; // default car speed in km/h
    let currentSignalState = "No signals ahead";
    let interstateLegVal: "car_to_station" | "train_interstate" | "station_to_dest" | null = null;

    if (isInterstateMode && tripStatus === "trip_in_progress") {
      const ratio = idx / (coords.length - 1 || 1);
      if (ratio < 0.15) {
        interstateLegVal = "car_to_station";
        targetSpeed = 45; // driving to Bangalore KSR Station
      } else if (ratio < 0.85) {
        interstateLegVal = "train_interstate";
        targetSpeed = 135; // blistering high-speed Vande Bharat train crossing states!
      } else {
        interstateLegVal = "station_to_dest";
        targetSpeed = 55; // Luxury S-class town car dropoff in Chennai
      }
    } else {
      if (activeVehicleType?.name === RideClass.UBER_MOTO) {
        targetSpeed = 48;
      } else if (activeVehicleType?.name === RideClass.UBER_AUTO) {
        targetSpeed = 33;
      } else if (activeVehicleType?.isJet) {
        targetSpeed = 11800; // Supersonic Jet cruises at Mach 1 speed (1,236 km/h)!
      } else if (activeVehicleType?.category === "Premium") {
        targetSpeed = 65;
      }
    }

    // Apply Speed Multiplier Override
    if (speedMultiplier && speedMultiplier > 1.0) {
      targetSpeed = targetSpeed * speedMultiplier;
    }

    // Smoothly glide other commercial planes in real-time along their vectors on every tick
    if (isJetMode && airTrafficRef.current.length > 0) {
      airTrafficRef.current = airTrafficRef.current.map((plane) => {
        const rad = (plane.heading * Math.PI) / 180;
        const speedMps = plane.speed / 3.6;
        const distStep = speedMps * 0.1; // distance moved in 100ms
        const deltaLat = Math.sin(rad) * (distStep / 111000);
        const deltaLng = Math.cos(rad) * (distStep / 111000);
        return {
          ...plane,
          lat: plane.lat + deltaLat,
          lng: plane.lng + deltaLng,
        };
      });
      // push updates to state to refresh other flight markers
      setAirTraffic([...airTrafficRef.current]);
    }

    // If approaching a traffic light (not in high speed train)
    if (approachingSignal && interstateLegVal !== "train_interstate") {
      const sig: TrafficSignal = approachingSignal;
      currentSignalState = `Approaching Signal: ${sig.state}`;
      if (sig.state === "RED") {
        targetSpeed = 0; // immediate gradual deceleration to stop
      } else if (sig.state === "YELLOW") {
        targetSpeed = 12; // slow down at yellow amber
      } else {
        // green: maintain cruise speed
      }
    }

    // Smooth Speed Interpolation: adjust speed gradually
    const diff = targetSpeed - activeSpeedRef.current;
    if (Math.abs(diff) > 0.5) {
      activeSpeedRef.current += diff * 0.12; // smooth physical acceleration/braking
    } else {
      activeSpeedRef.current = targetSpeed;
    }

    // Trigger sonic boom visual flashing and audio shockwaves when passing 1,200 km/h transition threshold
    if (activeVehicleType?.isJet && !sonicBoomTriggeredRef.current && activeSpeedRef.current >= 1200) {
      sonicBoomTriggeredRef.current = true;
      isSonicBoomingRef.current = true;
      playSonicBoomAudio();
      
      // Clear visual flash after 1.5 seconds
      setTimeout(() => {
        isSonicBoomingRef.current = false;
      }, 1500);
    }

    // Calculate step in meters for this 100ms tick
    // conversion to m/s: speed / 3.6. For 100ms: speed/36
    const stepMeters = (activeSpeedRef.current / 3.6) * 0.1;

    if (stepMeters > 0) {
      // Find distance to next coordinate waypoint in meters
      const distToNext = getDistanceMeters(currentLoc.lat, currentLoc.lng, nextLoc.lat, nextLoc.lng);

      if (stepMeters >= distToNext) {
        // Hop to next waypoint
        currentDriverCoordsRef.current = nextLoc;
        driverPathIndexRef.current = idx + 1;
      } else {
        // Interpolate along the segment
        const pct = stepMeters / distToNext;
        const nextLat = currentLoc.lat + (nextLoc.lat - currentLoc.lat) * pct;
        const nextLng = currentLoc.lng + (nextLoc.lng - currentLoc.lng) * pct;
        currentDriverCoordsRef.current = new L.LatLng(nextLat, nextLng);
      }
    }

    const finalCoord = currentDriverCoordsRef.current || currentLoc;

    // ACTIVE COLLISION EN-ROUTE DETECTION & AUTOMUTUAL DODGING MANEUVERS
    let finalDrawnLat = finalCoord.lat;
    let finalDrawnLng = finalCoord.lng;
    let activeDodge: { target: string; distance: number } | null = null;

    if (isJetMode && airTrafficRef.current.length > 0) {
      let totalPushLat = 0;
      let totalPushLng = 0;

      airTrafficRef.current.forEach((plane) => {
        const dMeters = getDistanceMeters(finalCoord.lat, finalCoord.lng, plane.lat, plane.lng);
        // Collision threshold: 3.8 kilometers! If a commercial plane enters this, our jet dodges.
        if (dMeters < 3800) {
          activeDodge = { target: plane.callsign, distance: Math.round(dMeters) };
          
          // Repulsive angle calculation
          const angleRad = Math.atan2(finalCoord.lat - plane.lat, finalCoord.lng - plane.lng);
          // Progressively stronger lateral swerve the closer the planes come to each other
          const repulsionRatio = Math.max(0.1, 1 - dMeters / 3800);
          const pushDistanceDegrees = 0.007 * repulsionRatio; // ~770 meters of lateral displacement
          
          totalPushLat += Math.sin(angleRad) * pushDistanceDegrees;
          totalPushLng += Math.cos(angleRad) * pushDistanceDegrees;
        }
      });

      if (activeDodge) {
        finalDrawnLat += totalPushLat;
        finalDrawnLng += totalPushLng;
      }
    }
    setDodgeAlert(activeDodge);

    // Update coordinates and angle rotation on marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(new L.LatLng(finalDrawnLat, finalDrawnLng));

      let simulatedTypeMark = activeVehicleType?.name || RideClass.UBER_X;
      if (interstateLegVal === "train_interstate") {
        simulatedTypeMark = "TRAIN" as any;
      }

      const markerIcon = L.divIcon({
        className: `custom-leaflet-div-icon ${isSonicBoomingRef.current ? "sonic-boom-active" : ""}`,
        html: getVehicleMarkup(simulatedTypeMark, angleHeading, false, isSonicBoomingRef.current),
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
      driverMarkerRef.current.setIcon(markerIcon);
    }

    // Fit follow driver viewport option & offset upward to prevent bottom popup obscuring!
    if (followDriver && mapRef.current) {
      // Offset latitude by -0.002 to pan slightly higher, pushing vehicles clear of the bottom card popup overlays!
      const offsetLat = finalCoord.lat - 0.0022;
      mapRef.current.panTo([offsetLat, finalCoord.lng], { animate: true, duration: 0.1 });
    }

    // Compute direct remaining distance in km via geodetic meters to destination
    let distRemainingKm = 0;
    if (finalCoord) {
      const endPoint = coords[coords.length - 1];
      distRemainingKm = getDistanceMeters(finalCoord.lat, finalCoord.lng, endPoint.lat, endPoint.lng) / 1000;
    }
    const distRemainingRounded = parseFloat(distRemainingKm.toFixed(2));
    
    // Dynamic estimation of arrival time (seconds): distanceRemainingKm / (speed_km_h / 3600)
    let etaSeconds = 5;
    if (activeSpeedRef.current > 5) {
      etaSeconds = Math.max(Math.ceil((distRemainingKm / activeSpeedRef.current) * 3600), 5);
    } else if (distRemainingKm > 0) {
      etaSeconds = Math.max(Math.ceil(distRemainingKm * 120), 5);
    } else {
      etaSeconds = 0;
    }

    let pctTraversed = Math.round((idx / (coords.length - 1 || 1)) * 100);
    pctTraversed = Math.min(Math.max(pctTraversed, 0), 100);

    // Push state metrics to the booking wrapper
    onSimulationUpdate({
      speed: Math.round(activeSpeedRef.current),
      distanceRemainingKm: distRemainingRounded <= 0.02 ? 0 : distRemainingRounded,
      etaSeconds: distRemainingRounded <= 0.02 ? 0 : etaSeconds,
      currentSignalState,
      activeSignal: approachingSignal && interstateLegVal !== "train_interstate" ? { state: (approachingSignal as TrafficSignal).state, timer: (approachingSignal as TrafficSignal).timer } : null,
      progressPercent: pctTraversed,
      interstateLeg: interstateLegVal,
    });

    // Check if reached absolute completion
    if (driverPathIndexRef.current >= coords.length - 1) {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      if (tripStatus === "driver_en_route" && onArrivedAtPickup) {
        onArrivedAtPickup();
      } else if (tripStatus === "trip_in_progress" && onArrivedAtDestination) {
        onArrivedAtDestination();
      }
    }
  };

  // Helper distance function in meters using Haversine
  const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper distance function
  const getSimpleDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
  };

  // Compute rotation angle (bearing) between LatLng coordinates
  const getBearing = (start: L.LatLng, end: L.LatLng): number => {
    const lat1 = (start.lat * Math.PI) / 180;
    const lat2 = (end.lat * Math.PI) / 180;
    const dLng = ((end.lng - start.lng) * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    const bearingRad = Math.atan2(y, x);
    const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;
    return bearingDeg;
  };

  // Render direct SVGs for the Map markers based on vehicle type
  const getVehicleMarkup = (type: RideClass, headingDeg: number, isWobble: boolean, isSonicBooming?: boolean): string => {
    let colorHex = "#fbbf24"; // standard gold amber
    let svgPath = "";
    let animationClass = isWobble ? "wobble-anim" : "";
    let extraElements = "";

    switch (type) {
      case RideClass.UBER_MOTO:
        // Bike icon
        colorHex = "#22c55e"; // Green bike
        svgPath = `
          <!-- Body -->
          <ellipse cx="20" cy="20" rx="4" ry="12" fill="${colorHex}" stroke="#000" stroke-width="1.5" />
          <!-- Wheels -->
          <circle cx="20" cy="8" r="3" fill="#111" />
          <circle cx="20" cy="32" r="3" fill="#111" />
          <!-- Handlebars -->
          <line x1="12" y1="12" x2="28" y2="12" stroke="#111" stroke-width="2.5" />
          <!-- Rider Helmet -->
          <circle cx="20" cy="18" r="3" fill="#fff" stroke="#000" stroke-width="1" />
        `;
        break;

      case RideClass.UBER_AUTO:
        // Auto rickshaw icon
        colorHex = "#eab308"; // classic yellow bajaj auto
        svgPath = `
          <!-- Body shape -->
          <polygon points="20,8 10,24 10,34 30,34 30,24" fill="${colorHex}" stroke="#111" stroke-width="1.5" />
          <!-- Green back deck -->
          <rect x="12" y="22" width="16" height="11" fill="#15803d" />
          <!-- Headlight front -->
          <polygon points="20,8 16,14 24,14" fill="#fcfae6" />
          <!-- Top black canopy bounds -->
          <rect x="13" y="15" width="14" height="6" fill="#18181b" rx="1" />
        `;
        break;

      case "COMMERCIAL_JET" as any:
        // A sleek airline carrier flight layout
        colorHex = "#3b82f6"; // Royal blue theme
        svgPath = `
          <!-- Left Wing -->
          <path d="M20,8 L2,24 L20,20 Z" fill="${colorHex}" stroke="#111" stroke-width="1" />
          <!-- Right Wing -->
          <path d="M20,8 L38,24 L20,20 Z" fill="${colorHex}" stroke="#111" stroke-width="1" />
          <!-- Fuselage -->
          <ellipse cx="20" cy="18" rx="3.5" ry="14" fill="#ffffff" stroke="#111" stroke-width="1" />
          <!-- Cockpit -->
          <ellipse cx="20" cy="7" rx="1.5" ry="3" fill="#1e293b" />
          <!-- Stabilizer tail planes -->
          <path d="M20,28 L14,33 L20,31 Z" fill="#64748b" stroke="#111" stroke-width="0.8" />
          <path d="M20,28 L26,33 L20,31 Z" fill="#64748b" stroke="#111" stroke-width="0.8" />
        `;
        break;

      case RideClass.JET:
        // Supersonic Jet with glowing engine afterburner!
        colorHex = "#a855f7"; // Royal purple supersonic jet paint
        svgPath = `
          <!-- Left swept swept-back wing -->
          <path d="M20,10 L4,26 L20,22 Z" fill="${colorHex}" stroke="#222" stroke-width="1.2" />
          <!-- Right swept swept-back wing -->
          <path d="M20,10 L36,26 L20,22 Z" fill="${colorHex}" stroke="#222" stroke-width="1.2" />
          <!-- Main fuselage tube body -->
          <ellipse cx="20" cy="18" rx="4" ry="14" fill="${colorHex}" stroke="#111" stroke-width="1.5" />
          <!-- Front cockpit flight glass canopy -->
          <ellipse cx="20" cy="11" rx="2" ry="5" fill="#38bdf8" />
          <!-- Horizontal tail stabilizers -->
          <path d="M20,26 L12,32 L20,30 Z" fill="#475569" stroke="#111" stroke-width="1" />
          <path d="M20,26 L28,32 L20,30 Z" fill="#475569" stroke="#111" stroke-width="1" />
          <!-- Pulsing fire exhaust afterburner tail flame -->
          <polygon points="18,30 22,30 20,38" fill="#f97316" class="animate-pulse" />
        `;
        if (isSonicBooming) {
          extraElements = `
            <div class="shockwave text-purple-500"></div>
            <div class="shockwave text-rose-500 animate-pulse" style="animation-delay: 0.15s;"></div>
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-purple-600/95 text-white font-mono font-black text-[9px] tracking-widest px-1.5 py-0.5 rounded shadow-2xl scale-95 uppercase whitespace-nowrap animate-bounce border border-purple-400">
              ⚡ SONIC BOOM! ⚡
            </div>
          `;
        }
        break;

      case RideClass.UBER_BLACK:
      case RideClass.UBER_BLACK_SUV:
        colorHex = "#18181b"; // Obsidian Black
        svgPath = `
          <!-- Premium Luxury Car -->
          <rect x="11" y="8" width="18" height="24" rx="4" fill="${colorHex}" stroke="#ebd775" stroke-width="1.5" />
          <!-- Windshield & Rear glass -->
          <rect x="13" y="11" width="14" height="4" fill="#202225" rx="1" />
          <rect x="13" y="23" width="14" height="3" fill="#202225" rx="1" />
          <!-- Headlights premium gold beams -->
          <polygon points="12,8 9,3 15,3" fill="#fef08a" opacity="0.5" />
          <polygon points="28,8 25,3 31,3" fill="#fef08a" opacity="0.5" />
        `;
        break;

      case "TRAIN" as any:
        // Elegant aerodynamic bullet/high-speed train car nose
        colorHex = "#2563eb"; // Vande Bharat Blue & white body accent
        svgPath = `
          <!-- Train container/coach -->
          <rect x="13" y="2" width="14" height="36" rx="4" fill="#ffffff" stroke="#1e3a8a" stroke-width="1.8" />
          <!-- Blue stripe down the middle -->
          <rect x="17" y="2" width="6" height="36" fill="${colorHex}" />
          <!-- Sleek windshield nose at front -->
          <path d="M14,6 L26,6 L20,1 Z" fill="#1e293b" />
          <!-- Side coach window rows -->
          <rect x="15" y="10" width="2" height="4" fill="#475569" />
          <rect x="23" y="10" width="2" height="4" fill="#475569" />
          <rect x="15" y="17" width="2" height="4" fill="#475569" />
          <rect x="23" y="17" width="2" height="4" fill="#475569" />
          <rect x="15" y="24" width="2" height="4" fill="#475569" />
          <rect x="23" y="24" width="2" height="4" fill="#475569" />
          <!-- Electric pantograph line indicator -->
          <path d="M18,32 L22,32 L20,29 Z" fill="#94a3b8" />
        `;
        break;

      default:
        // Standard Uber passenger vehicle outline
        colorHex = "#f59e0b"; // Premium Amber/Gold
        svgPath = `
          <rect x="12" y="8" width="16" height="24" rx="3.5" fill="${colorHex}" stroke="#111" stroke-width="1.5" />
          <rect x="14" y="12" width="12" height="4" fill="#a1a1aa" />
          <rect x="14" y="22" width="12" height="3" fill="#a1a1aa" />
          <circle cx="11" cy="11" r="1.5" fill="#000" />
          <circle cx="29" cy="11" r="1.5" fill="#000" />
        `;
        break;
    }

    return `
      <div class="relative w-full h-full flex items-center justify-center ${animationClass}" style="transform: rotate(${headingDeg}deg); transition: transform 0.1s linear;">
        <svg width="40" height="40" viewBox="0 0 40 40" class="overflow-visible drop-shadow-lg">
          ${svgPath}
        </svg>
        ${extraElements}
      </div>
    `;
  };

  return (
    <div className="relative w-full h-full">
      {/* Absolute Header Overlay (Map theme, set selectors) */}
      <div className="absolute top-4 left-4 z-[999] flex flex-col gap-2 pointer-events-auto">
        {/* Click to Set Mode Toggle - Green and Red pins styling */}
        <div className="flex bg-zinc-950/95 border border-zinc-800 p-1.5 rounded-xl shadow-2xl backdrop-blur-md gap-1">
          <button 
            id="btn-set-pickup-green"
            onClick={() => setClickToSetType("pickup")}
            className={`text-[11px] px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
              clickToSetType === "pickup" ? "bg-emerald-500 text-zinc-950 shadow-inner scale-[1.03]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${clickToSetType === "pickup" ? "bg-zinc-950" : "bg-emerald-500"}`}></span> 
            Set Pickup (Green Pin)
          </button>
          <button 
            id="btn-set-dropoff-red"
            onClick={() => setClickToSetType("dropoff")}
            className={`text-[11px] px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 ${
              clickToSetType === "dropoff" ? "bg-red-500 text-white shadow-inner scale-[1.03]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${clickToSetType === "dropoff" ? "bg-white" : "bg-red-500"}`}></span> 
            Set Dropoff (Red Pin)
          </button>
        </div>

        {/* Map Theme picker */}
        <div className="bg-zinc-950/90 border border-zinc-850 py-1 px-2.5 rounded-xl shadow-xl backdrop-blur-md flex items-center justify-between w-max gap-3 text-xs text-zinc-300">
          <span className="font-semibold text-[11px] text-zinc-400 font-mono uppercase">Theme:</span>
          <div className="flex gap-1.5">
            <button 
              onClick={() => setMapTheme("dark")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                mapTheme === "dark" ? "bg-zinc-800 text-zinc-200 border border-zinc-700" : "text-zinc-500"
              }`}
            >
              Nocturnal
            </button>
            <button 
              onClick={() => setMapTheme("light")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                mapTheme === "light" ? "bg-zinc-200 text-black border border-zinc-300" : "text-zinc-500"
              }`}
            >
              Daylight
            </button>
          </div>
        </div>
      </div>

      {/* GLOWING TACTICAL COLLISION DODGE OVERLAY HUD */}
      {dodgeAlert && (
        <div className="absolute top-28 left-4 z-[999] pointer-events-none max-w-[300px]">
          <div className="bg-rose-950/95 border-2 border-rose-500/80 text-rose-200 px-3.5 py-3 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.45)] backdrop-blur-md flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </div>
            <div className="text-left font-sans">
              <span className="font-extrabold text-[10px] tracking-widest uppercase text-rose-400 block">⚠️ COLLISION COUSE DODGE</span>
              <p className="text-xs font-bold leading-tight mt-0.5 text-white">
                DODGING Plane <span className="text-rose-300 font-mono underline">{dodgeAlert.target}</span>
              </p>
              <span className="text-[9px] text-rose-300/80 font-mono block mt-0.5">
                Proximity: {dodgeAlert.distance}m • Autonomous Evasion Swerve Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Division Root */}
      <div id={mapContainerId} className="w-full h-full bg-zinc-900" />

      {/* Custom rotor/wobble styling injected directly on client side */}
      <style>{`
        @keyframes spin-rotor {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-blades {
          animation: spin-rotor 0.08s linear infinite;
        }
        .custom-leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        @keyframes wiggle-car {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-1px) rotate(1deg); }
        }
        .wobble-anim {
          animation: wiggle-car 1.8s ease-in-out infinite;
        }
        /* Custom map markers and map scroll bars styling */
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
