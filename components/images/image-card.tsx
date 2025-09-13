"use client";

import { Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageSupabaseWithTags } from "@/types/supabase-compute";
import { getImageUrl } from "@/utils/images/helper";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { getAspectRatioValue } from "@/utils/data/aspect-ratios";
import { useQueryState } from "nuqs";
import { toast } from "sonner";

interface ImageCardProps {
  image: ImageSupabaseWithTags;
}

export function ImageCard({ image }: ImageCardProps) {
  const [, setImageModal] = useQueryState("imageModal");

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast("Coming soon", {
      description: "Save functionality will be available soon!",
    });
  };

  const downloadImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = getImageUrl(image.id);
    link.download = `reference-image-${image.id}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openImageModal = () => {
    setImageModal(image.id);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer mb-4">
      <div
        onClick={openImageModal}
        className="relative w-full block"
        style={{
          aspectRatio: image?.aspect_ratio ? getAspectRatioValue(image.aspect_ratio as any) : 1
        }}
      >
        <ImageWithFallback
          src={getImageUrl(image?.id)}
          placeholder={image?.blur_data ? 'blur' : 'empty'}
          blurDataURL={image?.blur_data || ''}
          alt={`Reference image ${image?.id}`}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
        />

        {/* New badge - always visible */}
        {image.is_new && (
          <div className="absolute top-2 left-2">
            <Badge 
              variant="secondary" 
              className="text-xs font-semibold shadow-sm text-black"
            >
              NEW
            </Badge>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Actions in top right */}
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              onClick={handleSave}
              size="sm"
              variant="secondary"
              className={cn(
                "h-8 w-8 p-0 bg-white/90 hover:bg-white"
              )}
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              onClick={downloadImage}
              size="sm"
              variant="secondary"
              className={cn(
                "h-8 w-8 p-0 bg-white/90 hover:bg-white"
              )}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Tags in bottom left */}
          {image.tags && image.tags.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]">
              {image.tags.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag.id} 
                  variant="secondary" 
                  className={cn(
                    "text-xs bg-white/90 text-black hover:bg-white"
                  )}
                >
                  {tag.title}
                </Badge>
              ))}
              {image.tags.length > 3 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs bg-white/90 text-black"
                  )}
                >
                  +{image.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
