"use client";

import { useQueryState } from "nuqs";
import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ImageDetail } from "@/components/images/image-detail";


export function ImageSidebar() {
  const [imageModal, setImageModal] = useQueryState("imageModal");

  function handleClose() {
    setImageModal(null);
  }

  return (
    <Sheet open={!!imageModal} onOpenChange={handleClose}>
      <SheetContent className="right-4 top-4 bottom-4 h-auto max-h-[calc(100vh-2rem)] w-[500px] !max-w-[80vw] rounded-lg border shadow-2xl">
        <SheetTitle className="sr-only">Image Detail</SheetTitle>
        {imageModal && <ImageDetail imageId={imageModal} />}
      </SheetContent>
    </Sheet>
  );
}

export default ImageSidebar;
