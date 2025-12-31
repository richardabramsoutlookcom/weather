
import React, { useState } from 'react';
import { WeatherData } from '../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar, YAxis } from 'recharts';
import { WeatherIcon } from './WeatherIcon';
import { Clock, Wind, Navigation, Sun, Thermometer, Droplets, Cloud, Umbrella } from 'lucide-react';

interface HourlyForecastProps {
  data: WeatherData;
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'temp' | 'precip'>('precip');
  const currentHour = new Date().getHours();
  const now = new Date();
  
  // Find index for current time
  const currentHourIndex = data.hourly.time.findIndex(t => {
    const d = new Date(t);
    return d.getHours() === currentHour && d.getDate() === now.getDate();
  });
  
  const startIdx = currentHourIndex !== -1 ? currentHourIndex : 0;
  const endIdx = startIdx + 24; // Extended to 24h for more "epic" planning

  const chartData = data.hourly.time.slice(startIdx, endIdx).map((time, i) => {
    const idx = startIdx + i;
    return {
      time: new Date(time).toLocaleTimeString([], { hour: 'numeric', hour12: true }),
      temp: Math.round(data.hourly.temperature_2m[idx]),
      precipProb: data.hourly.precipitation_probability[idx],
      precip: data.hourly.precipitation[idx],
      code: data.hourly.weather_code[idx],
      realFeel: Math.round(data.hourly.apparent_temperature[idx]),
      windSpeed: Math.round(data.hourly.wind_speed_10m[idx]),
      windDir: data.hourly.wind_direction_10m[idx],
      isDay: data.hourly.is_day[idx],
      uv: data.hourly.uv_index[idx],
      cloudCover: data.hourly.cloud_cover ? data.hourly.cloud_cover[idx] : 0,
    };
  });

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <Clock size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Hourly Forecast</h3>
            <p className="text-slate-400 text-sm">Detailed hour-by-hour outlook</p>
          </div>
        </div>
        
        {/* Chart Toggles */}
        <div className="flex bg-slate-800/50 border border-white/5 p-1 rounded-xl ml-auto sm:ml-0">
           <button 
             onClick={() => setChartType('temp')}
             className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${chartType === 'temp' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
           >
             <span className="md:hidden">Temp</span>
             <span className="hidden md:inline">Temperature</span>
           </button>
           <button 
             onClick={() => setChartType('precip')}
             className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${chartType === 'precip' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
           >
             <span className="md:hidden">Precip</span>
             <span className="hidden md:inline">Precipitation</span>
           </button>
        </div>
      </div>
      
      {/* Grid Layout instead of Horizontal Scroll */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {chartData.map((d, i) => (
          <div key={i} className="flex flex-col bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
            
            {/* Header: Time & Icon */}
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-slate-300 bg-black/20 px-2 py-0.5 rounded-full">{d.time}</span>
              <WeatherIcon code={d.code} isDay={d.isDay} size={28} className="text-indigo-300 drop-shadow-lg" />
            </div>

            {/* Main Temp */}
            <div className="mb-4">
               <div className="text-3xl font-bold text-white tracking-tight flex items-start">
                  {d.temp}<span className="text-sm text-slate-400 font-medium mt-1">°</span>
               </div>
               <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 mt-1">
                  <Thermometer size={10} className="text-rose-400"/>
                  Feels <span className="text-slate-200">{d.realFeel}°</span>
               </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="space-y-1.5 pt-3 border-t border-white/10">
                {/* Precip */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Droplets size={12} className="text-sky-400" />
                      <span>Chance</span>
                   </div>
                   <span className="text-xs font-bold text-white">{d.precipProb}%</span>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Umbrella size={12} className="text-indigo-400" />
                      <span>Vol</span>
                   </div>
                   <span className="text-xs font-bold text-white">{d.precip} <span className="text-[9px] text-slate-500 font-normal">mm</span></span>
                </div>

                {/* UV */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Sun size={12} className="text-amber-400" />
                      <span>UV</span>
                   </div>
                   <span className="text-xs font-bold text-white">{d.uv.toFixed(1)}</span>
                </div>

                 {/* Wind */}
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Wind size={12} className="text-emerald-400" />
                      <span>Wind</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white">{d.windSpeed}</span>
                      <Navigation size={10} className="text-slate-500" style={{ transform: `rotate(${d.windDir}deg)` }} />
                   </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="h-48 w-full mt-2 relative">
         <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent rounded-xl pointer-events-none"></div>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'temp' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                  dataKey="time" 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} 
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                  dy={10}
              />
              <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', padding: '8px' }}
                  itemStyle={{ color: '#818cf8', fontWeight: 'bold', fontSize: '12px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'temp') return [`${value}°`, 'Temperature'];
                    return [value, name];
                  }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}
                  cursor={{ stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#818cf8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTemp)" 
              />
            </AreaChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                  dataKey="time" 
                  tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} 
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                  dy={10}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                tick={{fill: '#64748b', fontSize: 10}}
                axisLine={false}
                tickLine={false}
                width={30}
                domain={[0, 100]}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{fill: '#64748b', fontSize: 10}}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', padding: '8px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'precipProb') return [`${value}%`, 'Chance'];
                    if (name === 'precip') return [`${value} mm`, 'Volume'];
                    return [value, name];
                  }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}
                  cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="precipProb" 
                  stroke="#0ea5e9" 
                  fill="url(#colorProb)" 
                  strokeWidth={2}
                  name="precipProb"
              />
              <Bar 
                  yAxisId="right"
                  dataKey="precip" 
                  fill="#bae6fd" 
                  opacity={0.8}
                  barSize={12}
                  radius={[4, 4, 0, 0]}
                  name="precip"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
