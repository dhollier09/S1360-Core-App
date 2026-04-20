"use client";

import { useEffect, useState } from "react";
import { supabase, type Profile, type Role, ROLE_LABELS } from "@/lib/supabase";

export default function UserRolesAdmin({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) setErr(error.message);
    else setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(userId: string, newRole: Role) {
    const prev = users;
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    const { error } = await supabase.rpc("update_user_role", {
      target_user_id: userId,
      new_role: newRole,
    });
    if (error) {
      setErr(error.message);
      setUsers(prev);
    }
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <h2>User roles</h2>
          <div className="subtitle">Promote or demote team members</div>
        </div>
        <button className="ghost" type="button" onClick={load} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div className="error-banner">
          <strong>Error:</strong> {err}
          <button className="ghost" type="button" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : users.length === 0 ? (
        <div className="empty">No users found.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td>
                    {u.email ?? "—"}
                    {isSelf && <span className="badge badge-self" style={{ marginLeft: 8 }}>You</span>}
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      disabled={isSelf}
                      title={isSelf ? "You can't change your own role" : ""}
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
