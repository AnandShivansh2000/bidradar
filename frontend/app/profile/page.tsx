"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
];

const CERTIFICATIONS = [
  { id: "8a", label: "8(a) Business Development" },
  { id: "HUBZone", label: "HUBZone" },
  { id: "WOSB", label: "Women-Owned Small Business (WOSB)" },
  { id: "SDVOSB", label: "Service-Disabled Veteran (SDVOSB)" },
  { id: "SBA", label: "SBA Small Business" },
  { id: "VOSB", label: "Veteran-Owned (VOSB)" },
  { id: "DVBE", label: "Disabled Veteran Business (DVBE)" },
  { id: "HUBs", label: "Historically Underutilized Business (HUBs)" },
];

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim().toUpperCase();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput("");
  };

  return (
    <div className="border border-slate-200 rounded-lg p-2 flex flex-wrap gap-2 min-h-[44px] bg-white focus-within:border-blue-400 transition-colors">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-medium"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="hover:text-blue-900 ml-0.5 text-base leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] outline-none text-sm text-slate-700 bg-transparent placeholder-slate-400"
      />
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

type ToastType = "success" | "error" | null;

export default function ProfilePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; msg: string } | null>(null);

  // Form state
  const [naicsCodes, setNaicsCodes] = useState<string[]>([]);
  const [certs, setCerts] = useState<string[]>([]);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [digestTime, setDigestTime] = useState("08:00");

  useEffect(() => {
    getProfile()
      .then((p: UserProfile) => {
        setNaicsCodes(p.naics_codes || []);
        setCerts(p.certifications || []);
        setMinValue(p.min_value?.toString() || "");
        setMaxValue(p.max_value?.toString() || "");
        setStates(p.states || []);
        setKeywords(p.keywords || []);
        setEmail(p.email || "");
        setDigestTime(p.digest_time || "08:00");
      })
      .catch(() => {});
  }, []);

  const showToast = (type: ToastType, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        naics_codes: naicsCodes,
        certifications: certs,
        min_value: minValue ? Number(minValue) : null,
        max_value: maxValue ? Number(maxValue) : null,
        states,
        keywords,
        email: email || null,
        digest_time: digestTime,
      });
      showToast("success", "✅ Profile saved! Rescoring your opportunities…");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      showToast("error", "❌ Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const toggleState = (s: string) =>
    setStates((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleCert = (id: string) =>
    setCerts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 ml-60 min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-4">
          <h1 className="text-xl font-bold text-slate-900">Company Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure your preferences to get matched opportunities</p>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in-down ${
              toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-8 py-6 max-w-2xl space-y-5">
          <FormSection title="NAICS Codes">
            <p className="text-xs text-slate-500 mb-2">Enter codes and press Enter or comma to add</p>
            <TagInput tags={naicsCodes} onChange={setNaicsCodes} placeholder="e.g. 541511, 336411…" />
          </FormSection>

          <FormSection title="Certifications">
            <div className="grid grid-cols-2 gap-3">
              {CERTIFICATIONS.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={certs.includes(c.id)}
                    onChange={() => toggleCert(c.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                  />
                  <span className="text-sm text-slate-700">{c.label}</span>
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection title="Contract Value Range">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Minimum ($)</label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  placeholder="e.g. 50000"
                  min={0}
                  max={50000000}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Maximum ($)</label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  placeholder="e.g. 5000000"
                  min={0}
                  max={50000000}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Target States">
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {US_STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleState(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    states.includes(s)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {states.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">{states.length} state{states.length !== 1 ? "s" : ""} selected</p>
            )}
          </FormSection>

          <FormSection title="Keywords">
            <p className="text-xs text-slate-500 mb-2">Match in opportunity titles and descriptions</p>
            <TagInput tags={keywords} onChange={setKeywords} placeholder="e.g. cybersecurity, cloud, DevSecOps…" />
          </FormSection>

          <FormSection title="Email Alerts">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@company.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Daily Digest Time</label>
                <input
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
                />
              </div>
            </div>
          </FormSection>

          <div className="flex items-center gap-3 justify-end pt-2 pb-8">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-2 text-sm font-semibold text-white transition-colors"
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
