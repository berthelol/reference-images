import { getAllImages } from "@/utils/orpc/router/images";
import { getAllTags } from "@/utils/orpc/router/tags";
import { processImages } from "@/utils/orpc/router/admin";

export const router = {
  images: {
    getAll: getAllImages,
  },
  tags: {
    getAll: getAllTags,
  },
  admin: {
    processImages,
  },
};
