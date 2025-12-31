import React from 'react';
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  CloudSnow, 
  CloudFog, 
  Moon, 
  CloudDrizzle,
  CloudSun
} from 'lucide-react';
import { getWeatherDescription } from '../services/weatherService';

interface WeatherIconProps {
  code: number;
  isDay?: number;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ code, isDay = 1, className = "", size = 24 }) => {
  const { iconType } = getWeatherDescription(code);

  const getIcon = () => {
    switch (iconType) {
      case 'sun':
        return isDay ? <Sun size={size} className={className} /> : <Moon size={size} className={className} />;
      case 'cloud':
        return code === 2 && isDay ? <CloudSun size={size} className={className} /> : <Cloud size={size} className={className} />;
      case 'rain':
        return code < 60 ? <CloudDrizzle size={size} className={className} /> : <CloudRain size={size} className={className} />;
      case 'storm':
        return <CloudLightning size={size} className={className} />;
      case 'snow':
        return <CloudSnow size={size} className={className} />;
      case 'fog':
        return <CloudFog size={size} className={className} />;
      default:
        return <Cloud size={size} className={className} />;
    }
  };

  return getIcon();
};
