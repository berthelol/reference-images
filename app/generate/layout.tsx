"use client";
import { GenerationProvider } from "@/components/generation/generation-provider";
import { ReferenceImageSelector } from "@/components/generation/reference-image-selector";
import { ProductUpload } from "@/components/generation/product-upload";
import { ArrowLeft, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMethod1 = pathname === "/generate/method-1";
  const isMethod2 = pathname === "/generate/method-2";
  const isMethod3 = pathname === "/generate/method-3";

  return (
    <GenerationProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">
                {isMethod1
                  ? "Method 1: One-Shot Generation"
                  : isMethod2
                  ? "Method 2: Two-Step Generation"
                  : "Ad Generation"}
              </h1>
            </div>
            <div className="flex gap-2">
              <Link href="/generate/method-1">
                <Button variant={isMethod1 ? "default" : "outline"} size="sm">
                  Method 1
                </Button>
              </Link>
              <Link href="/generate/method-2">
                <Button variant={isMethod2 ? "default" : "outline"} size="sm">
                  Method 2
                </Button>
              </Link>
              <Link href="/generate/method-3">
                <Button variant={isMethod3 ? "default" : "outline"} size="sm">
                  Method 3
                </Button>
              </Link>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Shared Inputs */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-start justify-center">
              <ReferenceImageSelector />
              <div className="flex items-center justify-center">
                <PlusIcon className="w-4 h-4" />
              </div>

              <ProductUpload />
            </div>

            {/* Right Column - Method-specific content */}
            <div className="space-y-6">{children}</div>
          </div>
        </div>
      </div>
    </GenerationProvider>
  );
}
