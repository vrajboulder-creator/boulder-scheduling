'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { getWeatherDesc } from '@/lib/helpers';
import { Card } from '@/components/ui/card';
import { Wind, Droplets, AlertTriangle } from 'lucide-react';

export default function WeatherCard() {
  const { projects, currentProject } = useAppStore();
  const proj = projects[currentProject];
  const wd = proj?.weatherDetail;

  if (!wd) {
    return (
      <Card className="px-4 py-2.5 mb-4">
        <p className="text-xs text-muted-foreground">{proj?.weather || '⛅ Loading weather...'}</p>
      </Card>
    );
  }

  return (
    <Card className="flex items-center gap-3 px-4 py-2.5 mb-4 flex-wrap">
      <span className="text-2xl">{getWeatherDesc(wd.code).icon}</span>
      <strong className="text-[15px] text-foreground whitespace-nowrap">{wd.temp}°F</strong>
      <span className="text-[11.5px] text-muted-foreground">{wd.desc}</span>
      <span className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
        <Wind className="h-3 w-3" /> {wd.wind}mph
        <Droplets className="h-3 w-3 ml-1" /> {wd.humidity}%
      </span>
      {wd.alerts.length > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-white bg-destructive px-2 py-0.5 rounded-full whitespace-nowrap">
          <AlertTriangle className="h-3 w-3" />
          {wd.alerts.join(', ')}
        </span>
      )}
      <div className="flex gap-3 ml-auto">
        {wd.forecast?.map((f, i) => (
          <div key={i} className="text-center leading-tight">
            <div className="text-[10px] font-semibold text-muted-foreground">{f.day}</div>
            <div className="text-sm my-0.5">{getWeatherDesc(f.code).icon}</div>
            <div className="text-[10px] font-semibold">{f.hi}°/{f.lo}°</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
