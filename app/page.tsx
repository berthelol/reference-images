import { ImageGallery } from "@/components/images/image-gallery";
import { TagsFiltersListing } from "@/components/images/tags-filters-listing";
import { supabaseAdmin } from "@/utils/supabase/admin";

export default async function HomePage() {
  const { data: tags } = await supabaseAdmin.from("tags").select("*");
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
          <TagsFiltersListing tags={tags || []} />
        </div>

        <div className="lg:col-span-3">
          <ImageGallery />
        </div>
      </div>
    </div>
  );
}
