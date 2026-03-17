export type RelevanceLevel = "high" | "medium" | "low";
export type PortalStatus = "healthy" | "degraded" | "offline";
export type ScanStatus = "pending" | "running" | "completed" | "failed";
export type UrgencyTier = "urgent" | "closing_soon" | "normal";

export interface Opportunity {
  id: string;
  external_id?: string;
  title: string;
  agency: string;
  portal: string;
  // Legacy fields
  value?: number | null;
  naics_code?: string | null;
  naics_description?: string | null;
  portal_id?: string;
  deadline?: string | null;
  relevance_level?: RelevanceLevel | null;
  // New fields from backend
  naics_codes?: string[];
  set_asides?: string[];
  value_display?: string | null;
  value_min?: number | null;
  value_max?: number | null;
  state?: string | null;
  response_deadline?: string | null;
  posted_date?: string | null;
  description?: string | null;
  opportunity_url?: string;
  solicitation_number?: string | null;
  relevance_score?: number | null;
  relevance_label?: string | null;
  relevance_reasons?: string[];
  days_until_deadline?: number | null;
  urgency_tier?: UrgencyTier | null;
  is_urgent?: boolean;
  scan_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  portal: string;
  status: ScanStatus;
  stream_url: string | null;
  opportunities_found: number;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at?: string;
}

export interface Portal {
  id: string;
  name: string;
  display_name: string;
  base_url: string;
  status: PortalStatus;
  last_scan_at: string | null;
  opportunities_count: number;
}

export interface UserProfile {
  id?: string;
  email?: string | null;
  naics_codes: string[];
  certifications: string[];
  min_value?: number | null;
  max_value?: number | null;
  states: string[];
  keywords: string[];
  digest_enabled?: boolean;
  digest_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OpportunityFilters {
  relevance?: RelevanceLevel | "all";
  portal?: string;
  urgent_only?: boolean;
  sort?: "relevance" | "date";
  search?: string;
  set_aside?: string;
  state?: string;
}
