"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { getImageUrl } from "@/utils/images/helper";
import { getAspectRatioValue } from "@/utils/images/aspect-ratios";
import { ImageIcon } from "lucide-react";
import { useGeneration } from "./generation-provider";

export function ReferenceImageSelector() {
  const { referenceImageId, setReferenceImageId } = useGeneration();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all reference images
  const { data: images, isLoading } = useQuery({
    queryKey: ["images", "reference"],
    queryFn: async () => {
      return await client.images.getAll({
        limit: 100,
      });
    },
  });

  // Get selected reference image
  const { data: selectedImage } = useQuery({
    queryKey: ["image", referenceImageId],
    queryFn: async () => {
      if (!referenceImageId) return null;
      return await client.images.getById({ id: referenceImageId });
    },
    enabled: !!referenceImageId,
  });

  const handleSelectImage = (imageId: string) => {
    setReferenceImageId(imageId);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reference Template</h3>
        <Button onClick={() => setIsOpen(true)} size="sm" variant="outline">
          Select
        </Button>
      </div>

      {/* Selected Image Preview */}
      {selectedImage && (
        <div
          className="relative mx-auto bg-muted/20 rounded-lg overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors"
          style={{
            aspectRatio: selectedImage.aspect_ratio
              ? getAspectRatioValue(selectedImage.aspect_ratio as any)
              : 1,
            maxHeight: "150px",
            width: "100%",
          }}
          onClick={() => setIsOpen(true)}
        >
          <ImageWithFallback
            src={getImageUrl(selectedImage.id)}
            placeholder={selectedImage.blur_data ? "blur" : "empty"}
            blurDataURL={selectedImage.blur_data || ""}
            alt="Reference template"
            fill
            className="object-contain"
            sizes="200px"
          />
        </div>
      )}

      {/* No selection placeholder */}
      {!selectedImage && (
        <div
          onClick={() => setIsOpen(true)}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
        >
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Select reference template
          </p>
        </div>
      )}

      {/* Dialog with Image Grid */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select Reference Template</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-4">
            {isLoading ? (
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-muted rounded aspect-square animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {images?.images.map((image) => (
                  <div
                    key={image.id}
                    onClick={() => handleSelectImage(image.id)}
                    className={`relative rounded overflow-hidden cursor-pointer transition-all ${
                      referenceImageId === image.id
                        ? "ring-2 ring-primary"
                        : "hover:ring-2 hover:ring-muted-foreground/50"
                    }`}
                    style={{
                      aspectRatio: image.aspect_ratio
                        ? getAspectRatioValue(image.aspect_ratio as any)
                        : 1,
                    }}
                  >
                    <ImageWithFallback
                      src={getImageUrl(image.id)}
                      placeholder={image.blur_data ? "blur" : "empty"}
                      blurDataURL={image.blur_data || ""}
                      alt={`Reference ${image.id}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                    {referenceImageId === image.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
