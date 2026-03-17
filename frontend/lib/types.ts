export type RelevanceLevel = "high" | "medium" | "low";
export type PortalStatus = "healthy" | "degraded" | "offline";
export type ScanStatus = "pending" | "running" | "completed" | "failed";

export interface Opportunity {
  id: string;
  title: string;
  agency: string;
  value: number | null;
  value_min: number | null;
  value_max: number | null;
  state: string | null;
  naics_code: string | null;
  naics_description: string | null;
  portal: string;
  portal_id: string;
  opportunity_url: string;
  solicitation_number: string | null;
  posted_date: string | null;
  deadline: string | null;
  is_urgent: boolean;
  set_asides: string[];
  description: string | null;
  relevance_score: number | null;
  relevance_level: RelevanceLevel | null;
  relevance_reasons: string[];
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  portal: string;
  status: ScanStatus;
  stream_url: string | null;
  opportunities_found: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
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
  id: string;
  email: string | null;
  naics_codes: string[];
  certifications: string[];
  min_value: number | null;
  max_value: number | null;
  states: string[];
  keywords: string[];
  digest_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpportunityFilters {
  relevance?: RelevanceLevel | "all";
  portal?: string;
  urgent_only?: boolean;
  sort?: "relevance" | "date";
  search?: string;
}
