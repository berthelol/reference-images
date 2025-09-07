import { ImageSupabase } from "@/types/supabase-compute";

export const getImageUrl = (image: ImageSupabase | undefined) => {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${image?.id}.webp`;
};