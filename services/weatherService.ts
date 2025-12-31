
import { GeocodingResult, WeatherData, RainViewerMeta } from '../types';

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_GEO_API = 'https://geocoding-api.open-meteo.com/v1/reverse';
const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const POSTCODES_API = 'https://api.postcodes.io/postcodes';
const ARCGIS_API = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
const PHOTON_API = 'https://photon.komoot.io/api/';

export const searchLocation = async (
  query: string,
  currentLat?: number,
  currentLon?: number,
  currentCountryCode?: string
): Promise<GeocodingResult[]> => {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.trim();
  const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  const isPostcode = ukPostcodeRegex.test(normalizedQuery);

  let results: GeocodingResult[] = [];

  if (isPostcode) {
    try {
      const response = await fetch(`${POSTCODES_API}/${encodeURIComponent(normalizedQuery)}`);
      const data = await response.json();
      if (data.status === 200 && data.result) {
        return [{
          id: Date.now(), 
          name: data.result.postcode,
          latitude: data.result.latitude,
          longitude: data.result.longitude,
          elevation: 0,
          feature_code: 'POST',
          country_code: 'GB',
          country: 'United Kingdom',
          admin1: data.result.admin_district || data.result.parish
        }];
      }
    } catch (error) {
      console.warn("Postcode lookup failed", error);
    }
  }

  try {
    const promises = [];

    let arcGisUrl = `${ARCGIS_API}?f=json&SingleLine=${encodeURIComponent(normalizedQuery)}&maxLocations=6&outFields=PlaceName,Place_addr,City,Region,Country,Type`;
    if (currentLat && currentLon) {
      arcGisUrl += `&location=${currentLon},${currentLat}`;
    }
    
    promises.push(
      fetch(arcGisUrl)
        .then(r => r.json())
        .then(data => (data.candidates || []).map(mapArcGisToResult))
        .catch(e => {
          console.warn("ArcGIS failed", e);
          return [];
        })
    );

    let omUrl = `${GEOCODING_API}?name=${encodeURIComponent(normalizedQuery)}&count=5&language=en&format=json`;
    if (currentLat && currentLon) {
      omUrl += `&latitude=${currentLat}&longitude=${currentLon}`;
    }
    promises.push(
      fetch(omUrl)
        .then(r => r.json())
        .then(data => (data.results || []))
        .catch(() => [])
    );

    let photonUrl = `${PHOTON_API}?q=${encodeURIComponent(normalizedQuery)}&limit=5&lang=en`;
    if (currentLat && currentLon) {
      photonUrl += `&lat=${currentLat}&lon=${currentLon}`;
    }
    promises.push(
      fetch(photonUrl)
        .then(r => r.json())
        .then(data => (data.features || []).map(mapPhotonToResult))
        .catch(() => [])
    );

    const [arcGisResults, omResults, photonResults] = await Promise.all(promises);

    results = [...arcGisResults];

    for (const city of omResults) {
      if (!isDuplicate(city, results)) {
        results.push(city);
      }
    }

    for (const poi of photonResults) {
       if (!isDuplicate(poi, results)) {
         results.push(poi);
       }
    }

  } catch (error) {
    console.error("Search failed:", error);
  }

  return results.slice(0, 15);
};

const isDuplicate = (candidate: GeocodingResult, list: GeocodingResult[]) => {
  return list.some(existing => {
    const dist = Math.sqrt(
      Math.pow(existing.latitude - candidate.latitude, 2) + 
      Math.pow(existing.longitude - candidate.longitude, 2)
    );
    if (dist < 0.01) return true;
    if (existing.name.toLowerCase() === candidate.name.toLowerCase() && dist < 0.1) return true;
    return false;
  });
};

const mapArcGisToResult = (item: any): GeocodingResult => {
  const attr = item.attributes;
  const name = attr.PlaceName || item.address.split(',')[0];
  const contextParts = [];
  
  if (attr.City && attr.City !== name) contextParts.push(attr.City);
  if (attr.Region && attr.Region !== name) contextParts.push(attr.Region);
  if (attr.Country && attr.Country !== name) contextParts.push(attr.Country);
  
  if (contextParts.length === 0 && item.address) {
    const parts = item.address.split(',');
    if (parts.length > 1) {
      contextParts.push(parts.slice(1).join(',').trim());
    }
  }

  return {
    id: Date.now() + Math.random(),
    name: name,
    latitude: item.location.y,
    longitude: item.location.x,
    elevation: 0,
    feature_code: attr.Type === 'City' || attr.Type === 'Locality' ? 'PPL' : 'POI',
    country_code: '',
    country: attr.Country || '',
    admin1: contextParts.join(', ')
  };
};

const mapPhotonToResult = (item: any): GeocodingResult => {
  const p = item.properties;
  
  let name = p.name;
  if (!name) {
     if (p.housenumber && p.street) {
       name = `${p.housenumber} ${p.street}`;
     } else if (p.street) {
       name = p.street;
     } else {
       name = p.city || p.town || p.village || p.country;
     }
  }

  const context = [p.city, p.town, p.village, p.state, p.county]
    .filter(c => c && c !== name)
    .filter((val, index, self) => self.indexOf(val) === index)
    .join(', ');
  
  return {
    id: p.osm_id || Date.now() + Math.random(),
    name: name || "Unknown Location",
    latitude: item.geometry.coordinates[1],
    longitude: item.geometry.coordinates[0],
    elevation: 0,
    feature_code: (p.osm_key === 'place' || p.osm_key === 'boundary') ? 'PPL' : 'POI', 
    country_code: p.countrycode?.toUpperCase() || '',
    country: p.country || '',
    admin1: context
  };
};

export const getReverseGeocoding = async (lat: number, lon: number): Promise<GeocodingResult | null> => {
  // 1. Try Open-Meteo first
  try {
    const url = `${REVERSE_GEO_API}?latitude=${lat}&longitude=${lon}&count=1&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Open-Meteo failed');
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0];
    }
  } catch (error) {
    console.warn("Open-Meteo reverse geo failed, trying fallback...", error);
  }

  // 2. Try BigDataCloud (Free, No Key)
  try {
    const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const response = await fetch(fallbackUrl);
    if (!response.ok) throw new Error('BigDataCloud failed');
    const data = await response.json();

    const name = data.city || data.locality || data.principalSubdivision;
    if (name) {
      return {
        id: Date.now(),
        name: name,
        latitude: lat,
        longitude: lon,
        elevation: 0,
        feature_code: 'PPLA',
        country_code: data.countryCode || '',
        country: data.countryName || '',
        admin1: data.principalSubdivision || ''
      };
    }
  } catch (error) {
    console.warn("Fallback reverse geo failed:", error);
  }

  // 3. Fallback to just coordinates to prevent UI lockup
  return {
    id: Date.now(),
    name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    latitude: lat,
    longitude: lon,
    elevation: 0,
    feature_code: 'PPLA',
    country_code: '',
    country: ''
  };
};

export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index',
      hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day,uv_index,cloud_cover',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,uv_index_max,sunshine_duration',
      timezone: 'auto',
      forecast_days: '11'
    });

    const aqParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'us_aqi',
    });

    const [weatherRes, aqRes] = await Promise.all([
      fetch(`${FORECAST_API}?${params.toString()}`),
      fetch(`${AIR_QUALITY_API}?${aqParams.toString()}`)
    ]);

    if (!weatherRes.ok) throw new Error('Weather fetch failed');
    
    const weatherData = await weatherRes.json();
    let aqData = null;
    
    if (aqRes.ok) {
      aqData = await aqRes.json();
    }

    if (aqData && aqData.current) {
      weatherData.current.us_aqi = aqData.current.us_aqi;
    }

    return weatherData;

  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
};

export const fetchRadarMeta = async (): Promise<RainViewerMeta | null> => {
  try {
    const response = await fetch(RAINVIEWER_API);
    if (!response.ok) throw new Error('Radar meta fetch failed');
    return await response.json();
  } catch (error) {
    console.error("Radar meta fetch error:", error);
    return null;
  }
};

export const getWeatherDescription = (code: number): { label: string, iconType: 'sun' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog' } => {
  const map: Record<number, { label: string, iconType: 'sun' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog' }> = {
    0: { label: 'Clear sky', iconType: 'sun' },
    1: { label: 'Mainly clear', iconType: 'sun' },
    2: { label: 'Partly cloudy', iconType: 'cloud' },
    3: { label: 'Overcast', iconType: 'cloud' },
    45: { label: 'Fog', iconType: 'fog' },
    48: { label: 'Depositing rime fog', iconType: 'fog' },
    51: { label: 'Light drizzle', iconType: 'rain' },
    53: { label: 'Moderate drizzle', iconType: 'rain' },
    55: { label: 'Dense drizzle', iconType: 'rain' },
    56: { label: 'Light freezing drizzle', iconType: 'snow' },
    57: { label: 'Dense freezing drizzle', iconType: 'snow' },
    61: { label: 'Slight rain', iconType: 'rain' },
    63: { label: 'Moderate rain', iconType: 'rain' },
    65: { label: 'Heavy rain', iconType: 'rain' },
    66: { label: 'Light freezing rain', iconType: 'snow' },
    67: { label: 'Heavy freezing rain', iconType: 'snow' },
    71: { label: 'Slight snow fall', iconType: 'snow' },
    73: { label: 'Moderate snow fall', iconType: 'snow' },
    75: { label: 'Heavy snow fall', iconType: 'snow' },
    77: { label: 'Snow grains', iconType: 'snow' },
    80: { label: 'Slight rain showers', iconType: 'rain' },
    81: { label: 'Moderate rain showers', iconType: 'rain' },
    82: { label: 'Violent rain showers', iconType: 'rain' },
    85: { label: 'Slight snow showers', iconType: 'snow' },
    86: { label: 'Heavy snow showers', iconType: 'snow' },
    95: { label: 'Thunderstorm', iconType: 'storm' },
    96: { label: 'Thunderstorm with hail', iconType: 'storm' },
    99: { label: 'Heavy thunderstorm with hail', iconType: 'storm' },
  };
  return map[code] || { label: 'Unknown', iconType: 'cloud' };
};
