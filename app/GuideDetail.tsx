"use client";

import { type Guide, TAB_LABELS } from "@/lib/supabase";
import { useGuideSteps } from "@/lib/useGuideBuilder";

export default function GuideDetail({ guide, onBack }: { guide: Guide; onBack: () => void }) {
  const { steps, loading, error } = useGuideSteps(guide.id);

  return (
    <div className="guide-detail">
      <button type="button" className="ghost" onClick={onBack}>
        ← Back to guides
      </button>
      <div className="guide-detail-header">
        <div className="guide-category">{TAB_LABELS[guide.tab]}{guide.category ? ` · ${guide.category}` : ""}</div>
        <h2>{guide.title}</h2>
        {guide.description && <p className="guide-detail-description">{guide.description}</p>}
      </div>

      {error && <div className="error-banner"><strong>Error:</strong> {error}</div>}

      {loading ? (
        <div className="empty">Loading steps…</div>
      ) : steps.length === 0 ? (
        <div className="empty">This guide has no steps yet.</div>
      ) : (
        <ol className="step-list">
          {steps.map((s, i) => (
            <li key={s.id} className="step-item">
              <div className="step-number">{i + 1}</div>
              <div className="step-body">
                {s.title && <h3 className="step-title">{s.title}</h3>}
                {s.description && <p className="step-description">{s.description}</p>}
                {s.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt={s.title || `Step ${i + 1}`} className="step-image" />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
