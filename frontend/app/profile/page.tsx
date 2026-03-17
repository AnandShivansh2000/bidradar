"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, updateProfile } from "@/lib/api";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","PR","GU","VI"
];

const CERTIFICATIONS = [
  { id: "8a", label: "8(a) Business Development" },
  { id: "HUBZone", label: "HUBZone" },
  { id: "WOSB", label: "Women-Owned Small Business (WOSB)" },
  { id: "SDVOSB", label: "Service-Disabled Veteran (SDVOSB)" },
  { id: "VOSB", label: "Veteran-Owned (VOSB)" },
  { id: "None", label: "None" },
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
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput("");
  };

  return (
    <div className="border border-gray-200 rounded-md p-2 flex flex-wrap gap-2 min-h-[42px]">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-xs font-medium"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="hover:text-emerald-900 ml-1"
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
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] outline-none text-sm text-gray-700 bg-transparent"
      />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [naicsCodes, setNaicsCodes] = useState<string[]>([]);
  const [certs, setCerts] = useState<string[]>([]);
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [states, setStates] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [digestEnabled, setDigestEnabled] = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setNaicsCodes(p.naics_codes || []);
        setCerts(p.certifications || []);
        setMinValue(p.min_value?.toString() || "");
        setMaxValue(p.max_value?.toString() || "");
        setStates(p.states || []);
        setKeywords(p.keywords || []);
        setEmail(p.email || "");
        setDigestEnabled(p.digest_enabled || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        naics_codes: naicsCodes,
        certifications: certs,
        min_value: minValue ? parseInt(minValue) : null,
        max_value: maxValue ? parseInt(maxValue) : null,
        states,
        keywords,
        email: email || null,
        digest_enabled: digestEnabled,
      });
      setSaved(true);
      setTimeout(() => {
        router.push("/feed");
      }, 1000);
    } catch {
      setSaving(false);
    }
  };

  const toggleState = (s: string) => {
    setStates((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const toggleCert = (c: string) => {
    if (c === "None") {
      setCerts(["None"]);
      return;
    }
    setCerts((prev) => {
      const filtered = prev.filter((x) => x !== "None");
      return filtered.includes(c)
        ? filtered.filter((x) => x !== c)
        : [...filtered, c];
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
            <p className="text-gray-500 text-sm mt-1">Configure your preferences to get relevant opportunities</p>
          </div>
        </div>

        {/* Empty profile banner */}
        {profile && profile.naics_codes.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm font-medium">
              ⚠️ Your profile is incomplete — add NAICS codes to see relevant opportunities.
            </p>
          </div>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm font-medium">✅ Profile saved! Redirecting to feed…</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">NAICS Codes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-2">Enter NAICS codes for your business (press Enter or comma to add)</p>
              <TagInput tags={naicsCodes} onChange={setNaicsCodes} placeholder="e.g. 541511, 336411" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Certifications</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {CERTIFICATIONS.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={certs.includes(c.id)}
                      onChange={() => toggleCert(c.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">{c.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Contract Value Range</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Minimum ($)</label>
                  <input
                    type="number"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Maximum ($)</label>
                  <input
                    type="number"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    placeholder="e.g. 5000000"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Target States</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {US_STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleState(s)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      states.includes(s)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Keywords</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-2">Keywords to match in opportunity titles/descriptions</p>
              <TagInput tags={keywords} onChange={setKeywords} placeholder="e.g. cybersecurity, cloud, software" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setDigestEnabled(!digestEnabled)}
                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                    digestEnabled ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      digestEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </div>
                <span className="text-sm text-gray-700">Daily digest email</span>
              </label>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end pb-8">
            <Button type="button" variant="outline" onClick={() => router.push("/feed")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 px-6">
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
