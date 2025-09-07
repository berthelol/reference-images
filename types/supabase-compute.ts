import { Database } from "@/types/supabase";

export type TagSupabase = Database["public"]["Tables"]["tags"]["Row"];
export type ImageSupabase = Database["public"]["Tables"]["images"]["Row"];
export type ImageSupabaseWithTags = ImageSupabase & {
  tags: TagSupabase[];
};
export type ImageTagSupabase = Database["public"]["Tables"]["images-tags"]["Row"];