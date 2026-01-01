
import React, { useEffect, useState } from 'react';
import { SearchBox } from './components/SearchBox';
import { CurrentWeather } from './components/CurrentWeather';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { RadarMap } from './components/RadarMap';
import { fetchWeatherData } from './services/weatherService';
import { WeatherData, GeocodingResult } from './types';
import { Loader2, Home, Briefcase, Menu, X, Map as MapIcon, Calendar, Clock, CloudRain } from 'lucide-react';

const APP_NAME = 'Skycast from AbramsWorks';
// Default location (London)
const DEFAULT_LOCATION: GeocodingResult = {
  id: 2643743,
  name: "London",
  latitude: 51.50853,
  longitude: -0.12574,
  elevation: 25,
  feature_code: "PPLC",
  country_code: "GB",
  admin1: "England",
  country: "United Kingdom"
};

export default function App() {
  const [location, setLocation] = useState<GeocodingResult>(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Home Location State
  const [homeLocation, setHomeLocation] = useState<GeocodingResult | null>(() => {
    try {
      const saved = localStorage.getItem('skycast_home_location');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Work Location State
  const [workLocation, setWorkLocation] = useState<GeocodingResult | null>(() => {
    try {
      const saved = localStorage.getItem('skycast_work_location');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Initial load
  useEffect(() => {
    const init = async () => {
      if (homeLocation) {
        await loadWeather(homeLocation);
      } else {
        // No home set, default to London
        await loadWeather(DEFAULT_LOCATION);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWeather = async (loc: GeocodingResult) => {
    setLoading(true);
    setError('');
    setLocation(loc);
    try {
      const data = await fetchWeatherData(loc.latitude, loc.longitude);
      if (data) {
        setWeather(data);
      } else {
        setError('Failed to fetch weather data.');
        setWeather(null);
      }
    } catch (e) {
      setError('An error occurred.');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSetHome = (loc: GeocodingResult) => {
    setHomeLocation(loc);
    localStorage.setItem('skycast_home_location', JSON.stringify(loc));
  };

  const handleSetWork = (loc: GeocodingResult) => {
    setWorkLocation(loc);
    localStorage.setItem('skycast_work_location', JSON.stringify(loc));
  };

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      // Offset for sticky header
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const isSameLocation = (a?: GeocodingResult | null, b?: GeocodingResult | null) => {
    if (!a || !b) return false;
    if (a.id === b.id) return true;
    const distSq = Math.pow(a.latitude - b.latitude, 2) + Math.pow(a.longitude - b.longitude, 2);
    return distSq < 0.0001;
  };

  const isHome = isSameLocation(homeLocation, location);
  const isWork = isSameLocation(workLocation, location);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-50 selection:bg-indigo-500/30 pb-[env(safe-area-inset-bottom)]">
      {/* Header / Search */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-slate-950/80 border-b border-white/5 shadow-2xl pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4 flex flex-col xl:flex-row items-center justify-between gap-4">
          {/* Logo & Menu Row */}
          <div className="flex items-center justify-between w-full xl:w-auto gap-4">
            <div className="flex items-center gap-3 shrink-0">
               <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 -ml-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Open Menu"
                >
                  <Menu size={28} />
                </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
                {APP_NAME}
              </h1>
            </div>

            {/* Quick Actions (Desktop only, or folded into menu?) - Keeping visible for utility */}
            {!loading && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar ml-auto xl:ml-0">
                <button
                  onClick={() => handleSetHome(location)}
                  disabled={isHome}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                    isHome
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 cursor-default'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border-white/10 active:scale-95'
                  }`}
                  title={isHome ? "Current location is set as home" : `Set ${location.name} as Home`}
                >
                  <Home size={14} className={isHome ? "fill-indigo-300" : ""} />
                  <span className="hidden sm:inline">{isHome ? 'Home Set' : 'Set Home'}</span>
                </button>

                <button
                  onClick={() => handleSetWork(location)}
                  disabled={isWork}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                    isWork
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30 cursor-default'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border-white/10 active:scale-95'
                  }`}
                  title={isWork ? "Current location is set as work" : `Set ${location.name} as Work`}
                >
                  <Briefcase size={14} className={isWork ? "fill-sky-300" : ""} />
                  <span className="hidden sm:inline">{isWork ? 'Work Set' : 'Set Work'}</span>
                </button>
              </div>
            )}
          </div>

          <SearchBox 
            onLocationSelect={loadWeather} 
            homeLocation={homeLocation}
            workLocation={workLocation}
            onGoHome={() => homeLocation && loadWeather(homeLocation)}
            onGoWork={() => workLocation && loadWeather(workLocation)}
            currentLocation={location}
          />
        </div>
      </header>

      {/* Navigation Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">{APP_NAME}</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <nav className="flex flex-col gap-4">
             <button onClick={() => scrollToSection('current')} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 transition-all text-left">
                <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl group-hover:bg-white/20 group-hover:text-white transition-colors">
                   <CloudRain size={24} />
                </div>
                <div>
                   <span className="block text-lg font-bold text-white">Current Conditions</span>
                   <span className="text-sm text-slate-400 group-hover:text-indigo-100">Now, Air Quality, Commute</span>
                </div>
             </button>

             <button onClick={() => scrollToSection('hourly')} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 transition-all text-left">
                <div className="p-3 bg-sky-500/20 text-sky-300 rounded-xl group-hover:bg-white/20 group-hover:text-white transition-colors">
                   <Clock size={24} />
                </div>
                <div>
                   <span className="block text-lg font-bold text-white">Hourly Forecast</span>
                   <span className="text-sm text-slate-400 group-hover:text-indigo-100">Next 24 Hours</span>
                </div>
             </button>

             <button onClick={() => scrollToSection('radar')} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 transition-all text-left">
                <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl group-hover:bg-white/20 group-hover:text-white transition-colors">
                   <MapIcon size={24} />
                </div>
                <div>
                   <span className="block text-lg font-bold text-white">Weather Radar</span>
                   <span className="text-sm text-slate-400 group-hover:text-indigo-100">Live Precipitation Map</span>
                </div>
             </button>

             <button onClick={() => scrollToSection('daily')} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 transition-all text-left">
                <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl group-hover:bg-white/20 group-hover:text-white transition-colors">
                   <Calendar size={24} />
                </div>
                <div>
                   <span className="block text-lg font-bold text-white">10-Day Outlook</span>
                   <span className="text-sm text-slate-400 group-hover:text-indigo-100">Long term forecast</span>
                </div>
             </button>
          </nav>

          <div className="mt-auto text-center text-slate-500 text-sm">
             <p>{APP_NAME} v1.2</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-8 pb-12">
        
        {loading && (
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 animate-pulse">Scanning the skies...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-200 text-center">
            {error}
          </div>
        )}

        {!loading && weather && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Top Section: Current + Hourly + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Current & Hourly */}
              <div className="lg:col-span-2 space-y-6">
                <section id="current">
                  <CurrentWeather 
                    data={weather} 
                    locationName={location.name}
                    homeLocation={homeLocation}
                    workLocation={workLocation}
                  />
                </section>
                
                <section id="hourly">
                   <HourlyForecast data={weather} />
                </section>
              </div>

              {/* Right Column: Radar */}
              <div className="lg:col-span-1 h-full">
                 <section id="radar" className="h-full">
                    <RadarMap lat={location.latitude} lon={location.longitude} locationName={location.name} />
                 </section>
              </div>
            </div>

            {/* Bottom Section: Daily Forecast Full Width */}
            <div className="w-full">
               <section id="daily">
                  <DailyForecast data={weather} />
               </section>
            </div>

          </div>
        )}
      </main>
      
      <footer className="mt-auto py-8 text-center text-slate-600 text-sm border-t border-white/5 bg-slate-950/50">
        <p>Powered by Open-Meteo & RainViewer</p>
      </footer>
    </div>
  );
}
