"use client";

import { useState } from "react";
import {
  type Guide,
  TAB_LABELS,
  TARGET_ROLE_LABELS,
  type Tab,
} from "@/lib/supabase";
import { useGuides, createGuide, deleteGuide } from "@/lib/useGuideBuilder";
import GuideEditor from "./GuideEditor";

export default function AdminGuideBuilder() {
  const { guides, loading, error, reload } = useGuides({ adminView: true });
  const [editing, setEditing] = useState<Guide | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleNew(tab: Tab) {
    setBusy(true);
    setErrMsg(null);
    try {
      const g = await createGuide({ tab, title: "Untitled guide" });
      await reload();
      setEditing(g);
    } catch (e: any) {
      setErrMsg(e.message ?? "Failed to create guide");
    } finally {
      setBusy(false);
      setCreating(false);
    }
  }

  async function handleDelete(g: Guide) {
    if (!confirm(`Delete "${g.title}"? This removes all its steps.`)) return;
    try {
      await deleteGuide(g.id);
      reload();
    } catch (e: any) {
      setErrMsg(e.message ?? "Failed to delete");
    }
  }

  if (editing) {
    return (
      <GuideEditor
        guide={editing}
        onClose={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <h2>Guide Builder</h2>
          <div className="subtitle">Create and manage training guides</div>
        </div>
        <button className="primary" type="button" onClick={() => setCreating(true)} disabled={busy}>
          + New Guide
        </button>
      </div>

      {errMsg && (
        <div className="error-banner">
          <strong>Error:</strong> {errMsg}
          <button className="ghost" onClick={() => setErrMsg(null)} type="button">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="error-banner"><strong>Error:</strong> {error}</div>
      )}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : guides.length === 0 ? (
        <div className="empty">No guides yet. Click “+ New Guide” to create one.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Tab</th>
              <th>Category</th>
              <th>Target role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {guides.map((g) => (
              <tr key={g.id}>
                <td>{g.title}</td>
                <td>{TAB_LABELS[g.tab]}</td>
                <td>{g.category || "—"}</td>
                <td>{TARGET_ROLE_LABELS[g.target_role]}</td>
                <td>
                  <span className={`badge ${g.published ? "badge-published" : "badge-draft"}`}>
                    {g.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button className="ghost" type="button" onClick={() => setEditing(g)}>
                      Edit
                    </button>
                    <button className="danger" type="button" onClick={() => handleDelete(g)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {creating && (
        <div className="modal-overlay" onClick={() => setCreating(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Which section?</h2>
            <p className="subtitle">Choose where the new guide should appear.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="primary" type="button" disabled={busy} onClick={() => handleNew("platform")}>
                Platform Guide
              </button>
              <button className="primary" type="button" disabled={busy} onClick={() => handleNew("how_to")}>
                How-To Guide
              </button>
            </div>
            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
