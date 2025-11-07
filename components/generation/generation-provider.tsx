"use client";
import { createContext, useContext, useState, useRef, ReactNode } from "react";

interface GenerationContextType {
  // Reference image selection
  referenceImageId: string | null;
  setReferenceImageId: (id: string | null) => void;

  // Product images upload (multiple)
  productImageUrls: string[];
  setProductImageUrls: (urls: string[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeProductImage: (index: number) => void;

  // Product description
  productDescription: string;
  setProductDescription: (description: string) => void;
}

const GenerationContext = createContext<GenerationContextType | null>(null);

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within GenerationProvider");
  }
  return context;
}

interface GenerationProviderProps {
  children: ReactNode;
}

export function GenerationProvider({ children }: GenerationProviderProps) {
  const [referenceImageId, setReferenceImageId] = useState<string | null>(null);
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [productDescription, setProductDescription] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        processedCount++;

        if (processedCount === files.length) {
          setProductImageUrls((prev) => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeProductImage = (index: number) => {
    setProductImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <GenerationContext.Provider
      value={{
        referenceImageId,
        setReferenceImageId,
        productImageUrls,
        setProductImageUrls,
        fileInputRef,
        handleFileUpload,
        removeProductImage,
        productDescription,
        setProductDescription,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}
