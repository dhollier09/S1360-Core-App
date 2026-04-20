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
  type Tab,
  type TargetRole,
  TAB_LABELS,
  TARGET_ROLE_LABELS,
} from "@/lib/supabase";
import {
  createStep,
  deleteStep,
  reorderSteps,
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

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function patchAndSave(patch: Partial<GuideStep>) {
    onChange(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateStep(step.id, patch).catch(() => {});
    }, 500);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const url = await uploadStepImage(guideId, step.id, file);
      await updateStep(step.id, { image_url: url });
      onChange({ image_url: url });
    } catch (err: any) {
      setUploadErr(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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
        <div className="step-edit-image">
          {step.image_url ? (
            <div className="step-edit-image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={step.image_url} alt="" />
              <button
                type="button"
                className="ghost"
                onClick={async () => {
                  await updateStep(step.id, { image_url: null });
                  onChange({ image_url: null });
                }}
              >
                Remove image
              </button>
            </div>
          ) : (
            <label className="step-edit-image-upload">
              <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
              <span>{uploading ? "Uploading…" : "Add image"}</span>
            </label>
          )}
          {uploadErr && <div className="step-edit-upload-err">{uploadErr}</div>}
        </div>
      </div>
      <button className="danger" type="button" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
