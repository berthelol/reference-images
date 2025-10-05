import { getAllImages, getImageById } from "@/utils/orpc/router/images";
import { getAllTags, getUnvalidatedTags, validateTag, deleteTag } from "@/utils/orpc/router/tags";
import { processImages } from "@/utils/orpc/router/admin";
import { generatePrompt, generateAd } from "@/utils/orpc/router/ad-generation";

export const router = {
  images: {
    getAll: getAllImages,
    getById: getImageById,
  },
  tags: {
    getAll: getAllTags,
    getUnvalidated: getUnvalidatedTags,
    validate: validateTag,
    delete: deleteTag,
  },
  admin: {
    processImages,
  },
  adGeneration: {
    generatePrompt,
    generateAd,
  },
};
