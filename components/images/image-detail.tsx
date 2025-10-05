"use client";

import { Download, Heart, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/utils/images/helper";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Badge } from "@/components/ui/badge";
import { getAspectRatioValue } from "@/utils/images/aspect-ratios";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import { toast } from "sonner";
import { useQueryState } from "nuqs";

interface ImageDetailProps {
  imageId: string;
}

export function ImageDetail({ imageId }: ImageDetailProps) {
  const [, setTemplateKey] = useQueryState("template-key");
  const [, closeImageSidebar] = useQueryState("image-sidebar")

  const { data: image, isLoading, error } = useQuery({
    queryKey: ["image", imageId],
    queryFn: async () => {
      return await client.images.getById({ id: imageId });
    },
    enabled: !!imageId,
  });

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast("Coming soon", {
      description: "Save functionality will be available soon!",
    });
  };

  const handleGenerateAd = () => {
    setTemplateKey(imageId);
    closeImageSidebar(null);
  };

  const downloadImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = getImageUrl(imageId);
    link.download = `reference-image-${imageId}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyJsonToClipboard = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!image?.reference_json) {
      toast.error("No JSON data available to copy");
      return;
    }

    try {
      let jsonToCopy;
      if (typeof image.reference_json === 'string') {
        jsonToCopy = JSON.stringify(JSON.parse(image.reference_json), null, 2);
      } else {
        jsonToCopy = JSON.stringify(image.reference_json, null, 2);
      }

      await navigator.clipboard.writeText(jsonToCopy);
      toast.success("JSON copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy JSON to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="bg-muted rounded-lg aspect-square w-full max-w-2xl mx-auto" />
          <div className="h-4 bg-muted rounded mt-4" />
          <div className="h-4 bg-muted rounded mt-2 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          {error ? "Error loading image" : "Image not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-6 max-h-full overflow-y-auto">
      {/* Image */}
      <div className="relative mx-auto max-w-full">
        <div
          className="relative mx-auto bg-muted/20 rounded-lg overflow-hidden"
          style={{
            aspectRatio: image.aspect_ratio ? getAspectRatioValue(image.aspect_ratio as any) : 1,
            maxHeight: "60vh",
            width: "100%",
            maxWidth: "600px"
          }}
        >
          <ImageWithFallback
            src={getImageUrl(image.id)}
            placeholder={image.blur_data ? 'blur' : 'empty'}
            blurDataURL={image.blur_data || ''}
            alt={`Reference image ${image.id}`}
            fill
            className="object-contain"
            sizes="600px"
          />
        </div>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            onClick={handleSave}
            size="sm"
            variant="secondary"
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            onClick={downloadImage}
            size="sm"
            variant="secondary"
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Generate Ad Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateAd}
          size="lg"
          className="w-full max-w-md  text-white shadow-lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Ad with this template
        </Button>
      </div>

      {/* Tags */}
      {image.tags && image.tags.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Tags ({image.tags.length})</h3>
          <div className="flex flex-wrap gap-2 max-w-full">
            {image.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-sm px-3 py-1 whitespace-nowrap"
              >
                {tag.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Reference JSON */}
      {image.reference_json && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Reference JSON</h3>
            <Button
              onClick={copyJsonToClipboard}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy JSON
            </Button>
          </div>
          <div className="relative">
            <pre className="bg-muted/30 rounded-lg p-4 text-sm overflow-x-auto max-h-96 overflow-y-auto border">
              <code className="text-foreground">
                {typeof image.reference_json === 'string'
                  ? JSON.stringify(JSON.parse(image.reference_json), null, 2)
                  : JSON.stringify(image.reference_json, null, 2)
                }
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
