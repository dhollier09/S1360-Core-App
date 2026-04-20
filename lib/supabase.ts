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

export type GuideStep = {
  id: string;
  guide_id: string;
  order_index: number;
  title: string;
  description: string;
  image_url: string | null;
  created_at?: string;
};

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
