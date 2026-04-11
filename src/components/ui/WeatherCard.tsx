'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { getWeatherDesc, type WeatherIconName } from '@/lib/helpers';
import { Card } from '@/components/ui/card';
import {
  Sun, CloudSun, Cloud, Cloudy, CloudFog,
  CloudDrizzle, CloudRain, CloudRainWind,
  CloudSnow, Snowflake, CloudLightning, CloudOff,
  Wind, Droplets, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<WeatherIconName, LucideIcon> = {
  Sun, CloudSun, Cloud, Cloudy, CloudFog,
  CloudDrizzle, CloudRain, CloudRainWind,
  CloudSnow, Snowflake, CloudLightning, CloudOff,
};

interface WeatherIconProps {
  code: number;
  className?: string;
}

export function WeatherIcon({ code, className }: WeatherIconProps) {
  const { icon, color } = getWeatherDesc(code);
  const Icon = ICONS[icon];
  return <Icon className={cn(color, className)} strokeWidth={1.75} />;
}

export default function WeatherCard() {
  const { projects, currentProject } = useAppStore();
  const proj = projects[currentProject];
  const wd = proj?.weatherDetail;

  if (!wd) {
    return (
      <Card className="flex items-center gap-2.5 px-4 py-2.5 mb-4">
        <CloudOff className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        <p className="text-xs text-muted-foreground">
          {proj?.weather && proj.weather !== 'Loading weather...' ? proj.weather : 'Loading weather…'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex items-center gap-3.5 px-4 py-3 mb-4 flex-wrap bg-white">
      {/* Main icon tile */}
      <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-sky-50 via-white to-amber-50 shadow-sm ring-1 ring-slate-200">
        <WeatherIcon code={wd.code} className="h-6 w-6" />
      </div>

      {/* Temperature + description */}
      <div className="flex flex-col leading-tight">
        <strong className="text-[17px] font-bold text-foreground tabular-nums">{wd.temp}°F</strong>
        <span className="text-[11px] text-muted-foreground">{wd.desc}</span>
      </div>

      {/* Separator */}
      <div className="h-8 w-px bg-border/60 hidden sm:block" />

      {/* Wind + humidity */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Wind className="h-3.5 w-3.5 text-sky-500" strokeWidth={1.75} />
          <span className="tabular-nums font-medium">{wd.wind}</span>
          <span className="text-muted-foreground/70">mph</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-sky-500" strokeWidth={1.75} />
          <span className="tabular-nums font-medium">{wd.humidity}</span>
          <span className="text-muted-foreground/70">%</span>
        </span>
      </div>

      {/* Alerts */}
      {wd.alerts.length > 0 && (
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white bg-gradient-to-r from-red-500 to-orange-600 px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
          <AlertTriangle className="h-3 w-3" strokeWidth={2.25} />
          {wd.alerts.join(', ')}
        </span>
      )}

      {/* 3-day forecast tiles */}
      <div className="flex gap-2 ml-auto">
        {wd.forecast?.map((f, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center text-center leading-tight px-2.5 py-1.5 rounded-lg bg-muted/40 ring-1 ring-border/40 min-w-[54px]"
          >
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{f.day}</div>
            <WeatherIcon code={f.code} className="h-4 w-4 my-1" />
            <div className="text-[10.5px] font-semibold text-foreground tabular-nums">
              {f.hi}°<span className="text-muted-foreground/70">/{f.lo}°</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
