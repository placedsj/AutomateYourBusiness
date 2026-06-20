import React, { useState } from "react";
import { CheckIn } from "../types";
import { User, Clock, MapPin, UserCheck, UserMinus, MessageSquare, History, Play, CheckCircle } from "lucide-react";

interface TimeClockProps {
  checkins: CheckIn[];
  onClockIn: (employeeName: string, jobAddress: string, notes: string) => void;
  onClockOut: (id: string) => void;
  isLoading: boolean;
}

export const TimeClock: React.FC<TimeClockProps> = ({
  checkins,
  onClockIn,
  onClockOut,
  isLoading
}) => {
  const [employeeName, setEmployeeName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-configured crew list to encourage easy selection
  const CREW_LIST = ["John Thompson", "Dave Miller", "Steve Carey", "Paul Carey"];
  const JOB_PRESETS = ["12 Fieldcrest, Quispamsis, NB", "100 Main Street, Quispamsis, NB", "41 Bayside Drive, Saint John, NB"];

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim()) return;

    setIsSubmitting(true);
    try {
      await onClockIn(employeeName, jobAddress, notes);
      setEmployeeName("");
      setJobAddress("");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const calculateHours = (startIso: string, endIso: string) => {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return hours.toFixed(2);
  };

  const activeCheckIns = checkins.filter((c) => c.active);
  const pastCheckIns = checkins.filter((c) => !c.active);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Left Side: Clock In Form */}
      <div className="lg:col-span-1 space-y-6">
        <form onSubmit={handleClockIn} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black uppercase text-[#07002f] tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 font-display">
            <Clock className="w-5 h-5 text-[#00a0df]" />
            Crew Check-In
          </h2>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              Crew Member Name
              <span className="text-[10px] lowercase normal-case text-slate-400 font-normal">Select below or type</span>
            </label>
            <input
              type="text"
              required
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Type member name..."
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors"
            />
            {/* Quick selectors */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CREW_LIST.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setEmployeeName(name)}
                  className={`text-[10px] font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                    employeeName === name
                      ? "bg-[#00a0df] text-white border-[#00a0df]"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Active Job Location
            </label>
            <input
              type="text"
              value={jobAddress}
              onChange={(e) => setJobAddress(e.target.value)}
              placeholder="e.g. 12 Fieldcrest, Quispamsis, NB"
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors"
            />
            <div className="flex flex-col gap-1 mt-2">
              {JOB_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setJobAddress(preset)}
                  className="text-[10px] text-left text-slate-400 hover:text-[#00a0df] hover:underline overflow-hidden text-ellipsis whitespace-nowrap block"
                >
                  📍 {preset.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Task Notes / Focus
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fastening underlayment, cleaning up lawn..."
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00a0df] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#00a0df] hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            {isSubmitting ? "Registering..." : "Clock On"}
          </button>
        </form>
      </div>

      {/* 2. Middle & Right Side: Active Members & History */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Active on clock */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black uppercase text-[#07002f] tracking-wide flex items-center gap-2 font-display">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Active Crew members On-The-Clock
            </h2>
            <span className="bg-green-50 text-green-600 border border-green-150 text-xs px-2.5 py-1 rounded-full font-bold">
              {activeCheckIns.length} on duty
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCheckIns.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-slate-800 text-sm tracking-wide">{item.employeeName}</div>
                    <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                      <Play className="w-2.5 h-2.5 fill-green-600 animate-pulse" />
                      Active
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00a0df]" />
                      Checked in at {formatTime(item.checkInTime)} (Today)
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      {item.jobAddress}
                    </p>
                    {item.notes && (
                      <p className="flex items-start gap-1.5 italic bg-[#e8f6fd] p-2.5 rounded-lg border border-[#cae8f8]/50 text-[#006eaa] leading-normal text-[11px]">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onClockOut(item.id)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 py-2 rounded-lg transition-colors font-semibold cursor-pointer"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  Clock Off
                </button>
              </div>
            ))}

            {activeCheckIns.length === 0 && (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                No crew members currently clocked on. Use the form on the left to check in.
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-black uppercase text-[#07002f] tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 font-display">
            <History className="w-5 h-5 text-slate-400" />
            Duty Logs & Shift History
          </h2>

          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
            {pastCheckIns.map((item) => (
              <div
                key={item.id}
                className="bg-[#f8fafc]/85 border border-slate-200 rounded-lg p-3.5 text-xs flex justify-between items-center gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{item.employeeName}</span>
                    <span className="text-[10px] text-slate-450 font-mono">{formatDate(item.checkInTime)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatTime(item.checkInTime)} - {item.checkOutTime ? formatTime(item.checkOutTime) : "..."}
                    </span>
                    <span className="flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]" title={item.jobAddress}>
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.jobAddress.split(",")[0]}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-slate-400 italic truncate" title={item.notes}>
                      "{item.notes}"
                    </p>
                  )}
                </div>
                {item.checkOutTime && (
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-[#006eaa] text-sm">
                      {calculateHours(item.checkInTime, item.checkOutTime)} hrs
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold flex items-center gap-0.5 justify-end">
                      <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                      Closed
                    </div>
                  </div>
                )}
              </div>
            ))}

            {pastCheckIns.length === 0 && (
              <p className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-slate-200">
                No past check-ins recorded. History will populate as members clocked off.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
