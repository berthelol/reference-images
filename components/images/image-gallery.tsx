'use client'

import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/utils/orpc'
import { ImageCard } from '@/components/images/image-card'
import { useQueryState } from 'nuqs'
import { filtersNuqsParsers } from '@/utils/nuqs/nuqs-parser'

interface ImageGalleryProps {
}

export function ImageGallery({  }: ImageGalleryProps) {
  const [tagsFilters] = useQueryState("tags", filtersNuqsParsers.tags);

  console.log("tagsFilters", tagsFilters);

  const { data: images, isLoading, error } = useQuery(
    orpc.images.getAll.queryOptions({
      queryKey: ["images", tagsFilters],
      input: {
        tagIds: tagsFilters?.length ? tagsFilters : undefined
      }
    })
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
    )
  }

  if (!images || images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-lg font-semibold mb-2">No images found</div>
        <div className="text-muted-foreground">
          {Number(tagsFilters?.length) > 0
            ? 'Try adjusting your tag filters'
            : 'No images have been added yet'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {images.length} image{images.length !== 1 ? 's' : ''}
        {Number(tagsFilters?.length) > 0 && ' with selected tags'}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image: any) => (
          // <ImageCard key={image.id} image={image} />
          <div key={image.id}>{image.id}</div>
        ))}
      </div>
    </div>
  )
}