"use client";

import { Copy, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ImageSupabaseWithTags } from "@/types/supabase-compute";
import { getImageUrl } from "@/utils/images/helper";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Badge } from "@/components/ui/badge";

interface ImageCardProps {
  image: ImageSupabaseWithTags;
}

export function ImageCard({ image }: ImageCardProps) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(getImageUrl(image.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = getImageUrl(image.id);
    link.download = `reference-image-${image.id}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openInNewTab = () => {
    window.open(getImageUrl(image.id), "_blank");
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square">
        <ImageWithFallback
          src={getImageUrl(image?.id)}
          alt={`Reference image ${image?.id}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      <div className="p-4 space-y-3">
        {image.tags && image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {image.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.title}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={copyUrl}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Copy URL"}
          </Button>

          <Button onClick={downloadImage} variant="outline" size="sm">
            <Download className="w-4 h-4" />
          </Button>

          <Button onClick={openInNewTab} variant="outline" size="sm">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
