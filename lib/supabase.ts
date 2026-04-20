import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type Role = "employee" | "manager" | "admin" | "super_admin";
export type TargetRole = "all" | Role;
export type Tab = "platform" | "how_to";

export type Profile = {
  id: string;
  email: string | null;
  role: Role;
  created_at?: string;
};

export type Guide = {
  id: string;
  title: string;
  description: string;
  category: string;
  tab: Tab;
  target_role: TargetRole;
  published: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MediaItem = {
  id: string;
  type: "image" | "video";
  url: string;
  caption?: string;
};

export type GuideStep = {
  id: string;
  guide_id: string;
  order_index: number;
  title: string;
  description: string;
  image_url: string | null; // legacy single-image, kept for backwards compat
  media: MediaItem[];
  created_at?: string;
};

/**
 * Normalize a step's media list, falling back to legacy image_url if media is empty.
 */
export function stepMedia(step: GuideStep): MediaItem[] {
  if (step.media && step.media.length > 0) return step.media;
  if (step.image_url) {
    return [{ id: "legacy", type: "image", url: step.image_url, caption: "" }];
  }
  return [];
}

/** Parse common video URLs into an embeddable iframe src, or null for direct files. */
export function parseVideoEmbed(url: string): { kind: "iframe"; src: string } | { kind: "file"; src: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return { kind: "iframe", src: `https://www.youtube.com/embed/${v}` };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    // Vimeo
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
    // Loom
    if (host === "loom.com" || host.endsWith(".loom.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("share");
      const id = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
      if (id) return { kind: "iframe", src: `https://www.loom.com/embed/${id}` };
    }
  } catch {
    /* fall through */
  }
  return { kind: "file", src: url };
}

export const ROLE_RANK: Record<TargetRole, number> = {
  all: 0,
  employee: 1,
  manager: 2,
  admin: 3,
  super_admin: 4,
};

export function isAtLeast(userRole: Role | undefined, required: TargetRole): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export const ROLE_LABELS: Record<Role, string> = {
  employee: "Employee",
  manager: "Manager",
  admin: "Admin",
  super_admin: "Super Admin",
};

export const TARGET_ROLE_LABELS: Record<TargetRole, string> = {
  all: "All Users",
  ...ROLE_LABELS,
};

export const TAB_LABELS: Record<Tab, string> = {
  platform: "Platform Guide",
  how_to: "How-To Guides",
};
