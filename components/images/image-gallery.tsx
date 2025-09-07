"use client";

import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from '@tanstack/react-virtual';
import { client } from "@/utils/orpc";
import { ImageCard } from "@/components/images/image-card";
import { useQueryState } from "nuqs";
import { filtersNuqsParsers } from "@/utils/nuqs/nuqs-parser";
import { ImageSupabaseWithTags } from "@/types/supabase-compute";

interface ImageGalleryProps {}

export function ImageGallery({}: ImageGalleryProps) {
  const [tagsFilters] = useQueryState("tags", filtersNuqsParsers.tags);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["images", tagsFilters],
    queryFn: async ({ pageParam }) => {
      const result = await client.images.getAll({
        tagIds: tagsFilters?.length ? tagsFilters : undefined,
        cursor: pageParam,
        limit: 20,
      });
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

  // Flatten all images from all pages
  const allImages = React.useMemo(
    () => data?.pages.flatMap(page => page.images) ?? [],
    [data]
  );

  // Calculate number of columns based on screen size
  const getColumns = () => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 768) return 1;
    if (width < 1024) return 2;
    if (width < 1280) return 3;
    return 4;
  };

  const [columns, setColumns] = React.useState(getColumns);

  React.useEffect(() => {
    const handleResize = () => setColumns(getColumns());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Organize images into rows for virtualization
  const imageRows = React.useMemo(() => {
    const rows: ImageSupabaseWithTags[][] = [];
    for (let i = 0; i < allImages.length; i += columns) {
      rows.push(allImages.slice(i, i + columns) as ImageSupabaseWithTags[]);
    }
    return rows;
  }, [allImages, columns]);

  const rowVirtualizer = useVirtualizer({
    count: imageRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 420, // Estimated height per row
    overscan: 2,
  });

  // Check if we need to fetch more when scrolled near bottom
  React.useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = parent;
      if (
        scrollHeight - scrollTop - clientHeight < 1000 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    parent.addEventListener('scroll', handleScroll);
    return () => parent.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const totalImages = allImages.length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {totalImages} image{totalImages !== 1 ? "s" : ""}
        {Number(tagsFilters?.length) > 0 && " with selected tags"}
        {isFetchingNextPage && " (loading more...)"}
      </div>

      <div
        ref={parentRef}
        className="h-screen overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            //height: '100vh',
            width: '100%',
            position: 'relative',
          }}
        >
          {isLoading ? (
            // Loading state
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted aspect-square rounded-lg mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Virtualized rows
            rowVirtualizer.getVirtualItems().map((virtualRow: any) => (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
                  {imageRows[virtualRow.index]?.map((image: ImageSupabaseWithTags) => (
                    <ImageCard key={image.id} image={image} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
}
