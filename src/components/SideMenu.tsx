import React, { useState, useEffect } from "react";
import { 
  User, Wallet, Landmark, History, Gift, Shield, Settings, HelpCircle, 
  MapPin, X, ChevronRight, LogOut, Award, Leaf, TrendingUp, Wrench, Flame 
} from "lucide-react";
import { TripHistory, RideClass } from "../types";
import { MOCK_SAVED_PLACES, MOCK_HISTORY } from "../utils/mockData";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSavedPlace: (place: { name: string; address: string; lat: number; lng: number }, type: "pickup" | "dropoff") => void;
  tripHistory: TripHistory[];
  promoCodes: { code: string; discount: number; description: string }[];
  onApplyPromo: (code: string) => void;
  isJetMode?: boolean;
}

export default function SideMenu({ 
  isOpen, 
  onClose, 
  onSelectSavedPlace, 
  tripHistory, 
  promoCodes, 
  onApplyPromo,
  isJetMode = false
}: SideMenuProps) {
  const [promoInput, setPromoInput] = useState("");
  const [promoAlert, setPromoAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Simulated live engine diagnostics
  const [engineHealth, setEngineHealth] = useState(98.7);
  const [timeUntilService, setTimeUntilService] = useState(48.5);

  useEffect(() => {
    if (!isOpen) return;
    // Add realistic floating diagnostic values
    const interval = setInterval(() => {
      setEngineHealth((prev) => {
        const delta = (Math.random() - 0.5) * 0.04;
        return parseFloat(Math.min(100, Math.max(90, prev + delta)).toFixed(2));
      });
      setTimeUntilService((prev) => {
        // Slowly tick down diagnostic hours
        return parseFloat(Math.max(1, prev - 0.002).toFixed(4));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = promoInput.trim().toUpperCase();
    if (formatted === "UBER10" || formatted === "FIRST") {
      onApplyPromo(formatted);
      setPromoAlert({ type: "success", text: `Promo "${formatted}" applied successfully!` });
      setTimeout(() => setPromoAlert(null), 3000);
      setPromoInput("");
    } else {
      setPromoAlert({ type: "error", text: "Invalid promo code. Please check and try again." });
      setTimeout(() => setPromoAlert(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div 
        id="side-menu-drawer"
        className="fixed top-0 left-0 h-full w-full max-w-[420px] bg-zinc-950 text-white z-[10000] shadow-2xl flex flex-col border-r border-zinc-800/80 overflow-y-auto transition-transform"
      >
        {/* Header Profile section */}
        <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 pt-10 border-b border-zinc-800/60">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800 transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>

          <div className="flex items-center gap-4 mt-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-500 to-amber-300 p-[2px]">
                <img 
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200" 
                  alt="Elite Guest" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-zinc-950 shadow">
                <Award className="w-2.5 h-2.5" /> VIP
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Elite Guest
              </h3>
              <p className="text-xs text-zinc-400">Platinum Tier Member</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono px-2 py-0.5 rounded-full">
                  Tier: Royal Elite
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-zinc-800/50 text-center">
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/40">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Trips</span>
              <p className="text-base font-bold text-amber-500">142</p>
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/40">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono flex items-center justify-center gap-0.5">
                Saved
              </span>
              <p className="text-base font-bold text-emerald-500">₹24,500</p>
            </div>
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/40">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono flex items-center justify-center gap-0.5">
                <Leaf className="w-2.5 h-2.5 text-emerald-400 inline" /> CO₂
              </span>
              <p className="text-base font-bold text-emerald-400">480kg</p>
            </div>
          </div>
        </div>

        {/* Wallet balance */}
        <div className="p-5 border-b border-zinc-800/40 bg-zinc-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 font-mono">AVAILABLE BALANCE</span>
                <p className="text-lg font-bold font-mono tracking-tight text-zinc-100">₹12,850.00</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-amber-500 hover:text-amber-400 hover:underline transition">
              Manage
            </button>
          </div>
        </div>

        {/* Main interactive items */}
        <div className="flex-1 p-6 space-y-6">
          {/* Supersonic Jet Maintenance Section */}
          <div className="p-4 rounded-2xl border bg-zinc-950 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isJetMode ? 'bg-purple-500/10 text-purple-400 border border-purple-550/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-sans tracking-wide text-zinc-200">Jet Diagnostics</h4>
                  <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Hangar Bay 07</p>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide ${
                  isJetMode 
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse" 
                    : "bg-zinc-900 text-zinc-500 border border-zinc-850"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isJetMode ? 'bg-purple-400' : 'bg-zinc-600'}`} />
                  {isJetMode ? "FLIGHT MODE ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              {/* Engine Health */}
              <div>
                <div className="flex justify-between items-center text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-purple-400" /> ENGINE HEALTH:</span>
                  <span className={`font-bold ${isJetMode ? 'text-purple-400 font-extrabold' : 'text-zinc-500'}`}>
                    {isJetMode ? `${engineHealth}%` : "100.00% [CALIBRATED]"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isJetMode ? 'bg-gradient-to-r from-purple-500 to-rose-500' : 'bg-zinc-700'
                    }`} 
                    style={{ width: isJetMode ? `${engineHealth}%` : '100%' }}
                  />
                </div>
              </div>

              {/* Time until service */}
              <div className="flex justify-between items-center py-2 border-t border-zinc-900/60 text-zinc-400">
                <span>TIME UNTIL SERVICE:</span>
                <span className={`font-bold font-sans ${isJetMode ? 'text-purple-400' : 'text-zinc-500'}`}>
                  {isJetMode ? `${timeUntilService.toFixed(2)} hrs` : "50.00 hrs [STANDBY]"}
                </span>
              </div>

              {/* Auxiliary systems */}
              <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                <div className="p-1.5 rounded-lg bg-zinc-900/30 border border-zinc-900 flex flex-col">
                  <span className="text-zinc-500">THRUST VECTOR:</span>
                  <span className={`font-medium ${isJetMode ? 'text-emerald-400' : 'text-zinc-600'}`}>{isJetMode ? "SUPER-SONIC [1.2M]" : "STOWED"}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-zinc-900/30 border border-zinc-900 flex flex-col">
                  <span className="text-zinc-500">ANTI-G SYSTEM:</span>
                  <span className={`font-medium ${isJetMode ? 'text-emerald-400' : 'text-zinc-600'}`}>{isJetMode ? "PRESSURIZED" : "STANDBY"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Places shortcuts */}
          <div>
            <h4 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider mb-3">Saved Places (Bangalore HQ)</h4>
            <div className="space-y-2">
              {MOCK_SAVED_PLACES.map((place) => (
                <div 
                  key={place.name}
                  className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700/60 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-amber-500 transition">{place.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{place.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-2">
                    <button 
                      onClick={() => onSelectSavedPlace(place, "pickup")}
                      className="text-[10px] bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
                    >
                      Pickup
                    </button>
                    <button 
                      onClick={() => onSelectSavedPlace(place, "dropoff")}
                      className="text-[10px] bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 px-2 py-1 rounded"
                    >
                      Drop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promo code redemption */}
          <div>
            <h4 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider mb-3">Promotions & Vouchers</h4>
            <form onSubmit={handlePromoSubmit} className="flex gap-2">
              <input 
                type="text" 
                placeholder="PROMO CODE (e.g. UBER10)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                className="flex-1 text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button 
                type="submit" 
                className="bg-amber-500 text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-amber-400 transition"
              >
                Apply
              </button>
            </form>
            {promoAlert && (
              <p className={`text-[11px] mt-2 font-medium ${
                promoAlert.type === "success" ? "text-emerald-500" : "text-rose-500"
              }`}>
                {promoAlert.text}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
              <Gift className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-zinc-400 font-mono">
                Active Code: <strong className="text-amber-500">UBER10</strong> (10% Off) or <strong className="text-amber-500">FIRST</strong> (15% Off)
              </span>
            </div>
          </div>

          {/* Past History */}
          <div>
            <h4 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider mb-3">Ride History</h4>
            <div className="space-y-2">
              {tripHistory.map((trip) => (
                <div 
                  key={trip.id}
                  className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-900/60 text-xs flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="font-mono text-[10px]">{trip.date}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      trip.status === "Completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {trip.status}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">
                      <span className="text-emerald-500">From:</span> {trip.pickup}
                    </p>
                    <p className="font-medium text-zinc-200">
                      <span className="text-amber-500">To:</span> {trip.dropoff}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] border-t border-zinc-800/50 pt-2 text-zinc-500">
                    <span>{trip.rideType}</span>
                    <span className="font-bold text-zinc-300 font-mono">₹{trip.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info panels */}
        <div className="p-6 bg-zinc-900/40 border-t border-zinc-850 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs text-zinc-400">
            <button className="flex items-center gap-2 hover:text-white transition">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Safety Toolkit</span>
            </button>
            <button className="flex items-center gap-2 hover:text-white transition">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Help Center</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-600 font-mono">
            <span>v1.2.0 Elite • Premium Member</span>
            <span>© 2026 Uber Inc.</span>
          </div>
        </div>
      </div>
    </>
  );
}
