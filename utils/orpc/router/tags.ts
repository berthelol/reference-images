import { pub } from "@/utils/orpc/middlewares";
import { db } from "@/utils/kysely/client";

export const getAllTags = pub.handler(async () => {
  const result = await db
    .selectFrom("tags")
    .select(['id', 'title', 'created_at', 'master_tag_id'])
    .where('is_validated', '=', true)
    .orderBy("title", "asc")
    .execute();

  return result;
});
