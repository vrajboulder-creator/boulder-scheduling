'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { getWeatherDesc } from '@/lib/helpers';

export default function WeatherCard() {
  const { projects, currentProject } = useAppStore();
  const proj = projects[currentProject];
  const wd = proj?.weatherDetail;

  if (!wd) {
    return (
      <div className="weather-alert" style={{ padding: '10px 16px' }}>
        <div style={{ fontSize: 12 }}>{proj?.weather || '⛅ Loading weather...'}</div>
      </div>
    );
  }

  const hasAlert = wd.alerts && wd.alerts.length > 0;

  return (
    <div className="weather-alert" style={{ padding: '10px 16px', gap: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
      <strong style={{ fontSize: 15, color: '#1a1d23', whiteSpace: 'nowrap' }}>
        {wd.temp}°F
      </strong>
      <span style={{ fontSize: 11.5, color: '#666' }}>{wd.desc}</span>
      <span style={{ fontSize: 10.5, color: '#999' }}>
        💨 {wd.wind}mph · 💧 {wd.humidity}%
      </span>
      {hasAlert && (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: 'var(--red)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
          {wd.alerts.join(', ')}
        </span>
      )}
      <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
        {wd.forecast?.map((f, i) => (
          <div key={i} style={{ textAlign: 'center', lineHeight: 1.3 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#555' }}>{f.day}</div>
            <div style={{ margin: '2px 0', fontSize: 14 }}>{getWeatherDesc(f.code).icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600 }}>{f.hi}°/{f.lo}°</div>
          </div>
        ))}
      </div>
    </div>
  );
}
