const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

import type { Opportunity, Scan, Portal, UserProfile, OpportunityFilters } from "./types";

export async function getOpportunities(filters: OpportunityFilters = {}): Promise<Opportunity[]> {
  const params = new URLSearchParams();
  if (filters.relevance && filters.relevance !== "all") params.set("relevance", filters.relevance);
  if (filters.portal && filters.portal !== "all") params.set("portal", filters.portal);
  if (filters.urgent_only) params.set("urgent_only", "true");
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return fetchApi<Opportunity[]>(`/api/v1/opportunities${qs ? `?${qs}` : ""}`);
}

export async function getOpportunity(id: string): Promise<Opportunity> {
  return fetchApi<Opportunity>(`/api/v1/opportunities/${id}`);
}

export async function getScan(id: string): Promise<Scan> {
  return fetchApi<Scan>(`/api/v1/scans/${id}`);
}

export async function getScanOpportunities(scanId: string): Promise<Opportunity[]> {
  return fetchApi<Opportunity[]>(`/api/v1/scans/${scanId}/opportunities`);
}

export async function triggerScan(portal: string): Promise<Scan> {
  return fetchApi<Scan>(`/api/v1/scans/trigger?portal=${portal}`, { method: "POST" });
}

export async function getPortals(): Promise<Portal[]> {
  return fetchApi<Portal[]>("/api/v1/portals");
}

export async function getProfile(): Promise<UserProfile> {
  return fetchApi<UserProfile>("/api/v1/profile");
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  return fetchApi<UserProfile>("/api/v1/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export async function getDemoReplay(): Promise<Opportunity[]> {
  return fetchApi<Opportunity[]>("/api/v1/scans/demo-replay");
}
