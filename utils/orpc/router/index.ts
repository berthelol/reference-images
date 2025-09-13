import { getAllImages } from "@/utils/orpc/router/images";
import { getAllTags, getUnvalidatedTags, validateTag } from "@/utils/orpc/router/tags";
import { processImages } from "@/utils/orpc/router/admin";

export const router = {
  images: {
    getAll: getAllImages,
  },
  tags: {
    getAll: getAllTags,
    getUnvalidated: getUnvalidatedTags,
    validate: validateTag,
  },
  admin: {
    processImages,
  },
};
