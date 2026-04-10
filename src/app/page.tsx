'use client';

import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ViewSwitcher from '@/components/views/ViewSwitcher';
import DetailPanel from '@/components/detail/DetailPanel';
import ActivityModal from '@/components/modal/ActivityModal';
import ToastProvider from '@/components/ui/Toast';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi } from '@/hooks/useApi';
import { getWeatherDesc } from '@/lib/helpers';
import type { WeatherDetail, ForecastDay } from '@/types';

export default function HomePage() {
  const { currentProject, projects, setActivities, updateProjectWeather, showToast, setCurrentProjectId } = useAppStore();
  const { loadAll } = useApi();

  // Boot: load data from API
  useEffect(() => {
    async function boot() {
      const loaded = await loadAll();
      if (loaded) {
        const acts = useAppStore.getState().activities;
        const datedCount = acts.filter((a) => a.start || a.finish).length;
        const usable = datedCount >= Math.max(5, acts.length * 0.2);
        if (usable) {
          console.log(`Loaded ${acts.length} activities from Supabase (${datedCount} dated)`);
        } else {
          console.warn('DB data insufficient — load fallback data from data module');
          loadFallbackTPSJ();
        }
      } else {
        console.warn('No activities from API — loading fallback');
        loadFallbackTPSJ();
      }
    }
    boot();
    fetchWeather(currentProject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadFallbackTPSJ() {
    // Dynamic import of TPSJ data
    import('@/data/tpsj').then((mod) => {
      setActivities(mod.TPSJ_ACTIVITIES);
    }).catch(() => {
      showToast('Failed to load fallback data');
    });
  }

  async function fetchWeather(projectKey: string) {
    const proj = projects[projectKey];
    if (!proj || proj.weatherLoaded) return;
    try {
      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${proj.lat}&longitude=${proj.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago&forecast_days=3`
      );
      if (!resp.ok) throw new Error(resp.statusText);
      const data = await resp.json();
      const cur = data.current;
      const daily = data.daily;

      const weatherDesc = getWeatherDesc(cur.weather_code);
      const temp = Math.round(cur.temperature_2m);
      const wind = Math.round(cur.wind_speed_10m);
      const humidity = cur.relative_humidity_2m;

      const alerts: string[] = [];
      if (temp >= 95) alerts.push('Heat Advisory');
      if (temp >= 105) alerts.length === 0 || (alerts[0] = 'Extreme Heat Warning');
      if (cur.weather_code >= 61 && cur.weather_code <= 67) alerts.push('Rain');
      if (cur.weather_code >= 95) alerts.push('Thunderstorm');
      if (wind >= 25) alerts.push('High Wind');

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const forecast: ForecastDay[] = [];
      for (let i = 0; i < Math.min(3, daily.time.length); i++) {
        const d = new Date(daily.time[i] + 'T12:00');
        forecast.push({
          day: dayNames[d.getDay()],
          hi: Math.round(daily.temperature_2m_max[i]),
          lo: Math.round(daily.temperature_2m_min[i]),
          rain: daily.precipitation_probability_max[i],
          code: daily.weather_code[i],
        });
      }

      let weatherStr = `${temp}°F — ${weatherDesc.text}`;
      if (alerts.length) weatherStr += ` — ${alerts.join(', ')}`;

      const detail: WeatherDetail = { temp, wind, humidity, desc: weatherDesc.text, icon: weatherDesc.icon, code: cur.weather_code, alerts, forecast };
      updateProjectWeather(projectKey, weatherStr, detail);
    } catch (e) {
      updateProjectWeather(projectKey, '⛅ Weather unavailable');
    }
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">
          <ViewSwitcher />
          <DetailPanel />
        </div>
      </div>
      <ActivityModal />
      <ToastProvider />
    </div>
  );
}
