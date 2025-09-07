import { ImageGallery } from "@/components/images/image-gallery";
import { TagsFiltersListing } from "@/components/images/tags-filters-listing";
import { db } from "@/utils/kysely/client";
import { Suspense } from "react";

export default async function HomePage() {
  const tags = await db.selectFrom("tags").selectAll().execute();
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reference Images</h1>
        <p className="text-muted-foreground">
          Browse and download reference images organized by tags
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Suspense fallback={<div className="animate-pulse bg-muted rounded h-64" />}>
            <TagsFiltersListing tags={tags} />
          </Suspense>
        </div>

        <div className="lg:col-span-3">
          <Suspense fallback={<div className="animate-pulse bg-muted rounded h-64" />}>
            <ImageGallery />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
