import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, LocateFixed, History, Trash2, Clock, ArrowDownAZ, Home, Briefcase, Store } from 'lucide-react';
import { searchLocation, getReverseGeocoding } from '../services/weatherService';
import { GeocodingResult } from '../types';

interface SearchBoxProps {
  onLocationSelect: (location: GeocodingResult) => void;
  homeLocation?: GeocodingResult | null;
  workLocation?: GeocodingResult | null;
  onGoHome?: () => void;
  onGoWork?: () => void;
  currentLocation?: GeocodingResult;
}

interface SavedLocation {
  data: GeocodingResult;
  timestamp: number;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ 
  onLocationSelect, 
  homeLocation, 
  workLocation,
  onGoHome,
  onGoWork,
  currentLocation
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // History State
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');

  // Load history from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('skycast_history');
      if (saved) {
        setSavedLocations(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // Save history helper
  const addToHistory = (location: GeocodingResult) => {
    setSavedLocations(prev => {
      const filtered = prev.filter(item => 
        item.data.id !== location.id && 
        !(item.data.name === location.name && item.data.latitude === location.latitude)
      );
      
      const newItem = { data: location, timestamp: Date.now() };
      const updated = [newItem, ...filtered];
      localStorage.setItem('skycast_history', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromHistory = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSavedLocations(prev => {
      const updated = prev.filter(item => item.data.id !== id);
      localStorage.setItem('skycast_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        const locations = await searchLocation(
          query,
          currentLocation?.latitude,
          currentLocation?.longitude,
          currentLocation?.country_code
        );
        setResults(locations);
        setIsLoading(false);
        setShowDropdown(true);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, currentLocation]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: GeocodingResult) => {
    onLocationSelect(loc);
    addToHistory(loc);
    setQuery('');
    setShowDropdown(false);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    
    setIsGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = await getReverseGeocoding(latitude, longitude);
        
        if (location) {
          handleSelect(location);
        }
        setIsGeoLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsGeoLoading(false);
      }
    );
  };

  const getDisplayData = () => {
    if (query.length >= 2) {
      return { type: 'search', items: results.map(r => ({ data: r, key: r.id })) };
    }
    if (showDropdown && savedLocations.length > 0) {
      const sorted = [...savedLocations].sort((a, b) => {
        if (sortOrder === 'recent') return b.timestamp - a.timestamp;
        return a.data.name.localeCompare(b.data.name);
      });
      return { type: 'history', items: sorted.map(s => ({ data: s.data, key: s.data.id })) };
    }
    return null;
  };

  const displayData = getDisplayData();

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl z-50 flex gap-2 md:gap-3">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder="City, Business, Address..."
          className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg backdrop-blur-sm placeholder:text-slate-500 transition-all"
        />
        <div className="absolute left-4 top-3.5 text-slate-400">
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
        </div>
        
        {showDropdown && displayData && displayData.items.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            
            {displayData.type === 'history' && (
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950/50 border-b border-slate-700/50">
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-300 uppercase tracking-wider">
                  <History size={12} />
                  Recent Locations
                </div>
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                  <button 
                    onClick={() => setSortOrder('recent')}
                    className={`p-1.5 rounded-md transition-colors ${sortOrder === 'recent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Sort by Recent"
                  >
                    <Clock size={14} />
                  </button>
                  <button 
                    onClick={() => setSortOrder('alpha')}
                    className={`p-1.5 rounded-md transition-colors ${sortOrder === 'alpha' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Sort Alphabetically"
                  >
                    <ArrowDownAZ size={14} />
                  </button>
                </div>
              </div>
            )}

            {displayData.items.map(({ data: loc, key }) => (
              <div
                key={key}
                className="w-full text-left px-5 py-3 hover:bg-indigo-600/30 transition-colors flex items-center gap-3 border-b border-slate-700/50 last:border-0 group cursor-pointer"
                onClick={() => handleSelect(loc)}
              >
                {/* Different Icon based on location type */}
                {loc.feature_code === 'POI' ? (
                  <Store size={16} className={`flex-shrink-0 ${displayData.type === 'history' ? 'text-slate-400' : 'text-emerald-400'}`} />
                ) : (
                  <MapPin size={16} className={`flex-shrink-0 ${displayData.type === 'history' ? 'text-slate-400' : 'text-indigo-400'}`} />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{loc.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}
                  </p>
                </div>
                
                {displayData.type === 'search' && loc.feature_code === 'PPLA' && (
                  <span className="ml-auto text-[10px] bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded-full flex-shrink-0">City</span>
                )}
                {displayData.type === 'search' && loc.feature_code === 'POST' && (
                  <span className="ml-auto text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">Postcode</span>
                )}
                {displayData.type === 'search' && loc.feature_code === 'POI' && (
                  <span className="ml-auto text-[10px] bg-amber-900 text-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">Place</span>
                )}
                
                {displayData.type === 'history' && (
                  <button
                    onClick={(e) => removeFromHistory(e, loc.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from history"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {homeLocation && onGoHome && (
        <button 
          onClick={onGoHome}
          className="flex-shrink-0 w-12 h-12 bg-slate-800 hover:bg-indigo-600 rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-95 group"
          title={`Go to Home: ${homeLocation.name}`}
        >
          <Home size={20} className="text-white group-hover:scale-110 transition-transform" />
        </button>
      )}

      {workLocation && onGoWork && (
        <button 
          onClick={onGoWork}
          className="flex-shrink-0 w-12 h-12 bg-slate-800 hover:bg-sky-600 rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-95 group"
          title={`Go to Work: ${workLocation.name}`}
        >
          <Briefcase size={20} className="text-white group-hover:scale-110 transition-transform" />
        </button>
      )}

      <button 
        onClick={handleCurrentLocation}
        className="flex-shrink-0 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 group"
        title="Use Current Location"
      >
        {isGeoLoading ? (
          <Loader2 size={20} className="animate-spin text-white" />
        ) : (
          <LocateFixed size={20} className="text-white group-hover:scale-110 transition-transform" />
        )}
      </button>
    </div>
  );
};