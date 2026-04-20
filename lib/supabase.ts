import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type ItemRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  threshold: number;
  created_at?: string;
};
