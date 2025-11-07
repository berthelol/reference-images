"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Wand2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGeneration } from "@/components/generation/generation-provider";
import { client } from "@/utils/orpc";

export default function Method3Page() {
  const {
    referenceImageId,
    productImageUrls,
    productDescription,
  } = useGeneration();

  const [step1Image, setStep1Image] = useState<string | null>(null);
  const [step2JSON, setStep2JSON] = useState<any | null>(null);
  const [step3Instructions, setStep3Instructions] = useState<string[] | null>(null);
  const [step4Image, setStep4Image] = useState<string | null>(null);

  // Generate four-step mutation
  const generateFourStepMutation = useMutation({
    mutationFn: async () => {
      if (!referenceImageId) {
        throw new Error("Please select a reference image");
      }
      if (!productImageUrls.length) {
        throw new Error("Please upload at least one product image");
      }

      return await client.method3.generateFourStep({
        productImageUrls,
        productDescription,
        referenceImageId,
      });
    },
    onSuccess: (data) => {
      console.log("METHOD 3 - Success", data);
      setStep1Image(`data:image/png;base64,${data.step1.image}`);
      setStep2JSON(data.step2.filled_json);
      setStep3Instructions(data.step3.instructions);
      setStep4Image(`data:image/png;base64,${data.step4.image}`);
      toast.success("Method 3 generation completed!");
    },
    onError: (error) => {
      toast.error("Failed to generate: " + error.message);
    },
  });

  const canGenerate =
    referenceImageId && productImageUrls.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Method 3: Four-Step Generation</h2>
        <p className="text-sm text-muted-foreground">
          Step 1: Product placement → Step 2: Generate JSON → Step 3: Create instructions → Step 4: Final refinement
        </p>
      </div>

      {/* Generate Button */}
      <div className="flex gap-3">
        <Button
          onClick={() => generateFourStepMutation.mutate()}
          disabled={!canGenerate || generateFourStepMutation.isPending}
          size="lg"
          className="flex-1"
        >
          {generateFourStepMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating (4 steps)...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate with Method 3
            </>
          )}
        </Button>
      </div>

      {!canGenerate && (
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
          Please select a reference image and upload product images to start
          generating.
        </div>
      )}

      {/* Results Grid */}
      {(step1Image || step2JSON || step3Instructions || step4Image) && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Generation Results</h3>

          {/* Step 1: Initial Product Placement */}
          {step1Image && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  1
                </div>
                <h4 className="font-semibold">Initial Product Placement</h4>
              </div>
              <div className="relative bg-muted/20 rounded overflow-hidden">
                <img
                  src={step1Image}
                  alt="Step 1: Product Placement"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Nano Banana placed the product in the template without changing text or colors.
              </p>
            </div>
          )}

          {/* Step 2: Filled JSON */}
          {step2JSON && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  2
                </div>
                <h4 className="font-semibold">Generated Filled JSON</h4>
              </div>
              <div className="bg-muted/30 rounded p-3 overflow-x-auto">
                <pre className="text-xs max-h-[600px] overflow-y-auto">
                  {JSON.stringify(step2JSON, null, 2)}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                GPT-4o analyzed the product and generated the complete filled JSON structure.
              </p>
            </div>
          )}

          {/* Step 3: Change Instructions */}
          {step3Instructions && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  3
                </div>
                <h4 className="font-semibold">Change Instructions</h4>
              </div>
              <div className="bg-muted/30 rounded p-3 space-y-2">
                {step3Instructions.map((instruction, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    <span>{instruction}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                GPT-4o translated JSON changes into readable instructions for Nano Banana.
              </p>
            </div>
          )}

          {/* Step 4: Final Result */}
          {step4Image && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  4
                </div>
                <h4 className="font-semibold">Final Refined Image</h4>
              </div>
              <div className="relative bg-muted/20 rounded overflow-hidden">
                <img
                  src={step4Image}
                  alt="Step 4: Final Result"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Nano Banana applied all instructions to create the final image.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
