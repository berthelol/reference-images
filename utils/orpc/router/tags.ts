import { pub } from "@/utils/orpc/middlewares";
import { db } from "@/utils/kysely/client";
import { z } from "zod";

export const getAllTags = pub.handler(async () => {
  const result = await db
    .selectFrom("tags")
    .select(['id', 'title', 'created_at', 'master_tag_id'])
    .where('is_validated', '=', true)
    .orderBy("title", "asc")
    .execute();

  return result;
});

export const getUnvalidatedTags = pub.handler(async () => {
  const result = await db
    .selectFrom("tags as t")
    .leftJoin("tags as master", "t.master_tag_id", "master.id")
    .select([
      't.id',
      't.title',
      't.created_at',
      't.master_tag_id',
      'master.title as master_title'
    ])
    .where('t.is_validated', '=', false)
    .orderBy("t.created_at", "desc")
    .execute();

  return result;
});

export const validateTag = pub
  .input(z.object({ tagId: z.string() }))
  .handler(async ({ input }) => {
    await db
      .updateTable("tags")
      .set({ is_validated: true })
      .where("id", "=", input.tagId)
      .execute();

    return { success: true };
  });
