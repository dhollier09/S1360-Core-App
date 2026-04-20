"use client";

import { useMemo, useState } from "react";
import { type Guide, type Profile, TAB_LABELS, type Tab } from "@/lib/supabase";
import { useGuides } from "@/lib/useGuideBuilder";
import GuideDetail from "./GuideDetail";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function TrainingGuideViewer({ profile }: { profile: Profile }) {
  const { guides, loading, error } = useGuides();
  const [tab, setTab] = useState<Tab>("platform");
  const [search, setSearch] = useState("");
  const [openGuide, setOpenGuide] = useState<Guide | null>(null);

  // Only published guides (RLS also enforces, but this hides drafts from admins here)
  const visible = useMemo(() => guides.filter((g) => g.published), [guides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visible
      .filter((g) => g.tab === tab)
      .filter((g) => {
        if (!q) return true;
        return (
          g.title.toLowerCase().includes(q) ||
          stripHtml(g.description).toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
        );
      });
  }, [visible, tab, search]);

  const countByTab = useMemo(() => {
    const c: Record<Tab, number> = { platform: 0, how_to: 0 };
    visible.forEach((g) => c[g.tab]++);
    return c;
  }, [visible]);

  if (openGuide) {
    return <GuideDetail guide={openGuide} onBack={() => setOpenGuide(null)} />;
  }

  return (
    <div>
      <div className="tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            <span className="tab-count">{countByTab[t]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar" style={{ marginTop: 16 }}>
        <input
          type="search"
          placeholder="Search guides…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="empty">Loading guides…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {search
            ? "No guides match your search."
            : `No ${TAB_LABELS[tab].toLowerCase()} available yet.`}
        </div>
      ) : (
        <div className="guide-grid">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              className="guide-card"
              onClick={() => setOpenGuide(g)}
            >
              {g.category && <div className="guide-category">{g.category}</div>}
              <div className="guide-title">{g.title}</div>
              {g.description && <div className="guide-description">{stripHtml(g.description)}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
