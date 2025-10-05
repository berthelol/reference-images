"use client";
import { useState, useRef } from "react";
import { useQueryState } from "nuqs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import { X, Upload, Sparkles, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/utils/images/helper";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { getAspectRatioValue } from "@/utils/images/aspect-ratios";
import { toast } from "sonner";


export function ImageGenerationModal() {
  const [templateKey, setTemplateKey] = useQueryState("template-key");
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [filledJSON, setFilledJSON] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch reference template image
  const { data: templateImage, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["image", templateKey],
    queryFn: async () => {
      if (!templateKey) return null;
      return await client.images.getById({ id: templateKey });
    },
    enabled: !!templateKey,
  });

  // Generate prompt mutation
  const generatePromptMutation = useMutation({
    mutationFn: async () => {
      if (!productImageUrl || !templateImage || !templateImage.reference_json) {
        throw new Error("Missing required data");
      }

      let referenceJSON = templateImage.reference_json;
      if (typeof referenceJSON === "string") {
        referenceJSON = JSON.parse(referenceJSON);
      }

      return await client.adGeneration.generatePrompt({
        productImageUrl,
        referenceImageId: templateKey!,
        referenceJSON,
      });
    },
    onSuccess: (data) => {
      setPrompt(data.prompt);
      setFilledJSON(data.filled_json);
      toast.success("Prompt generated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to generate prompt: " + error.message);
    },
  });

  // Generate ad mutation
  const generateAdMutation = useMutation({
    mutationFn: async () => {
      if (!productImageUrl || !prompt || !filledJSON) {
        throw new Error("Missing required data");
      }

      return await client.adGeneration.generateAd({
        prompt,
        productImageUrl,
        referenceImageId: templateKey!,
        filledJSON,
      });
    },
    onSuccess: (data) => {
      setGeneratedImage(`data:image/png;base64,${data.image}`);
      toast.success("Ad generated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to generate ad: " + error.message);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProductImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    setTemplateKey(null);
    setProductImageUrl(null);
    setPrompt("");
    setFilledJSON(null);
    setGeneratedImage(null);
  };

  const downloadGeneratedImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-ad-${Date.now()}.png`;
    link.click();
  };

  if (!templateKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Generate Ad with Template</h2>
          <Button
            onClick={handleClose}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Images */}
            <div className="space-y-6">
              {/* Reference Template */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Reference Template</h3>
                {isLoadingTemplate ? (
                  <div className="bg-muted rounded-lg aspect-square w-full animate-pulse" />
                ) : (
                  templateImage && (
                    <div
                      className="relative mx-auto bg-muted/20 rounded-lg overflow-hidden"
                      style={{
                        aspectRatio: templateImage.aspect_ratio
                          ? getAspectRatioValue(templateImage.aspect_ratio as any)
                          : 1,
                        maxHeight: "300px",
                        width: "100%",
                      }}
                    >
                      <ImageWithFallback
                        src={getImageUrl(templateImage.id)}
                        placeholder={templateImage.blur_data ? "blur" : "empty"}
                        blurDataURL={templateImage.blur_data || ""}
                        alt="Reference template"
                        fill
                        className="object-contain"
                        sizes="400px"
                      />
                    </div>
                  )
                )}
              </div>

              {/* Product Upload */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Your Product</h3>
                {!productImageUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload product image
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative bg-muted/20 rounded-lg overflow-hidden aspect-square">
                      <img
                        src={productImageUrl}
                        alt="Product"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      onClick={() => setProductImageUrl(null)}
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {/* Generate Prompt Button */}
                {productImageUrl && !prompt && (
                  <Button
                    onClick={() => generatePromptMutation.mutate()}
                    disabled={generatePromptMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {generatePromptMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Prompt...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Prompt
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Generated Image */}
              {generatedImage && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Generated Ad</h3>
                  <div className="relative bg-muted/20 rounded-lg overflow-hidden">
                    <img
                      src={generatedImage}
                      alt="Generated ad"
                      className="w-full h-auto"
                    />
                  </div>
                  <Button
                    onClick={downloadGeneratedImage}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Ad
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Prompt & JSON */}
            <div className="space-y-6">
              {/* Prompt */}
              {prompt && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Generation Prompt</h3>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-48 p-3 border rounded-lg resize-none font-mono text-sm"
                    placeholder="Prompt will appear here..."
                  />
                </div>
              )}

              {/* Filled JSON */}
              {filledJSON && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Filled Template JSON</h3>
                  <pre className="bg-muted/30 rounded-lg p-4 text-sm overflow-x-auto max-h-96 overflow-y-auto border">
                    <code className="text-foreground">
                      {JSON.stringify(filledJSON, null, 2)}
                    </code>
                  </pre>
                </div>
              )}

              {/* Generate Ad Button */}
              {prompt && filledJSON && (
                <Button
                  onClick={() => generateAdMutation.mutate()}
                  disabled={generateAdMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {generateAdMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Ad...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Ad
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
