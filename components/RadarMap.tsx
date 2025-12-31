
import React from 'react';

interface RadarMapProps {
  lat: number;
  lon: number;
  locationName: string;
}

export const RadarMap: React.FC<RadarMapProps> = ({ lat, lon, locationName }) => {
  // Windy Embed Parameters
  // zoom=8, level=surface, overlay=rain (Rain, Thunder)
  const windyUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <div className="glass-panel rounded-3xl p-4 flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center flex-shrink-0">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          Rain & Thunder
        </h3>
      </div>

      <div className="w-full flex-1 min-h-[450px] rounded-2xl overflow-hidden relative z-0 bg-slate-900 border border-white/10 shadow-inner">
        <iframe 
          src={windyUrl}
          className="w-full h-full absolute inset-0"
          frameBorder="0" 
          title={`Wind Map for ${locationName}`}
        />
      </div>
    </div>
  );
};
