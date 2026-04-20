"use client";

import { type Guide, type MediaItem, TAB_LABELS, parseVideoEmbed, stepMedia } from "@/lib/supabase";
import { useGuideSteps } from "@/lib/useGuideBuilder";

function MediaRenderer({ item }: { item: MediaItem }) {
  if (item.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt={item.caption ?? ""} className="step-image" />
    );
  }
  const parsed = parseVideoEmbed(item.url);
  if (parsed.kind === "iframe") {
    return (
      <div className="step-video-wrap">
        <iframe
          src={parsed.src}
          className="step-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={item.caption ?? "Embedded video"}
        />
      </div>
    );
  }
  return (
    <video controls className="step-video-file" src={parsed.src}>
      Your browser does not support embedded video.
    </video>
  );
}

export default function GuideDetail({ guide, onBack }: { guide: Guide; onBack: () => void }) {
  const { steps, loading, error } = useGuideSteps(guide.id);

  return (
    <div className="guide-detail">
      <button type="button" className="ghost" onClick={onBack}>
        ← Back to guides
      </button>
      <div className="guide-detail-header">
        <div className="guide-category">
          {TAB_LABELS[guide.tab]}
          {guide.category ? ` · ${guide.category}` : ""}
        </div>
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
          {steps.map((s, i) => {
            const media = stepMedia(s);
            return (
              <li key={s.id} className="step-item">
                <div className="step-number">{i + 1}</div>
                <div className="step-body">
                  {s.title && <h3 className="step-title">{s.title}</h3>}
                  {s.description && <p className="step-description">{s.description}</p>}
                  {media.length > 0 && (
                    <div className="step-media-gallery">
                      {media.map((m) => (
                        <figure key={m.id} className="step-media-figure">
                          <MediaRenderer item={m} />
                          {m.caption && <figcaption className="step-media-caption">{m.caption}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
