import { getAllImages } from "@/utils/orpc/router/images";
import { getAllTags } from "@/utils/orpc/router/tags";

export const router = {
  images: {
    getAll: getAllImages,
  },
  tags: {
    getAll: getAllTags,
  },
};
