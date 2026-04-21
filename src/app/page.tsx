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
import type { WeatherDetail, ForecastDay, Project, ProjectConfig } from '@/types';

// Lat/lon by project code — for Open-Meteo weather. Not stored in DB.
const PROJECT_COORDS: Record<string, { lat: number; lon: number }> = {
  tpsj: { lat: 30.08, lon: -94.10 },
  'hampton-inn': { lat: 30.08, lon: -94.10 },
  'fairfield-inn': { lat: 31.99, lon: -102.08 },
  'holiday-inn': { lat: 32.35, lon: -95.30 },
};

export default function HomePage() {
  const { currentProject, projects, setActivities, setProjects, setCurrentProject, updateProjectWeather, showToast, setView } = useAppStore();
  const { loadAll, loadUsers } = useApi();

  // Allow ?view=gantt&pdf=1 in URL — used by server-side PDF export
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v) setView(v as Parameters<typeof setView>[0]);
    if (params.get('pdf') === '1') {
      // Enable fullscreen Gantt so the chart fills the viewport with no height cap
      useAppStore.getState().setGanttFullscreen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boot: load projects, then activities for the selected project
  useEffect(() => {
    async function boot() {
      // 1. Load projects from DB
      try {
        const resp = await fetch('/api/projects');
        if (!resp.ok) throw new Error(resp.statusText);
        const rows: Project[] = await resp.json();
        const byCode: Record<string, ProjectConfig> = {};
        rows.forEach((p) => {
          const coords = PROJECT_COORDS[p.code] || { lat: 30.08, lon: -94.10 };
          byCode[p.code] = {
            id: p.id,
            code: p.code,
            name: p.name,
            lat: coords.lat,
            lon: coords.lon,
            weather: 'Loading weather...',
            weatherLoaded: false,
          };
        });
        setProjects(byCode);
        const firstCode = rows.find((p) => p.code === 'tpsj')?.code || rows[0]?.code;
        if (firstCode) {
          setCurrentProject(firstCode);
          // Fetch weather for ALL projects so cards show forecast on Overview
          Object.entries(byCode).forEach(([code, proj]) => fetchWeather(code, proj));
        }
      } catch (e) {
        console.warn('Project load failed:', (e as Error).message);
        showToast('Failed to load projects from database');
        return;
      }

      // 2. Load activities + users for the selected project
      const projectId = useAppStore.getState().currentProjectId;
      loadUsers();
      const loaded = await loadAll(projectId);
      if (loaded) {
        const acts = useAppStore.getState().activities;
        const datedCount = acts.filter((a) => a.start || a.finish).length;
        console.log(`Loaded ${acts.length} activities from Supabase (${datedCount} dated)`);
      } else {
        console.warn('No activities returned for project', projectId);
        setActivities([]);
      }
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch activities + weather whenever the selected project changes
  useEffect(() => {
    if (!currentProject) return;
    const projectId = useAppStore.getState().currentProjectId;
    if (projectId) {
      loadAll(projectId).then((ok) => {
        if (!ok) setActivities([]);
      });
    }
    fetchWeather(currentProject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  async function fetchWeather(projectKey: string, projOverride?: typeof projects[string]) {
    const proj = projOverride ?? projects[projectKey];
    if (!proj || proj.weatherLoaded) return;
    try {
      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${proj.lat}&longitude=${proj.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago&forecast_days=6`
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
      for (let i = 0; i < Math.min(6, daily.time.length); i++) {
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
      updateProjectWeather(projectKey, 'Weather unavailable');
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Sidebar />
      <Header />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <ViewSwitcher />
        <DetailPanel />
      </div>
      <ActivityModal />
      <ToastProvider />
    </div>
  );
}
