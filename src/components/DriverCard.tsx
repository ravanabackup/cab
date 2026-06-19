import React, { useState } from "react";
import { 
  Phone, MessageSquare, ShieldAlert, ChevronDown, ChevronUp, Navigation2, 
  TrendingUp, Award, Clock, Star, MapPin, CheckCircle, ShieldCheck
} from "lucide-react";
import { Driver, RideOption } from "../types";

interface DriverCardProps {
  driver: Driver;
  activeVehicleType: RideOption | null;
  tripStatus: "idle" | "finding_driver" | "driver_en_route" | "trip_in_progress" | "trip_complete";
  speed: number;
  distanceRemainingKm: number;
  etaSeconds: number;
  currentSignalState: string;
  followDriver: boolean;
  onToggleFollowDriver: () => void;
  onCancel: () => void;
  onBeginTrip: () => void; // Trigger en route -> trip in progress transition
  onCompleteTrip: () => void; // Trigger trip complete
  pickupWaitCountdown: number | null;
  speedMultiplier?: number;
  onToggleSpeedMultiplier?: () => void;
}

export default function DriverCard({
  driver,
  activeVehicleType,
  tripStatus,
  speed,
  distanceRemainingKm,
  etaSeconds,
  currentSignalState,
  followDriver,
  onToggleFollowDriver,
  onCancel,
  onBeginTrip,
  onCompleteTrip,
  pickupWaitCountdown,
  speedMultiplier = 1.0,
  onToggleSpeedMultiplier,
}: DriverCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  // Calculated dynamic G-force based on custom jet speed
  const isJet = activeVehicleType?.isJet;
  const calculateGForce = () => {
    if (!isJet) return 1.0;
    if (speed <= 3) return 1.0;
    // 1G baseline up to 4.2G for maximum cruise speed (1,236 km/h)
    const baseG = 1.0 + (speed / 1236) * 3.2;
    // Adding micro vibratory fluctuations for sensory feedback representation
    const jitter = Math.sin(Date.now() / 250) * 0.05;
    return parseFloat(Math.min(5.0, Math.max(1.0, baseG + jitter)).toFixed(2));
  };
  const gForceVal = calculateGForce();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages((prev) => [...prev, chatInput.trim()]);
    setChatInput("");
  };

  const minutesLeft = Math.ceil(etaSeconds / 60);

  return (
    <div 
      id="driver-tracking-panel"
      className="bg-black/95 border border-zinc-850 rounded-2xl shadow-2xl p-4 text-white overflow-hidden backdrop-blur-md animate-fade-in"
    >
      {/* 1. PRIMARY EN ROUTE TRACKING HEADER */}
      <div className="flex justify-between items-start pb-3 border-b border-zinc-850">
        <div>
          <span className="text-[10px] font-bold font-mono text-amber-500 uppercase tracking-widest block">
            {tripStatus === "driver_en_route" ? (pickupWaitCountdown !== null ? "Waiting" : "Driver Arriving") : "Trip In Progress"}
          </span>
          <h4 className="text-sm font-bold mt-0.5 flex items-center gap-1.5 font-sans">
            {tripStatus === "driver_en_route" ? (
              pickupWaitCountdown !== null ? (
                <>Status: <span className="text-amber-500">Boarding Wait</span></>
              ) : (
                <>Arriving in <span className="text-amber-500">{minutesLeft} min</span></>
              )
            ) : (
              <>Destination in <span className="text-emerald-500">{minutesLeft} min</span></>
            )}
          </h4>
        </div>
        
        {/* Dynamic Speedometer & State indicator */}
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${speed > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
            <span>{speed} km/h</span>
          </div>
          <p className="text-[9px] text-zinc-500 font-mono mt-1">{distanceRemainingKm} km remnants</p>
        </div>
      </div>

      {/* G-FORCE TELEMETRY GRAPHICS & METRICS */}
      {isJet && (
        <div className="mt-3 p-3 bg-gradient-to-r from-purple-950/20 to-zinc-950/80 border border-purple-500/15 rounded-xl relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 p-1 text-[7px] font-mono text-purple-400 bg-purple-500/10 border-l border-b border-purple-500/20 rounded-bl tracking-widest uppercase">
            SUPERSONIC G-SUIT ACTIVE
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold font-mono text-purple-400 uppercase tracking-widest block">GRAVITATIONAL LOAD</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black font-mono tracking-tight text-white">
                  {gForceVal} <span className="text-[10px] text-purple-500 font-normal">G</span>
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">
                  {gForceVal > 3.5 ? "🔥 HIGH GYRO ACCEL" : gForceVal > 1.2 ? "⚡ CLIMB THRUST" : "🛰️ CALIBRATION"}
                </span>
              </div>
            </div>
            
            {/* Minimalist modern gauge display with 10 ticks */}
            <div className="flex gap-0.5 items-end h-5 w-24 bg-zinc-900/60 p-1 rounded-md border border-zinc-800/40">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => {
                const tickG = 1.0 + (tick / 10) * 4.0; // 1G to 5G
                const isActive = gForceVal >= tickG;
                return (
                  <div 
                    key={tick} 
                    className={`flex-1 rounded-sm transition-all duration-300 ${
                      isActive 
                        ? tick > 8 
                          ? "bg-rose-500 h-full animate-pulse" 
                          : tick > 6 
                          ? "bg-purple-500 h-[80%]" 
                          : "bg-indigo-500 h-[60%]"
                        : "bg-zinc-800 h-[20%]"
                    }`} 
                  />
                );
              })}
            </div>
          </div>
          
          {/* Status micro lines */}
          <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono mt-2 pt-1.5 border-t border-zinc-900">
            <span>MACH SPEED: {(speed / 1225).toFixed(2)}M</span>
            <span>AIR DENSITY: 0.12 kg/m³</span>
            <span>THRUST VECTOR: ±15°</span>
          </div>
        </div>
      )}

      {/* VELOCITY OVERRIDE CONTROL BUTTON */}
      {onToggleSpeedMultiplier && (
        <div className="mt-3">
          <button
            onClick={onToggleSpeedMultiplier}
            className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between text-xs transition-all duration-300 select-none cursor-pointer ${
              speedMultiplier > 1.0 
                ? isJet
                  ? "bg-purple-950/45 border-purple-500/70 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:bg-purple-900/40"
                  : "bg-amber-950/45 border-amber-500/70 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:bg-amber-900/40"
                : "bg-zinc-950/80 border-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${speedMultiplier > 1.0 ? isJet ? 'bg-purple-500/10 text-purple-300' : 'bg-amber-500/10 text-amber-300' : 'bg-zinc-900 text-zinc-500'}`}>
                <TrendingUp className={`w-4 h-4 ${speedMultiplier > 1.0 ? "animate-bounce" : ""}`} />
              </div>
              <div className="text-left font-sans">
                <span className="font-bold block text-[10px] tracking-wider uppercase">Velocity Speed Override</span>
                <span className="text-[9px] text-zinc-500 block font-mono">Tap to multiply cruise speed parameters</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                speedMultiplier > 1.0 
                  ? isJet 
                    ? "bg-purple-500/20 text-purple-300" 
                    : "bg-amber-500/20 text-amber-300" 
                  : "bg-zinc-900 text-zinc-500"
              }`}>
                {speedMultiplier.toFixed(1)}x
              </span>
              <span className="text-[10px] text-zinc-500 font-bold font-sans">►</span>
            </div>
          </button>
        </div>
      )}

      {/* WAITING COUNTDOWN OVERLAY CONTAINER */}
      {pickupWaitCountdown !== null && (
        <div className="bg-amber-950/40 border border-amber-900/50 p-3 rounded-xl mt-3 animate-pulse flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 animate-spin-slow" />
            <div>
              <span className="font-bold text-amber-500 block">Arrived at Pickup</span>
              <span className="text-[10px] text-zinc-400">Boarding in progress...</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-base font-bold text-amber-400">
              {Math.floor(pickupWaitCountdown / 60)}:{(pickupWaitCountdown % 60).toString().padStart(2, "0")}
            </span>
            <span className="text-[9px] text-zinc-500 block uppercase font-mono tracking-wider">Seconds Left</span>
          </div>
        </div>
      )}

      {/* 2. DYNAMICS: Traffic Lights readout & Follow Cam option */}
      <div className="py-2.5 flex items-center justify-between text-xs border-b border-zinc-850 bg-zinc-950/40 px-3 -mx-4">
        <div className="flex items-center gap-2">
          {currentSignalState.includes("RED") ? (
            <div className="flex items-center gap-1 text-rose-500 font-semibold font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Light Red (Stopping...)</span>
            </div>
          ) : currentSignalState.includes("YELLOW") ? (
            <div className="flex items-center gap-1 text-amber-400 font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Light Amber (Slowing...)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Active Way Clear (Cruising)</span>
            </div>
          )}
        </div>

        {/* COMPASS FOLLOW DRIVER GPS OPTION */}
        <button 
          onClick={onToggleFollowDriver}
          className={`px-3 py-1 bg-zinc-900 hover:bg-zinc-850 rounded-lg text-[10px] uppercase font-bold tracking-wider transition border flex items-center gap-1.5 ${
            followDriver 
              ? "border-emerald-500/50 text-emerald-400 font-sans" 
              : "border-zinc-800 text-zinc-400"
          }`}
        >
          <Navigation2 className={`w-3.5 h-3.5 transform ${followDriver ? 'rotate-45 text-emerald-500 animate-pulse' : ''}`} />
          {followDriver ? "Tracking Driver" : "Follow Car"}
        </button>
      </div>

      {/* 3. ASSIGNED DRIVER BIO info */}
      <div className="flex items-center justify-between py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={driver.avatar} 
              alt={driver.name} 
              className="w-11 h-11 rounded-full object-cover border border-zinc-700 shadow"
            />
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-[8px] px-1 rounded font-bold text-black border border-black">
              ★ {driver.rating}
            </span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white tracking-wide">{driver.name}</h4>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
              <span>{driver.vehicleModel}</span>
              <span>•</span>
              <span className="bg-zinc-800 text-zinc-200 px-1 py-0.2 rounded font-sans">{driver.plateNumber}</span>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              👑 Assigned {activeVehicleType?.name || "Pilot"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Quick Communication action nodes */}
          <a
            href={`tel:${driver.phoneNumber}`}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-100 transition border border-zinc-800"
            title="Call driver"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
          </a>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-sky-400 transition border border-zinc-800 flex items-center gap-1"
            title="Message pilot"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. CHAT MESSAGING BOX EXPANSION NODES */}
      {expanded && (
        <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3 mt-1 mb-3 animate-fade-in text-xs">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono flex items-center justify-between border-b border-zinc-900 pb-1.5">
            <span>Secure Chat with {driver.name}</span>
            <span>256-bit encryption</span>
          </div>
          
          <div className="max-h-[110px] overflow-y-auto space-y-2 font-medium">
            <div className="text-zinc-500 text-[10px] italic">No previous call logs. Communication is recorded for safety.</div>
            
            {messages.map((m, i) => (
              <div key={i} className="flex justify-end">
                <div className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1.5 rounded-xl max-w-[85%] text-right font-sans font-medium">
                  {m}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-1.5 border-t border-zinc-900 pt-2">
            <input 
              type="text" 
              placeholder="Type hidden message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-650 focus:outline-none"
            />
            <button 
              type="submit" 
              className="bg-zinc-800 text-zinc-200 px-3 py-1 text-xs font-bold rounded-lg hover:bg-zinc-700"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* 5. SOS SAFETY BUTTON HUB */}
      <div className="flex gap-2.5 mt-2">
        <button 
          onClick={() => {
            alert("Emergency SOS Activated: Simulating instant dispatch of security team to your exact coordinates!");
          }}
          className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 text-[10px] font-bold uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Emergency SOS
        </button>

        {/* SIMULATOR CONTROLS: Lets passenger advance trip manually! */}
        {tripStatus === "driver_en_route" && (
          <button 
            onClick={onBeginTrip}
            className="flex-1 py-2.5 bg-emerald-500 text-black text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition shadow flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Board Vehicle
          </button>
        )}

        {tripStatus === "trip_in_progress" && (
          <button 
            onClick={onCompleteTrip}
            className="flex-1 py-2.5 bg-emerald-500 text-black text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition shadow flex items-center justify-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Complete Trip
          </button>
        )}

        <button 
          onClick={onCancel}
          className="px-4 py-2.5 bg-transparent hover:bg-zinc-900 border border-zinc-850 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-xl transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
