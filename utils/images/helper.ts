

export const getImageUrl = (imageId: string) => {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/medias/${imageId}.webp`;
};