
import React, { useState } from 'react';
import { WeatherData } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { getWeatherDescription } from '../services/weatherService';
import { Droplets, CalendarDays, Sun, Cloud, ChevronDown, ChevronUp, Wind, Thermometer, Umbrella, Navigation } from 'lucide-react';

interface DailyForecastProps {
  data: WeatherData;
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ data }) => {
  const [daysToShow, setDaysToShow] = useState<5 | 10>(5);
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null);

  const daily = data.daily;
  const indices = Array.from({ length: daysToShow }, (_, i) => i + 1); // Start from tomorrow (index 1)

  const toggleExpand = (index: number) => {
    setExpandedDayIndex(expandedDayIndex === index ? null : index);
  };

  // Helper to get hourly data for a specific date
  const getHourlyForDay = (dateStr: string) => {
    const targetDate = new Date(dateStr).toDateString();
    
    const hourlyIndices = data.hourly.time.reduce((acc, time, index) => {
      const d = new Date(time);
      if (d.toDateString() === targetDate) {
        acc.push(index);
      }
      return acc;
    }, [] as number[]);

    return hourlyIndices.map(idx => ({
      time: new Date(data.hourly.time[idx]).toLocaleTimeString([], { hour: 'numeric', hour12: true }),
      temp: Math.round(data.hourly.temperature_2m[idx]),
      weatherCode: data.hourly.weather_code[idx],
      precipProb: data.hourly.precipitation_probability[idx],
      precipMm: data.hourly.precipitation[idx],
      windSpeed: Math.round(data.hourly.wind_speed_10m[idx]),
      windDir: data.hourly.wind_direction_10m[idx],
      isDay: data.hourly.is_day[idx],
      cloudCover: data.hourly.cloud_cover ? data.hourly.cloud_cover[idx] : 0,
      realFeel: Math.round(data.hourly.apparent_temperature[idx]),
      uvIndex: data.hourly.uv_index[idx],
    }));
  };

  // Helper to format seconds into h m
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
  };

  return (
    <div className="glass-panel rounded-3xl p-5 md:p-8 w-full">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2.5 md:p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <CalendarDays size={24} className="md:w-7 md:h-7" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white">Daily Outlook</h3>
            <p className="text-slate-400 text-xs md:text-sm">Detailed forecast</p>
          </div>
        </div>
        <div className="flex bg-slate-800/50 rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setDaysToShow(5)}
            className={`px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
              daysToShow === 5 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white'
            }`}
          >
            5 Days
          </button>
          <button
            onClick={() => setDaysToShow(10)}
            className={`px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
              daysToShow === 10 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white'
            }`}
          >
            10 Days
          </button>
        </div>
      </div>

      {/* Desktop Table Headers */}
      <div className="hidden md:grid grid-cols-[1.2fr_1.8fr_1.2fr_1.2fr_0.8fr_1.2fr_1.2fr_0.4fr] gap-4 pb-4 border-b border-white/10 mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider px-4">
        <div>Date</div>
        <div>Forecast</div>
        <div>Precipitation</div>
        <div>Sky (Sun/Cloud)</div>
        <div>UV Index</div>
        <div>Real Feel</div>
        <div className="text-right">Temperature</div>
        <div></div>
      </div>

      <div className="space-y-4 md:space-y-3">
        {indices.map((i) => {
          if (!daily.time[i]) return null;
          
          const dateObj = new Date(daily.time[i]);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const fullDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
          const { label } = getWeatherDescription(daily.weather_code[i]);
          
          // Stats
          const precipProb = daily.precipitation_probability_max[i];
          const precipSum = daily.precipitation_sum[i];
          const max = Math.round(daily.temperature_2m_max[i]);
          const min = Math.round(daily.temperature_2m_min[i]);
          const feelMax = Math.round(daily.apparent_temperature_max[i]);
          const feelMin = Math.round(daily.apparent_temperature_min[i]);
          const uvMax = daily.uv_index_max[i];
          const sunshine = daily.sunshine_duration[i];
          
          // Calculate from hourly
          const hourlyData = getHourlyForDay(daily.time[i]);
          const avgCloudCover = hourlyData.length > 0 
             ? Math.round(hourlyData.reduce((sum, h) => sum + h.cloudCover, 0) / hourlyData.length) 
             : 0;
          
          // Calc Max Wind for Mobile View
          const maxWind = hourlyData.length > 0
             ? Math.max(...hourlyData.map(h => h.windSpeed))
             : 0;

          const isExpanded = expandedDayIndex === i;

          return (
            <div key={i} className={`rounded-3xl md:rounded-2xl transition-all duration-300 border ${
              isExpanded 
                ? 'bg-white/5 border-indigo-500/30 shadow-lg shadow-black/20' 
                : 'bg-white/5 md:bg-transparent border-white/5 md:border-transparent md:hover:bg-white/5 hover:border-white/5'
            }`}>
              
              {/* === MOBILE LAYOUT (Vertical List Card) === */}
              <div 
                onClick={() => toggleExpand(i)}
                className="md:hidden flex flex-col p-5 cursor-pointer"
              >
                {/* 1. Header: Day, Date, Icon, Temp */}
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h3 className="text-3xl font-bold text-white mb-1">{dayName}</h3>
                      <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">{fullDate}</p>
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                         <WeatherIcon code={daily.weather_code[i]} size={16} className="text-indigo-300" />
                         <span className="text-xs font-bold text-indigo-200">{label}</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-5xl font-bold text-white tracking-tighter">{max}°</span>
                      <span className="text-lg text-slate-400 font-medium mt-1">{min}° Low</span>
                   </div>
                </div>

                {/* 2. Detailed Vertical Stats List */}
                <div className="flex flex-col gap-3 bg-black/20 rounded-2xl p-5 border border-white/5 mb-2">
                   <MobileListRow 
                     icon={Thermometer} 
                     label="Real Feel" 
                     value={`${feelMax}° High / ${feelMin}° Low`} 
                     color="text-rose-400" 
                   />
                   <div className="h-px bg-white/5 w-full" />
                   
                   <MobileListRow 
                     icon={Droplets} 
                     label="Rain Chance" 
                     value={`${precipProb}%`} 
                     color="text-sky-400" 
                   />
                   <div className="h-px bg-white/5 w-full" />

                   <MobileListRow 
                     icon={Umbrella} 
                     label="Rain Volume" 
                     value={`${precipSum} mm`} 
                     color="text-indigo-400" 
                   />
                   <div className="h-px bg-white/5 w-full" />

                   <MobileListRow 
                     icon={Wind} 
                     label="Max Wind" 
                     value={`${maxWind} km/h`} 
                     color="text-emerald-400" 
                   />
                   <div className="h-px bg-white/5 w-full" />

                   <MobileListRow 
                     icon={Cloud} 
                     label="Cloud Cover" 
                     value={`${avgCloudCover}%`} 
                     color="text-slate-400" 
                   />
                   <div className="h-px bg-white/5 w-full" />

                   <MobileListRow 
                     icon={Sun} 
                     label="UV Index" 
                     value={uvMax.toFixed(0)} 
                     color="text-amber-400" 
                   />
                   <div className="h-px bg-white/5 w-full" />

                   <MobileListRow 
                     icon={Sun} 
                     label="Sunshine" 
                     value={formatDuration(sunshine)} 
                     color="text-amber-200" 
                   />
                </div>
                
                {/* Expand Prompt */}
                <div className="mt-2 flex items-center justify-center gap-2 text-slate-500 text-xs font-bold tracking-widest uppercase opacity-70">
                   {isExpanded ? 'Hide Hourly Breakdown' : 'View Hourly Breakdown'}
                   {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>


              {/* === DESKTOP LAYOUT (Table Row View) === */}
              <div 
                onClick={() => toggleExpand(i)}
                className="hidden md:grid grid-cols-[1.2fr_1.8fr_1.2fr_1.2fr_0.8fr_1.2fr_1.2fr_0.4fr] gap-4 items-center p-4 cursor-pointer"
              >
                {/* 1. Date */}
                <div className="flex flex-col">
                  <span className="font-bold text-white text-lg">{dayName}</span>
                  <span className="text-xs text-slate-500 font-medium">{dateStr}</span>
                </div>

                {/* 2. Forecast */}
                <div className="flex items-center gap-3">
                  <WeatherIcon code={daily.weather_code[i]} size={32} className="text-indigo-400" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-slate-200 truncate">{label}</span>
                  </div>
                </div>

                {/* 3. Precipitation */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                     <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${precipProb > 0 ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-500'}`}>
                        <Umbrella size={10} />
                        {precipProb}%
                     </div>
                  </div>
                  {precipSum > 0 && <span className="text-xs text-sky-400/80 font-medium pl-1">{precipSum} mm</span>}
                  {precipSum === 0 && <span className="text-xs text-slate-600 font-medium pl-1">0 mm</span>}
                </div>

                {/* 4. Sky */}
                <div className="flex flex-col justify-center">
                   <div className="flex items-center gap-2 text-xs text-amber-300 mb-1">
                      <Sun size={14} />
                      <span className="font-semibold">{formatDuration(sunshine)}</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Cloud size={14} />
                      <span>{avgCloudCover}% Cover</span>
                   </div>
                </div>

                {/* 5. UV */}
                <div className="flex items-center gap-2 text-slate-300">
                   <Sun size={16} className={uvMax > 5 ? 'text-rose-400' : 'text-indigo-300'} />
                   <span className="font-bold">{uvMax.toFixed(0)}</span>
                </div>

                {/* 6. Real Feel */}
                <div className="flex flex-col">
                   <div className="flex items-center justify-between w-16 mb-1">
                      <span className="text-[10px] text-slate-500 uppercase">High</span>
                      <span className="text-sm font-bold text-slate-300">{feelMax}°</span>
                   </div>
                   <div className="flex items-center justify-between w-16">
                      <span className="text-[10px] text-slate-500 uppercase">Low</span>
                      <span className="text-sm font-bold text-slate-400">{feelMin}°</span>
                   </div>
                </div>

                {/* 7. Temp */}
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-white">{max}°</span>
                   </div>
                   <span className="text-sm text-slate-500 font-medium">{min}° Low</span>
                </div>

                {/* 8. Chevron */}
                <div className="flex justify-end">
                  {isExpanded ? <ChevronUp size={20} className="text-indigo-400" /> : <ChevronDown size={20} className="text-slate-600" />}
                </div>
              </div>

              {/* Expanded Detail View (Shared) */}
              {isExpanded && (
                <div className="border-t border-white/5 bg-black/20 p-4 md:p-6 animate-in slide-in-from-top-2 fade-in duration-200 rounded-b-2xl md:rounded-b-2xl rounded-t-none">
                   <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs md:text-sm font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                        <ClockIcon /> Hourly Breakdown • {fullDate}
                      </h4>
                   </div>
                   
                   {/* Vertical Grid for Hourly items instead of Horizontal Scroll */}
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {hourlyData.map((h, idx) => (
                        <div key={idx} className="flex flex-col min-w-0 bg-white/5 rounded-2xl border border-white/5 p-3 md:p-4 hover:bg-white/10 transition-colors">
                           <div className="flex justify-between items-center mb-3">
                              <span className="text-xs md:text-sm font-bold text-slate-200">{h.time}</span>
                              <WeatherIcon code={h.weatherCode} isDay={h.isDay} size={18} className="text-indigo-300" />
                           </div>
                           
                           <div className="text-xl md:text-2xl font-bold text-white mb-4 flex items-start gap-1">
                             {h.temp}<span className="text-xs md:text-sm text-slate-400 font-normal mt-1">°</span>
                           </div>

                           <div className="space-y-1.5 md:space-y-2">
                              <StatRow icon={<Thermometer size={12} />} label="Feel" value={`${h.realFeel}°`} />
                              <StatRow icon={<Droplets size={12} />} label="Rain" value={`${h.precipProb}%`} color="text-sky-400" />
                              <StatRow icon={<Umbrella size={12} />} label="Vol" value={`${h.precipMm}mm`} />
                              <StatRow icon={<Cloud size={12} />} label="Cloud" value={`${h.cloudCover}%`} />
                              <StatRow icon={<Sun size={12} />} label="UV" value={`${h.uvIndex.toFixed(0)}`} color="text-amber-400" />
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <Wind size={12} />
                                  <span>Wind</span>
                                </div>
                                <div className="flex items-center gap-1">
                                   <span className="font-medium text-slate-200">{h.windSpeed}</span>
                                   <Navigation size={10} className="text-slate-500" style={{ transform: `rotate(${h.windDir}deg)` }} />
                                </div>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

// Helper for Desktop Hourly Stats
const StatRow = ({ icon, label, value, unit, color = "text-slate-400" }: any) => (
  <div className="flex items-center justify-between text-xs">
    <div className="flex items-center gap-1.5 text-slate-500">
      {React.cloneElement(icon, { className: color })}
      <span>{label}</span>
    </div>
    <span className="font-medium text-slate-200">{value}{unit && <span className="text-[10px] text-slate-500 ml-0.5">{unit}</span>}</span>
  </div>
);

// New Helper for Mobile Vertical List Row
const MobileListRow = ({ icon: Icon, label, value, color }: any) => (
  <div className="flex items-center justify-between py-0.5">
    <div className="flex items-center gap-3">
       <Icon size={20} className={color} />
       <span className="text-sm text-slate-400 font-medium">{label}</span>
    </div>
    <span className="text-base font-bold text-slate-100">{value}</span>
  </div>
);
