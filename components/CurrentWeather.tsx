
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { WeatherData, GeocodingResult } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { getWeatherDescription } from '../services/weatherService';
import { Wind, Droplets, Thermometer, ArrowUp, ArrowDown, Sun, Umbrella, Navigation, Car, ExternalLink, Briefcase, Home, ArrowLeftRight, Loader2, RotateCw, Activity } from 'lucide-react';

interface CurrentWeatherProps {
  data: WeatherData;
  locationName: string;
  homeLocation?: GeocodingResult | null;
  workLocation?: GeocodingResult | null;
}

export const CurrentWeather: React.FC<CurrentWeatherProps> = ({ 
  data, 
  locationName, 
  homeLocation, 
  workLocation 
}) => {
  const current = data.current;
  const today = data.daily;
  const { label } = getWeatherDescription(current.weather_code);

  // Get current hour rain probability
  const currentHourIndex = useMemo(() => {
    const directMatch = data.hourly.time.indexOf(current.time);
    if (directMatch !== -1) return directMatch;
    const hourKey = current.time.slice(0, 13);
    return data.hourly.time.findIndex(t => t.startsWith(hourKey));
  }, [current.time, data.hourly.time]);

  const precipProb = currentHourIndex !== -1 ? data.hourly.precipitation_probability[currentHourIndex] : 0;

  // Commute Direction State
  const [isWorkToHome, setIsWorkToHome] = useState(false);
  const [commuteDuration, setCommuteDuration] = useState<number | null>(null);
  const [loadingCommute, setLoadingCommute] = useState(false);
  const [isEstimate, setIsEstimate] = useState(false);

  // Automatically set default direction based on current location context
  useEffect(() => {
    if (workLocation && locationName === workLocation.name) {
      setIsWorkToHome(true);
    } else {
      setIsWorkToHome(false);
    }
  }, [locationName, workLocation]);

  // Smart Fallback calculation if API fails
  const calculateFallbackDuration = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;

    // Variable speed estimation based on distance
    let speedKmh = 30; // City driving (short trips)
    if (distanceKm > 5) speedKmh = 45; // Mixed
    if (distanceKm > 20) speedKmh = 80; // Highway
    if (distanceKm > 100) speedKmh = 100; // Major Highway

    const routeDist = distanceKm * 1.3; // Winding factor
    const durationHours = routeDist / speedKmh;
    
    return Math.round(durationHours * 3600); // return seconds
  };

  // Fetch real driving duration using OSRM with timeout and fallback
  const fetchCommuteTime = useCallback(async () => {
    // If locations aren't set, reset and return
    if (!homeLocation || !workLocation) {
      setCommuteDuration(null);
      return;
    }
    
    // Safety check for valid coordinates
    if (
      typeof homeLocation.latitude !== 'number' || 
      typeof homeLocation.longitude !== 'number' || 
      typeof workLocation.latitude !== 'number' || 
      typeof workLocation.longitude !== 'number'
    ) return;

    setLoadingCommute(true);

    const origin = isWorkToHome ? workLocation : homeLocation;
    const destination = isWorkToHome ? homeLocation : workLocation;

    // 1. Check if same location (effectively 0 distance)
    const distSq = Math.pow(origin.latitude - destination.latitude, 2) + Math.pow(origin.longitude - destination.longitude, 2);
    if (distSq < 0.00001) {
      setCommuteDuration(0);
      setIsEstimate(false);
      setLoadingCommute(false);
      return;
    }

    try {
      // OSRM requires longitude,latitude order
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
      
      // Use AbortController for 3s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, { 
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        setCommuteDuration(data.routes[0].duration);
        setIsEstimate(false);
      } else {
        throw new Error('No route found by API');
      }
    } catch (error) {
      // API failed or timed out -> Use Smart Fallback
      // console.warn("Commute API failed, using fallback:", error);
      const fallback = calculateFallbackDuration(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
      setCommuteDuration(fallback);
      setIsEstimate(true);
    } finally {
      setLoadingCommute(false);
    }
  }, [homeLocation, workLocation, isWorkToHome]);

  // Trigger fetch on mount, direction change, or location update
  useEffect(() => {
    fetchCommuteTime();
    
    // Auto-refresh every 5 minutes
    const intervalId = setInterval(fetchCommuteTime, 300000);
    return () => clearInterval(intervalId);
  }, [fetchCommuteTime]);

  // Commute Info Object Construction
  const commuteInfo = useMemo(() => {
    if (!homeLocation || !workLocation) return null;

    const origin = isWorkToHome ? workLocation : homeLocation;
    const destination = isWorkToHome ? homeLocation : workLocation;
    const directionLabel = isWorkToHome ? "To Home" : "To Work";
    const Icon = isWorkToHome ? Home : Briefcase;

    // Formatting duration
    let timeString = "-- min";
    if (commuteDuration !== null) {
      const minutes = Math.round(commuteDuration / 60);
      if (minutes < 60) {
        timeString = `${minutes} min`;
      } else {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        timeString = `${h}h ${m}m`;
      }
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;

    return { label: directionLabel, timeString, mapsUrl, Icon };
  }, [homeLocation, workLocation, isWorkToHome, commuteDuration]);

  // AQI Helper
  const getAqiInfo = (aqi?: number) => {
    if (aqi === undefined) return { label: 'Unknown', color: 'text-slate-400' };
    if (aqi <= 50) return { label: 'Good', color: 'text-emerald-400' };
    if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-400' };
    if (aqi <= 150) return { label: 'Sensitive', color: 'text-orange-400' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'text-rose-400' };
    if (aqi <= 300) return { label: 'Very Bad', color: 'text-purple-400' };
    return { label: 'Hazardous', color: 'text-rose-600' };
  };

  const aqiInfo = getAqiInfo(current.us_aqi);

  return (
    <div className="glass-panel rounded-3xl p-8 text-white relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 pt-4 md:pt-0">
        
        {/* Main Info */}
        <div className="text-center md:text-left w-full md:w-auto">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight truncate max-w-[250px] sm:max-w-md" title={locationName}>
              {locationName}
            </h2>
          </div>
          <p className="text-slate-400 text-sm mb-6 font-medium uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              timeZone: data.timezone || undefined
            })}
          </p>
          
          <div className="flex items-center justify-center md:justify-start gap-6 mb-2">
             <span className="text-8xl font-black bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent tracking-tighter">
               {Math.round(current.temperature_2m)}{"\u00B0"}
             </span>
             <div className="flex flex-col items-center">
                <WeatherIcon code={current.weather_code} isDay={current.is_day} size={72} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
             </div>
          </div>
          <p className="text-2xl font-medium text-indigo-200">{label}</p>
        </div>

        {/* Detailed Grid */}
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
          
          {/* Real Feel */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-start min-w-[140px] backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Thermometer size={16} className="text-rose-400" />
              <span className="text-xs uppercase font-bold tracking-wider">Real Feel</span>
            </div>
            <span className="text-2xl font-bold">{Math.round(current.apparent_temperature)}{"\u00B0"}</span>
          </div>

          {/* Wind */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-start min-w-[140px] backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Wind size={16} className="text-sky-400" />
              <span className="text-xs uppercase font-bold tracking-wider">Wind</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{current.wind_speed_10m} <span className="text-sm font-normal text-slate-400">km/h</span></span>
              <Navigation 
                size={16} 
                className="text-slate-500" 
                style={{ transform: `rotate(${current.wind_direction_10m}deg)` }} 
              />
            </div>
          </div>

          {/* Rain */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-start min-w-[140px] backdrop-blur-sm hover:bg-white/10 transition-colors">
             <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Umbrella size={16} className="text-indigo-400" />
              <span className="text-xs uppercase font-bold tracking-wider">Precipitation</span>
            </div>
            <div className="flex flex-col">
               <span className="text-2xl font-bold">{current.precipitation} <span className="text-sm font-normal text-slate-400">mm</span></span>
               <span className="text-xs text-indigo-300 font-bold">{precipProb}% Chance</span>
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-start min-w-[140px] backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Droplets size={16} className="text-cyan-400" />
              <span className="text-xs uppercase font-bold tracking-wider">Humidity</span>
            </div>
            <span className="text-2xl font-bold">{current.relative_humidity_2m}%</span>
          </div>

          {/* UV Index */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-start min-w-[140px] backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Sun size={16} className="text-amber-400" />
              <span className="text-xs uppercase font-bold tracking-wider">UV Index</span>
            </div>
            <span className="text-2xl font-bold">{current.uv_index.toFixed(1)}</span>
          </div>

          {/* Air Quality (AQI) */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-start min-w-[140px] backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Activity size={16} className="text-emerald-400" />
              <span className="text-xs uppercase font-bold tracking-wider">Air Quality</span>
            </div>
            <div className="flex flex-col">
               <span className="text-2xl font-bold">{current.us_aqi ?? '--'}</span>
               <span className={`text-xs font-bold ${aqiInfo.color}`}>{aqiInfo.label}</span>
            </div>
          </div>

          {/* High / Low */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-start min-w-[140px] backdrop-blur-sm hover:bg-white/10 transition-colors">
             <div className="flex items-center gap-2 text-slate-400 mb-2">
               <span className="text-xs uppercase font-bold tracking-wider">High / Low</span>
             </div>
             <div className="flex items-center justify-between w-full px-1">
               <div className="flex items-center text-rose-300 gap-1.5">
                  <ArrowUp size={18} />
                  <span className="text-xl font-bold">{Math.round(today.temperature_2m_max[0])}{"\u00B0"}</span>
               </div>
               <div className="h-6 w-px bg-white/10"></div>
               <div className="flex items-center text-teal-300 gap-1.5">
                  <ArrowDown size={18} />
                  <span className="text-xl font-bold">{Math.round(today.temperature_2m_min[0])}{"\u00B0"}</span>
               </div>
             </div>
          </div>

          {/* Commute Card (Conditional) */}
          {commuteInfo && (
            <div className="col-span-2 relative bg-gradient-to-r from-indigo-600/20 to-sky-600/20 rounded-2xl border border-indigo-500/30 flex items-center justify-between hover:bg-white/10 transition-all group/commute overflow-hidden">
              {/* Clickable Area for Maps */}
              <a 
                href={commuteInfo.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-0"
                aria-label="Open route in Google Maps"
              >
                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover/commute:opacity-100 transition-opacity"></div>
              </a>
              
              <div className="flex flex-col relative z-10 p-4 pointer-events-none">
                 <div className="flex items-center gap-2 text-indigo-200 mb-1">
                    <Car size={16} className="text-indigo-300" />
                    <span className="text-xs uppercase font-bold tracking-wider">Commute</span>
                    {loadingCommute && <Loader2 size={12} className="animate-spin text-indigo-300" />}
                    {!loadingCommute && isEstimate && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 rounded font-bold">EST</span>}
                 </div>
                 <div className="flex items-baseline gap-2">
                   {loadingCommute && !commuteDuration ? (
                     <span className="text-xl font-bold text-white/50 animate-pulse">Calculating...</span>
                   ) : (
                     <span className="text-2xl font-bold text-white">{commuteInfo.timeString}</span>
                   )}
                   <span className="text-sm font-medium text-slate-300 flex items-center gap-1">
                      {commuteInfo.label} <commuteInfo.Icon size={12} />
                   </span>
                 </div>
              </div>
              
              <div className="flex items-center gap-2 pr-4 relative z-20">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fetchCommuteTime();
                  }}
                  className={`p-2 bg-white/10 hover:bg-emerald-500/50 rounded-full text-white transition-colors shadow-sm backdrop-blur-md ${loadingCommute ? 'animate-spin' : ''}`}
                  title="Refresh Traffic"
                >
                  <RotateCw size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsWorkToHome(!isWorkToHome);
                  }}
                  className="p-2 bg-white/10 hover:bg-indigo-500/50 rounded-full text-indigo-100 transition-colors shadow-sm backdrop-blur-md"
                  title="Switch direction"
                >
                  <ArrowLeftRight size={16} />
                </button>
                <a 
                  href={commuteInfo.mapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
