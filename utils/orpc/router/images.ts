import { z } from 'zod'
import { pub } from '@/utils/orpc/middlewares'
// import { db } from '@/utils/kysely/client' // Commented out - using Supabase admin client instead
// import { sql } from 'kysely'
import { supabaseAdmin } from '@/utils/supabase/admin'

export const getImageById = pub
  .input(z.object({
    id: z.string()
  }))
  .handler(async ({ input }) => {
    // Fetch image data
    const { data: image, error: imageError } = await supabaseAdmin
      .from('images')
      .select('*')
      .eq('id', input.id)
      .single()

    if (imageError || !image) {
      throw new Error('Image not found')
    }

    // Fetch associated tags
    const { data: imageTags, error: tagsError } = await supabaseAdmin
      .from('images-tags')
      .select(`
        tag_id,
        tags!inner (
          id,
          title,
          is_validated
        )
      `)
      .eq('image_id', input.id)
      .eq('tags.is_validated', true)

    if (tagsError) {
      throw new Error(`Failed to fetch tags: ${tagsError.message}`)
    }

    // Transform tags to match expected format
    const tags = (imageTags || [])
      .filter((it: any) => it.tags)
      .map((it: any) => ({
        id: it.tags.id,
        title: it.tags.title
      }))

    return {
      ...image,
      tags
    }
  })

export const getAllImages = pub
  .input(
    z.object({
      tagIds: z.array(z.string()).optional(),
      aspectRatios: z.array(z.string()).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    })
  )
  .handler(async ({ input }) => {
    // Start with basic query
    let query = supabaseAdmin
      .from('images')
      .select('id, created_at, blur_data, aspect_ratio, is_new')

    // Add aspect ratio filter (OR logic)
    if (input.aspectRatios && input.aspectRatios.length > 0) {
      query = query.in('aspect_ratio', input.aspectRatios)
    }

    // Add vector search filter
    if (input.search && input.search.trim().length > 0) {
      query = query.textSearch('vector_description', input.search.trim(), {
        type: 'plain',
        config: 'english'
      })
    }

    // Add cursor-based pagination
    if (input.cursor) {
      query = query.lt('created_at', input.cursor)
    }

    // Execute query
    const { data: images, error: imagesError } = await query
      .order('created_at', { ascending: false })
      .limit(input.limit + 1)

    if (imagesError) {
      throw new Error(`Failed to fetch images: ${imagesError.message}`)
    }

    let filteredImages = images || []

    // If tag filtering is required, we need to do it separately
    if (input.tagIds && input.tagIds.length > 0) {
      // Get image IDs that have ALL the specified tags
      const imageIds = filteredImages.map(img => img.id)

      if (imageIds.length > 0) {
        const { data: imageTags, error: tagsError } = await supabaseAdmin
          .from('images-tags')
          .select('image_id, tag_id, tags!inner(is_validated)')
          .in('image_id', imageIds)
          .in('tag_id', input.tagIds)
          .eq('tags.is_validated', true)

        if (tagsError) {
          throw new Error(`Failed to fetch image tags: ${tagsError.message}`)
        }

        // Group by image_id and count distinct tags
        const tagCounts = (imageTags || []).reduce((acc: Record<string, Set<string>>, it: any) => {
          if (!acc[it.image_id]) {
            acc[it.image_id] = new Set()
          }
          acc[it.image_id].add(it.tag_id)
          return acc
        }, {})

        // Filter images that have ALL required tags (AND logic)
        const validImageIds = Object.entries(tagCounts)
          .filter(([_, tagSet]) => tagSet.size === input.tagIds!.length)
          .map(([imageId, _]) => imageId)

        filteredImages = filteredImages.filter(img => validImageIds.includes(img.id))
      }
    }

    // Now fetch tags for all remaining images
    if (filteredImages.length > 0) {
      const imageIds = filteredImages.map(img => img.id)

      const { data: allImageTags, error: allTagsError } = await supabaseAdmin
        .from('images-tags')
        .select(`
          image_id,
          tag_id,
          tags!inner (
            id,
            title,
            is_validated
          )
        `)
        .in('image_id', imageIds)
        .eq('tags.is_validated', true)

      if (allTagsError) {
        throw new Error(`Failed to fetch tags: ${allTagsError.message}`)
      }

      // Group tags by image_id
      const tagsByImageId = (allImageTags || []).reduce((acc: Record<string, any[]>, it: any) => {
        if (!acc[it.image_id]) {
          acc[it.image_id] = []
        }
        if (it.tags) {
          acc[it.image_id].push({
            id: it.tags.id,
            title: it.tags.title
          })
        }
        return acc
      }, {})

      // Attach tags to images
      filteredImages = filteredImages.map(img => ({
        ...img,
        tags: tagsByImageId[img.id] || []
      }))
    }

    const hasMore = filteredImages.length > input.limit
    const resultImages = hasMore ? filteredImages.slice(0, input.limit) : filteredImages
    const nextCursor = hasMore ? resultImages[resultImages.length - 1]?.created_at : null

    return {
      images: resultImages,
      nextCursor,
      hasMore,
    }
  })
