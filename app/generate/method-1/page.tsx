"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import { Sparkles, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGeneration } from "@/components/generation/generation-provider";

export default function Method1Page() {
  const { referenceImageId, productImageUrls, productDescription } = useGeneration();
  const [prompt, setPrompt] = useState<string>("");
  const [filledJSON, setFilledJSON] = useState<any>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // METHOD 1: Generate prompt mutation
  const generatePromptMutation = useMutation({
    mutationFn: async () => {
      if (!productImageUrls.length || !referenceImageId) {
        throw new Error("Missing required data");
      }

      return await client.method1.generatePrompt({
        productImageUrls,
        productDescription,
        referenceImageId,
      });
    },
    onSuccess: (data) => {
      console.log("METHOD 1 - STEP 1 Success", data);
      setPrompt(data.prompt);
      setFilledJSON(data.filled_json);
      toast.success("Method 1 prompt generated!");
    },
    onError: (error) => {
      toast.error("Failed to generate prompt: " + error.message);
    },
  });

  // METHOD 1: Generate ad mutation
  const generateAdMutation = useMutation({
    mutationFn: async () => {
      if (!productImageUrls.length || !prompt || !filledJSON) {
        throw new Error("Missing required data");
      }

      return await client.method1.generateAd({
        prompt,
        productImageUrls,
        productDescription,
        referenceImageId: referenceImageId!,
        filledJSON,
      });
    },
    onSuccess: (data) => {
      console.log("METHOD 1 - STEP 2Success", data);
      setGeneratedImage(`data:image/png;base64,${data.image}`);
      toast.success("Method 1 ad generated!");
    },
    onError: (error) => {
      toast.error("Failed to generate ad: " + error.message);
    },
  });

  const downloadGeneratedImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-ad-${Date.now()}.png`;
    link.click();
  };

  const canGeneratePrompt = productImageUrls.length > 0 && referenceImageId;
  const canGenerateAd = prompt && filledJSON;

  return (
    <div className="space-y-6">
      {/* Generate Prompt Button */}
      {canGeneratePrompt && (
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
          <pre className="bg-muted/30 rounded-lg p-4 text-sm overflow-x-auto max-h-[800px] overflow-y-auto border">
            <code className="text-foreground">
              {JSON.stringify(filledJSON, null, 2)}
            </code>
          </pre>
        </div>
      )}

      {/* Generate Ad Button */}
      {canGenerateAd && (
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

      {/* Empty state */}
      {productImageUrls.length === 0 && !referenceImageId && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
          <p className="text-muted-foreground">
            Select a reference template and upload product images to get started
          </p>
        </div>
      )}
    </div>
  );
}
