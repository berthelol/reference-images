"use client";
import { Upload, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeneration } from "./generation-provider";
import { RawProductDialog } from "./raw-product-dialog";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { client } from "@/utils/orpc";

export function ProductUpload() {
  const {
    productImageUrls,
    fileInputRef,
    handleFileUpload,
    removeProductImage,
    productDescription,
    setProductDescription,
  } = useGeneration();
  const [rawDialogOpen, setRawDialogOpen] = useState(false);

  // Generate description from first image
  const generateDescriptionMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const result = await client.productUtils.generateProductDescription({
        imageUrl,
      });
      return result.description;
    },
    onSuccess: (description) => {
      setProductDescription(description);
    },
  });

  // Auto-generate description when first image is uploaded
  useEffect(() => {
    if (productImageUrls.length > 0 && !productDescription) {
      generateDescriptionMutation.mutate(productImageUrls[0]);
    }
  }, [productImageUrls.length]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Your Product</h3>

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Upload product images
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Product images grid */}
      {productImageUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {productImageUrls.map((url, index) => (
            <div key={index} className="relative">
              <div className="relative bg-muted/20 rounded overflow-hidden aspect-square">
                <img
                  src={url}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>
              <Button
                onClick={() => removeProductImage(index)}
                size="sm"
                variant="secondary"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full text-xs"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Product description */}
      {productImageUrls.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Product Description
          </label>
          {generateDescriptionMutation.isPending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 border rounded">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing product...
            </div>
          ) : (
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="w-full p-2 text-xs border rounded resize-none"
              rows={2}
              placeholder="Short product description..."
            />
          )}
        </div>
      )}

      {/* Generate raw product image button */}
      {productImageUrls.length > 0 && (
        <Button
          onClick={() => setRawDialogOpen(true)}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          <Wand2 className="w-3 h-3 mr-2" />
          Generate Raw Product Image
        </Button>
      )}

      {/* Raw Product Dialog */}
      <RawProductDialog open={rawDialogOpen} onOpenChange={setRawDialogOpen} />
    </div>
  );
}
