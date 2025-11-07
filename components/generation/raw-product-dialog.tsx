"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useGeneration } from "./generation-provider";
import { client } from "@/utils/orpc";

interface RawProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RawProductDialog({
  open,
  onOpenChange,
}: RawProductDialogProps) {
  const { productImageUrls, productDescription, setProductImageUrls } =
    useGeneration();
  const [cleanedImage, setCleanedImage] = useState<string | null>(null);

  // Clean product image mutation
  const cleanProductMutation = useMutation({
    mutationFn: async () => {
      const result = await client.productUtils.cleanProductImage({
        productImageUrls,
        productDescription,
      });
      return result.image; // base64 image
    },
    onSuccess: (imageBase64) => {
      setCleanedImage(`data:image/png;base64,${imageBase64}`);
      toast.success("Product image cleaned!");
    },
    onError: (error) => {
      toast.error("Failed to clean image: " + error.message);
    },
  });

  const handleSave = () => {
    if (cleanedImage) {
      setProductImageUrls([...productImageUrls, cleanedImage]);
      toast.success("Cleaned image added to product images!");
      setCleanedImage(null);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setCleanedImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Generate Raw Product Image</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Left: Product Images */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Source Product Images</h4>
            <div className="grid grid-cols-2 gap-2">
              {productImageUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative bg-muted/20 rounded overflow-hidden aspect-square"
                >
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
            {productDescription && (
              <div className="mt-4 p-3 bg-muted/30 rounded text-xs">
                <p className="font-medium mb-1">Product Description:</p>
                <p className="text-muted-foreground">{productDescription}</p>
              </div>
            )}
          </div>

          {/* Right: Generated Clean Image */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Cleaned Product Image</h4>
            {cleanedImage ? (
              <div className="relative bg-muted/20 rounded overflow-hidden aspect-square">
                <img
                  src={cleanedImage}
                  alt="Cleaned product"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded aspect-square">
                <p className="text-sm text-muted-foreground text-center p-6">
                  Click "Clean Product Image" to remove text and decorations
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => cleanProductMutation.mutate()}
            disabled={cleanProductMutation.isPending}
            variant="outline"
          >
            {cleanProductMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cleaning...
              </>
            ) : (
              "Clean Product Image"
            )}
          </Button>
          <Button onClick={handleSave} disabled={!cleanedImage}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
