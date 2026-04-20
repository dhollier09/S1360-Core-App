"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type Guide,
  type GuideStep,
  type MediaItem,
  type Tab,
  type TargetRole,
  TAB_LABELS,
  TARGET_ROLE_LABELS,
  parseVideoEmbed,
  stepMedia,
} from "@/lib/supabase";
import {
  createStep,
  deleteStep,
  reorderSteps,
  saveStepMedia,
  updateGuide,
  updateStep,
  uploadStepImage,
  useGuideSteps,
} from "@/lib/useGuideBuilder";

export default function GuideEditor({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const [meta, setMeta] = useState<Guide>(guide);
  const [savingMeta, setSavingMeta] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { steps, setSteps, loading, reload } = useGuideSteps(guide.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Debounced save of metadata fields
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function patchMeta(patch: Partial<Guide>) {
    const next = { ...meta, ...patch };
    setMeta(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingMeta(true);
      setErr(null);
      try {
        await updateGuide(guide.id, patch);
      } catch (e: any) {
        setErr(e.message ?? "Failed to save");
      } finally {
        setSavingMeta(false);
      }
    }, 500);
  }

  async function togglePublished() {
    try {
      const next = !meta.published;
      setMeta({ ...meta, published: next });
      await updateGuide(guide.id, { published: next });
    } catch (e: any) {
      setErr(e.message ?? "Failed to update");
    }
  }

  async function addStep() {
    try {
      const s = await createStep(guide.id, steps.length);
      setSteps([...steps, s]);
    } catch (e: any) {
      setErr(e.message ?? "Failed to add step");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, order_index: i }));
    setSteps(next);
    try {
      await reorderSteps(next.map((s) => ({ id: s.id, order_index: s.order_index })));
    } catch (e: any) {
      setErr(e.message ?? "Failed to reorder");
      reload();
    }
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <button type="button" className="ghost" onClick={onClose}>← Back</button>
          <h2 style={{ marginTop: 4 }}>Edit guide</h2>
          <div className="subtitle">{savingMeta ? "Saving…" : "Changes save automatically"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={meta.published ? "ghost" : "primary"}
            onClick={togglePublished}
          >
            {meta.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {err && (
        <div className="error-banner">
          <strong>Error:</strong> {err}
          <button className="ghost" type="button" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      <div className="editor-card">
        <div className="form-grid">
          <div className="field full">
            <label>Title</label>
            <input value={meta.title} onChange={(e) => patchMeta({ title: e.target.value })} />
          </div>
          <div className="field full">
            <label>Description</label>
            <input value={meta.description} onChange={(e) => patchMeta({ description: e.target.value })} />
          </div>
          <div className="field">
            <label>Section</label>
            <select value={meta.tab} onChange={(e) => patchMeta({ tab: e.target.value as Tab })}>
              {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                <option key={t} value={t}>{TAB_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Category</label>
            <input value={meta.category} onChange={(e) => patchMeta({ category: e.target.value })} />
          </div>
          <div className="field full">
            <label>Target role</label>
            <select
              value={meta.target_role}
              onChange={(e) => patchMeta({ target_role: e.target.value as TargetRole })}
            >
              {(Object.keys(TARGET_ROLE_LABELS) as TargetRole[]).map((r) => (
                <option key={r} value={r}>{TARGET_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="admin-header" style={{ marginTop: 24 }}>
        <h3>Steps</h3>
        <button className="primary" type="button" onClick={addStep}>+ Add step</button>
      </div>

      {loading ? (
        <div className="empty">Loading steps…</div>
      ) : steps.length === 0 ? (
        <div className="empty">No steps yet. Click “+ Add step” to add one.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="step-edit-list">
              {steps.map((s, i) => (
                <StepEditor
                  key={s.id}
                  step={s}
                  index={i}
                  guideId={guide.id}
                  onChange={(patch) => setSteps(steps.map((x) => (x.id === s.id ? { ...x, ...patch } : x)))}
                  onDelete={async () => {
                    if (!confirm("Delete this step?")) return;
                    try {
                      await deleteStep(s.id);
                      setSteps(steps.filter((x) => x.id !== s.id));
                    } catch (e: any) {
                      setErr(e.message ?? "Failed to delete step");
                    }
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function StepEditor({
  step,
  index,
  guideId,
  onChange,
  onDelete,
}: {
  step: GuideStep;
  index: number;
  guideId: string;
  onChange: (patch: Partial<GuideStep>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function patchAndSave(patch: Partial<GuideStep>) {
    onChange(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateStep(step.id, patch).catch(() => {});
    }, 500);
  }

  return (
    <div ref={setNodeRef} style={style} className="step-edit-item">
      <div className="step-edit-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⋮⋮
      </div>
      <div className="step-edit-index">{index + 1}</div>
      <div className="step-edit-body">
        <input
          className="step-edit-title"
          placeholder="Step title"
          value={step.title}
          onChange={(e) => patchAndSave({ title: e.target.value })}
        />
        <textarea
          className="step-edit-desc"
          placeholder="Step description…"
          value={step.description}
          rows={3}
          onChange={(e) => patchAndSave({ description: e.target.value })}
        />
        <StepMediaEditor step={step} guideId={guideId} onChange={onChange} />
      </div>
      <button className="danger" type="button" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function StepMediaEditor({
  step,
  guideId,
  onChange,
}: {
  step: GuideStep;
  guideId: string;
  onChange: (patch: Partial<GuideStep>) => void;
}) {
  const media = stepMedia(step);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persist(next: MediaItem[]) {
    onChange({ media: next, image_url: null });
    try {
      await saveStepMedia(step.id, next);
      // Also clear legacy image_url so we don't double-render
      if (step.image_url) await updateStep(step.id, { image_url: null });
    } catch (e: any) {
      setErr(e.message ?? "Failed to save media");
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      const newItems: MediaItem[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadStepImage(guideId, step.id, f);
        newItems.push({ id: crypto.randomUUID(), type: "image", url, caption: "" });
      }
      await persist([...media, ...newItems]);
    } catch (e: any) {
      setErr(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function addVideo() {
    const url = videoUrl.trim();
    if (!url) return;
    setErr(null);
    try {
      const item: MediaItem = { id: crypto.randomUUID(), type: "video", url, caption: "" };
      await persist([...media, item]);
      setVideoUrl("");
      setAddingVideo(false);
    } catch (e: any) {
      setErr(e.message ?? "Failed to add video");
    }
  }

  async function removeAt(i: number) {
    const next = media.filter((_, idx) => idx !== i);
    await persist(next);
  }

  function moveAt(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const next = [...media];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  }

  function setCaption(i: number, caption: string) {
    const next = media.map((m, idx) => (idx === i ? { ...m, caption } : m));
    onChange({ media: next });
    if (captionTimer.current) clearTimeout(captionTimer.current);
    captionTimer.current = setTimeout(() => {
      saveStepMedia(step.id, next).catch(() => {});
    }, 500);
  }

  return (
    <div className="step-edit-media">
      {media.length > 0 && (
        <div className="step-edit-media-list">
          {media.map((m, i) => (
            <div key={m.id} className="step-edit-media-item">
              <div className="step-edit-media-preview">
                {m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.caption ?? ""} />
                ) : (
                  <div className="step-edit-video-thumb">
                    <span className="step-edit-video-icon">▶</span>
                    <div className="step-edit-video-url">{shortUrl(m.url)}</div>
                  </div>
                )}
              </div>
              <div className="step-edit-media-controls">
                <input
                  className="step-edit-caption"
                  placeholder="Caption (optional)"
                  value={m.caption ?? ""}
                  onChange={(e) => setCaption(i, e.target.value)}
                />
                <div className="step-edit-media-buttons">
                  <button type="button" className="ghost" onClick={() => moveAt(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => moveAt(i, 1)}
                    disabled={i === media.length - 1}
                  >
                    ↓
                  </button>
                  <button type="button" className="danger" onClick={() => removeAt(i)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="step-edit-media-add">
        <label className="step-edit-image-upload">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            disabled={uploading}
          />
          <span>{uploading ? "Uploading…" : "+ Add image(s)"}</span>
        </label>
        {addingVideo ? (
          <div className="step-edit-video-add">
            <input
              type="url"
              placeholder="YouTube / Vimeo / Loom URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addVideo();
                }
              }}
              autoFocus
            />
            <button type="button" className="primary" onClick={addVideo}>
              Add
            </button>
            <button type="button" className="ghost" onClick={() => { setAddingVideo(false); setVideoUrl(""); }}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="ghost" onClick={() => setAddingVideo(true)}>
            + Add video
          </button>
        )}
      </div>

      {err && <div className="step-edit-upload-err">{err}</div>}
    </div>
  );
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname.length > 20 ? u.pathname.slice(0, 20) + "…" : u.pathname}`;
  } catch {
    return url;
  }
}
