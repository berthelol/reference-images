import { pub } from "@/utils/orpc/middlewares";
// import { db } from "@/utils/kysely/client"; // Commented out - using Supabase admin client instead
import { supabaseAdmin } from "@/utils/supabase/admin";
import { z } from "zod";

export const getAllTags = pub.handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("tags")
    .select("id, title, created_at, master_tag_id")
    .eq("is_validated", true)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return data || [];
});

export const getUnvalidatedTags = pub.handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("tags")
    .select(`
      id,
      title,
      created_at,
      master_tag_id,
      master:master_tag_id (
        title
      )
    `)
    .eq("is_validated", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch unvalidated tags: ${error.message}`);
  }

  // Transform the data to match expected format
  const result = (data || []).map((tag: any) => ({
    id: tag.id,
    title: tag.title,
    created_at: tag.created_at,
    master_tag_id: tag.master_tag_id,
    master_title: tag.master?.title || null,
  }));

  return result;
});

export const validateTag = pub
  .input(z.object({ tagId: z.string() }))
  .handler(async ({ input }) => {
    const { error } = await supabaseAdmin
      .from("tags")
      .update({ is_validated: true })
      .eq("id", input.tagId);

    if (error) {
      throw new Error(`Failed to validate tag: ${error.message}`);
    }

    return { success: true };
  });

export const deleteTag = pub
  .input(z.object({ tagId: z.string() }))
  .handler(async ({ input }) => {
    // First, delete any image-tag associations
    const { error: deleteAssocError } = await supabaseAdmin
      .from("images-tags")
      .delete()
      .eq("tag_id", input.tagId);

    if (deleteAssocError) {
      throw new Error(`Failed to delete tag associations: ${deleteAssocError.message}`);
    }

    // Then delete the tag itself
    const { error: deleteTagError } = await supabaseAdmin
      .from("tags")
      .delete()
      .eq("id", input.tagId);

    if (deleteTagError) {
      throw new Error(`Failed to delete tag: ${deleteTagError.message}`);
    }

    return { success: true };
  });
