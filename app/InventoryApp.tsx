"use client";

import { useState } from "react";
import { supabase, isAtLeast, ROLE_LABELS } from "@/lib/supabase";
import { useSession, useProfile } from "@/lib/useProfile";
import AuthForm from "./AuthForm";
import TrainingGuideViewer from "./TrainingGuideViewer";
import AdminGuideBuilder from "./AdminGuideBuilder";
import UserRolesAdmin from "./UserRolesAdmin";

type Section = "guides" | "admin" | "users";

export default function App() {
  const { session, ready } = useSession();
  const { profile, loading: profileLoading, error: profileError } = useProfile(session);
  const [section, setSection] = useState<Section>("guides");

  if (!ready) {
    return <div className="empty" style={{ margin: 40 }}>Loading…</div>;
  }

  if (!session) {
    return <AuthForm />;
  }

  if (profileLoading && !profile) {
    return <div className="empty" style={{ margin: 40 }}>Loading profile…</div>;
  }

  if (profileError || !profile) {
    return (
      <div className="container">
        <div className="error-banner">
          <strong>Couldn’t load your profile:</strong> {profileError ?? "no profile row"}.
          Make sure the SQL migration ran in Supabase.
        </div>
        <button className="ghost" type="button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  const canAdmin = isAtLeast(profile.role, "admin");
  const canManageUsers = isAtLeast(profile.role, "super_admin");

  // If current section isn't permitted, drop back to guides
  const safeSection: Section =
    (section === "admin" && !canAdmin) || (section === "users" && !canManageUsers)
      ? "guides"
      : section;

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>Training Guides</h1>
          <div className="subtitle">
            Signed in as {session.user.email}
            <span className={`role-badge role-${profile.role}`}>{ROLE_LABELS[profile.role]}</span>
            <button
              type="button"
              className="ghost"
              onClick={() => supabase.auth.signOut()}
              style={{ marginLeft: 8 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="main-nav">
        <button
          type="button"
          className={`nav-btn ${safeSection === "guides" ? "active" : ""}`}
          onClick={() => setSection("guides")}
        >
          Guides
        </button>
        {canAdmin && (
          <button
            type="button"
            className={`nav-btn ${safeSection === "admin" ? "active" : ""}`}
            onClick={() => setSection("admin")}
          >
            Builder
          </button>
        )}
        {canManageUsers && (
          <button
            type="button"
            className={`nav-btn ${safeSection === "users" ? "active" : ""}`}
            onClick={() => setSection("users")}
          >
            Users
          </button>
        )}
      </nav>

      <main style={{ marginTop: 20 }}>
        {safeSection === "guides" && <TrainingGuideViewer profile={profile} />}
        {safeSection === "admin" && canAdmin && <AdminGuideBuilder />}
        {safeSection === "users" && canManageUsers && (
          <UserRolesAdmin currentUserId={session.user.id} />
        )}
      </main>
    </div>
  );
}
