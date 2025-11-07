"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import { Sparkles, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGeneration } from "@/components/generation/generation-provider";

export default function Method2Page() {
  const { referenceImageId, productImageUrls, productDescription } = useGeneration();
  const [step1Prompt, setStep1Prompt] = useState<string>("");
  const [step1FilledJSON, setStep1FilledJSON] = useState<any>(null);
  const [step1Image, setStep1Image] = useState<string | null>(null);
  const [step2Prompt, setStep2Prompt] = useState<string>("");
  const [step2FilledJSON, setStep2FilledJSON] = useState<any>(null);
  const [step2Image, setStep2Image] = useState<string | null>(null);

  // METHOD 2: Generate both steps in one API call
  const generateTwoStepMutation = useMutation({
    mutationFn: async () => {
      if (!productImageUrls.length || !referenceImageId) {
        throw new Error("Missing required data");
      }

      return await client.method2.generateTwoStep({
        productImageUrls,
        productDescription,
        referenceImageId,
      });
    },
    onSuccess: (data) => {
      console.log("METHOD 2 - Success", data);
      // Set Step 1 data
      setStep1Prompt(data.step1.prompt);
      setStep1FilledJSON(data.step1.filled_json);
      setStep1Image(`data:image/png;base64,${data.step1.image}`);

      // Set Step 2 data
      setStep2Prompt(data.step2.prompt);
      setStep2FilledJSON(data.step2.filled_json);
      setStep2Image(`data:image/png;base64,${data.step2.image}`);

      toast.success("Method 2 two-step generation complete!");
    },
    onError: (error) => {
      toast.error("Method 2 failed: " + error.message);
    },
  });

  const downloadGeneratedImage = () => {
    if (!step2Image) return;
    const link = document.createElement("a");
    link.href = step2Image;
    link.download = `generated-ad-${Date.now()}.png`;
    link.click();
  };

  const canGenerate = productImageUrls.length > 0 && referenceImageId;

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      {canGenerate && (
        <Button
          onClick={() => generateTwoStepMutation.mutate()}
          disabled={generateTwoStepMutation.isPending}
          className="w-full"
          size="lg"
        >
          {generateTwoStepMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating (2 Steps)...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Ad (2 Steps)
            </>
          )}
        </Button>
      )}

      {/* Step 1 Image - Product Swap */}
      {step1Image && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Step 1: Product Swapped</h3>
          <div className="relative bg-muted/20 rounded-lg overflow-hidden">
            <img
              src={step1Image}
              alt="Step 1: Product swapped"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Step 1 Prompt */}
      {step1Prompt && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Step 1 Prompt (Product Swap)</h3>
          <textarea
            value={step1Prompt}
            onChange={(e) => setStep1Prompt(e.target.value)}
            className="w-full h-32 p-3 border rounded-lg resize-none font-mono text-sm"
            placeholder="Step 1 prompt..."
          />
        </div>
      )}

      {/* Step 1 JSON */}
      {step1FilledJSON && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Step 1 JSON</h3>
          <pre className="bg-muted/30 rounded-lg p-4 text-sm overflow-x-auto max-h-64 overflow-y-auto border">
            <code className="text-foreground">
              {JSON.stringify(step1FilledJSON, null, 2)}
            </code>
          </pre>
        </div>
      )}

      {/* Step 2 Image - Final Ad */}
      {step2Image && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Step 2: Final Ad</h3>
          <div className="relative bg-muted/20 rounded-lg overflow-hidden">
            <img
              src={step2Image}
              alt="Final generated ad"
              className="w-full h-auto"
            />
          </div>
          <Button
            onClick={downloadGeneratedImage}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Final Ad
          </Button>
        </div>
      )}

      {/* Step 2 Prompt */}
      {step2Prompt && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Step 2 Prompt (Text & Elements)</h3>
          <textarea
            value={step2Prompt}
            onChange={(e) => setStep2Prompt(e.target.value)}
            className="w-full h-32 p-3 border rounded-lg resize-none font-mono text-sm"
            placeholder="Step 2 prompt..."
          />
        </div>
      )}

      {/* Step 2 JSON */}
      {step2FilledJSON && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Step 2 JSON</h3>
          <pre className="bg-muted/30 rounded-lg p-4 text-sm overflow-x-auto max-h-64 overflow-y-auto border">
            <code className="text-foreground">
              {JSON.stringify(step2FilledJSON, null, 2)}
            </code>
          </pre>
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
