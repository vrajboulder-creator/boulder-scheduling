// ─── Entity Types ───

export type ActivityStatus = 'Not Started' | 'In Progress' | 'Complete' | 'Delayed' | 'Blocked' | 'Ready to Start';
export type ActivityPriority = 'Critical' | 'High' | 'Normal' | 'Low';
export type ProjectStatus = 'Active' | 'On Hold' | 'Complete' | 'Archived';
export type LinkType = 'FS' | 'FF' | 'SS' | 'SF';
export type LinkedItemType = 'RFI' | 'Submittal' | 'Inspection' | 'Procurement' | 'Permit' | 'Punch' | 'CO';
export type UserRole = 'Admin' | 'PM' | 'Superintendent' | 'Field' | 'Subcontractor' | 'Viewer';

export interface Project {
  id: string;
  name: string;
  code: string;
  location?: string;
  weather_info?: string;
  status: ProjectStatus;
  start_date?: string | null;
  target_completion?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityDB {
  id: string;
  project_id: string | null;
  name: string;
  trade: string;
  sub: string;
  area: string;
  floor: string;
  phase: string;
  start_date: string | null;
  finish_date: string | null;
  duration: number;
  status: ActivityStatus;
  pct: number;
  priority: ActivityPriority;
  blocker: string;
  milestone: boolean;
  lookahead: boolean;
  notes: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id: string;
  project_id: string | null;
  name: string;
  trade: string;
  sub: string;
  area: string;
  floor: string;
  phase: string;
  start: string | null;
  finish: string | null;
  duration: number;
  hasDate: boolean;
  status: ActivityStatus;
  pct: number;
  priority: ActivityPriority;
  blocker: string;
  milestone: boolean;
  lookahead: boolean;
  notes: string;
  predecessors: string[];
  successors: string[];
  linked: LinkedItemRef[];
  attachments: AttachmentRef[];
  sort_order?: number;
}

export interface LinkedItemRef {
  type: LinkedItemType;
  ref: string;
}

export interface AttachmentRef {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface ActivityLink {
  id: string;
  predecessor_id: string;
  successor_id: string;
  link_type: LinkType;
  lag_days: number;
}

export interface LinkedItem {
  id: string;
  activity_id: string;
  item_type: LinkedItemType;
  reference: string;
  status: string;
  created_at: string;
}

export interface ActivityNote {
  id: string;
  activity_id: string;
  note: string;
  author: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  activity_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

// ─── Frontend-specific types ───

export interface ProjectConfig {
  id: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  weather: string;
  weatherLoaded: boolean;
  weatherDetail?: WeatherDetail;
}

export interface WeatherDetail {
  temp: number;
  wind: number;
  humidity: number;
  desc: string;
  icon: string;
  code: number;
  alerts: string[];
  forecast: ForecastDay[];
}

export interface ForecastDay {
  day: string;
  hi: number;
  lo: number;
  rain: number;
  code: number;
}

export interface KPIs {
  due_today: number;
  starting_week: number;
  delayed: number;
  blocked: number;
  overdue: number;
  critical: number;
  in_progress: number;
  ready: number;
  inspections: number;
  procurement: number;
}

export type ViewType =
  | 'dashboard' | 'today' | 'this-week' | 'master' | 'gantt'
  | 'calendar' | 'lookahead-6' | 'lookahead-3' | 'milestones'
  | 'by-trade' | 'by-area' | 'by-sub'
  | 'delayed' | 'blocked' | 'in-progress' | 'ready' | 'completed'
  | 'procurement' | 'inspections' | 'punch' | 'turnover'
  | 'projects' | 'settings';

export interface SectionState {
  mode: 'list' | 'grid';
  trade: string;
  area: string;
  status: string;
  phase: string;
  floor: string;
}
