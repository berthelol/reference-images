"use client";

import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from '@tanstack/react-virtual';
import { client } from "@/utils/orpc";
import { ImageCard } from "@/components/images/image-card";
import { useQueryState } from "nuqs";
import { filtersNuqsParsers } from "@/utils/nuqs/nuqs-parser";
import { getAspectRatioValue } from "@/utils/images/aspect-ratios";

interface ImageGalleryProps {}

export function ImageGallery({}: ImageGalleryProps) {
  const [tagsFilters] = useQueryState("tags", filtersNuqsParsers.tags);
  const [search] = useQueryState("search", filtersNuqsParsers.search);
  const [aspectRatiosFilters] = useQueryState("aspectRatios", filtersNuqsParsers.aspectRatios);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["images", tagsFilters, aspectRatiosFilters, search],
    queryFn: async ({ pageParam }) => {
      return await client.images.getAll({
        tagIds: tagsFilters?.length ? tagsFilters : undefined,
        aspectRatios: aspectRatiosFilters?.length ? aspectRatiosFilters : undefined,
        search: search || undefined,
        cursor: pageParam,
        limit: 40,
      });
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
    if (width < 640) return 2;
    if (width < 1024) return 3;
    if (width < 1536) return 4;
    return 5;
  };

  const [columns, setColumns] = React.useState(getColumns);

  React.useEffect(() => {
    const handleResize = () => setColumns(getColumns());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate item heights based on aspect ratio for masonry
  const itemHeights = React.useMemo(() => {
    const baseWidth = 280; // Base width for calculations
    return allImages.map(image => {
      const aspectRatio = image.aspect_ratio ? getAspectRatioValue(image.aspect_ratio as any) : 1;
      return Math.round(baseWidth / aspectRatio) + 16; // Add padding
    });
  }, [allImages]);

  const rowVirtualizer = useVirtualizer({
    count: allImages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => itemHeights[i] || 300,
    overscan: 5,
    lanes: columns,
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
  const columnWidth = 100 / columns;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {totalImages} image{totalImages !== 1 ? "s" : ""}
        {Number(tagsFilters?.length) > 0 && " with selected tags"}
        {Number(aspectRatiosFilters?.length) > 0 && " with selected aspect ratios"}
        {isFetchingNextPage && " (loading more...)"}
      </div>

      <div
        ref={parentRef}
        className="h-screen overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {isLoading ? (
            // Loading state
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 p-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse mb-4 break-inside-avoid">
                  <div 
                    className="bg-muted rounded-lg" 
                    style={{ 
                      aspectRatio: Math.random() * 0.5 + 0.75 // Random aspect ratio for loading 
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            // Virtualized masonry items
            rowVirtualizer.getVirtualItems().map((virtualItem) => (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${virtualItem.lane * columnWidth}%`,
                  width: `${columnWidth}%`,
                  height: `${itemHeights[virtualItem.index]}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                  padding: '0 8px',
                }}
              >
                <ImageCard 
                  key={allImages[virtualItem.index]?.id} 
                  image={allImages[virtualItem.index]} 
                />
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
