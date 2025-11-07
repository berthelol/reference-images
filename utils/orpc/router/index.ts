import { getAllImages, getImageById } from "@/utils/orpc/router/images";
import { getAllTags, getUnvalidatedTags, validateTag, deleteTag } from "@/utils/orpc/router/tags";
import { processImages } from "@/utils/orpc/router/admin";
import { generateMethod1Prompt, generateMethod1Ad } from "@/utils/orpc/router/method-1-generation";
import { generateMethod2TwoStep } from "@/utils/orpc/router/method-2-generation";
import { generateMethod3FourStep } from "@/utils/orpc/router/method-3-generation";
import { cleanProductImage, generateProductDescription } from "@/utils/orpc/router/product-utils";

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
  productUtils: {
    cleanProductImage,
    generateProductDescription,
  },
  // adGeneration: {
  //   generatePrompt,
  //   generateAd,
  // },
  method1: {
    generatePrompt: generateMethod1Prompt,
    generateAd: generateMethod1Ad,
  },
  method2: {
    generateTwoStep: generateMethod2TwoStep,
  },
  method3: {
    generateFourStep: generateMethod3FourStep,
  },
};
