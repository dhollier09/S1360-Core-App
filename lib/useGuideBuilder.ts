"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, type Guide, type GuideStep } from "./supabase";

export function useGuides(opts: { adminView?: boolean } = {}) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("guides")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) setError(error.message);
    else setGuides((data as Guide[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { guides, loading, error, reload: load, setGuides };
}

export function useGuideSteps(guideId: string | null) {
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!guideId) {
      setSteps([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("guide_steps")
      .select("*")
      .eq("guide_id", guideId)
      .order("order_index", { ascending: true });
    if (error) setError(error.message);
    else setSteps((data as GuideStep[]) ?? []);
    setLoading(false);
  }, [guideId]);

  useEffect(() => {
    load();
  }, [load]);

  return { steps, setSteps, loading, error, reload: load };
}

export async function createGuide(input: Partial<Guide>): Promise<Guide> {
  const { data, error } = await supabase
    .from("guides")
    .insert({
      title: input.title ?? "Untitled guide",
      description: input.description ?? "",
      category: input.category ?? "",
      tab: input.tab ?? "how_to",
      target_role: input.target_role ?? "all",
      published: false,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Guide;
}

export async function updateGuide(id: string, patch: Partial<Guide>): Promise<void> {
  const { error } = await supabase
    .from("guides")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGuide(id: string): Promise<void> {
  const { error } = await supabase.from("guides").delete().eq("id", id);
  if (error) throw error;
}

export async function createStep(guideId: string, orderIndex: number): Promise<GuideStep> {
  const { data, error } = await supabase
    .from("guide_steps")
    .insert({ guide_id: guideId, order_index: orderIndex, title: "", description: "" })
    .select()
    .single();
  if (error) throw error;
  return data as GuideStep;
}

export async function updateStep(id: string, patch: Partial<GuideStep>): Promise<void> {
  const { error } = await supabase.from("guide_steps").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase.from("guide_steps").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderSteps(ordered: { id: string; order_index: number }[]): Promise<void> {
  // Update each step with its new order_index.
  await Promise.all(
    ordered.map((s) =>
      supabase.from("guide_steps").update({ order_index: s.order_index }).eq("id", s.id)
    )
  );
}

export async function uploadStepImage(guideId: string, stepId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${guideId}/${stepId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("guide-images")
    .upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from("guide-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function saveStepMedia(
  stepId: string,
  media: import("./supabase").MediaItem[]
): Promise<void> {
  const { error } = await supabase.from("guide_steps").update({ media }).eq("id", stepId);
  if (error) throw error;
}
