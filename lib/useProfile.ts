"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Profile } from "./supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready };
}

export function useProfile(session: Session | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session) {
        setProfile(null);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) setError(error.message);
      else setProfile((data as Profile) ?? null);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { profile, loading, error };
}
