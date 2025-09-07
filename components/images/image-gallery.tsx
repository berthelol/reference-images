"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { ImageCard } from "@/components/images/image-card";
import { useQueryState } from "nuqs";
import { filtersNuqsParsers } from "@/utils/nuqs/nuqs-parser";
import { ImageSupabaseWithTags } from "@/types/supabase-compute";

interface ImageGalleryProps {}

export function ImageGallery({}: ImageGalleryProps) {
  const [tagsFilters] = useQueryState("tags", filtersNuqsParsers.tags);


  const {
    data: images,
    isLoading,
  } = useQuery(
    orpc.images.getAll.queryOptions({
      queryKey: ["images", tagsFilters],
      input: {
        tagIds: tagsFilters?.length ? tagsFilters : undefined,
      },
    })
  );

  console.log("images", images, {tagsFilters});


  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {images?.length} image{images?.length !== 1 ? "s" : ""}
        {Number(tagsFilters?.length) > 0 && " with selected tags"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted aspect-square rounded-lg mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        {images?.map((image: ImageSupabaseWithTags) => (
          <ImageCard key={image.id} image={image} />
        ))}
      </div>
    </div>
  );
}
