// import { z } from 'zod'
// import { pub } from '@/utils/orpc/middlewares'
// // import { db } from '@/utils/kysely/client' // Commented out - using Supabase admin client instead
// // import { sql } from 'kysely'
// import { supabaseAdmin } from '@/utils/supabase/admin'

// export const getImageById = pub
//   .input(z.object({
//     id: z.string()
//   }))
//   .handler(async ({ input }) => {
//     // Fetch image data
//     const { data: image, error: imageError } = await supabaseAdmin
//       .from('images')
//       .select('*')
//       .eq('id', input.id)
//       .single()

//     if (imageError || !image) {
//       throw new Error('Image not found')
//     }

//     // Fetch associated tags
//     const { data: imageTags, error: tagsError } = await supabaseAdmin
//       .from('images-tags')
//       .select(`
//         tag_id,
//         tags!inner (
//           id,
//           title,
//           is_validated
//         )
//       `)
//       .eq('image_id', input.id)
//       .eq('tags.is_validated', true)

//     if (tagsError) {
//       throw new Error(`Failed to fetch tags: ${tagsError.message}`)
//     }

//     // Transform tags to match expected format
//     const tags = (imageTags || [])
//       .filter((it: any) => it.tags)
//       .map((it: any) => ({
//         id: it.tags.id,
//         title: it.tags.title
//       }))

//     return {
//       ...image,
//       tags
//     }
//   })

// export const getAllImages = pub
//   .input(
//     z.object({
//       tagIds: z.array(z.string()).optional(),
//       aspectRatios: z.array(z.string()).optional(),
//       search: z.string().optional(),
//       limit: z.number().min(1).max(100).default(20),
//       cursor: z.string().optional(),
//     })
//   )
//   .handler(async ({ input }) => {
//     let query = db
//       .selectFrom('images')
//       .leftJoin('images-tags as it', 'it.image_id', 'images.id')
//       .leftJoin('tags', (join) => join
//         .onRef('tags.id', '=', 'it.tag_id')
//         .on('tags.is_validated', '=', true)
//       )
//       .select([
//         'images.id',
//         'images.created_at',
//         'images.blur_data',
//         'images.aspect_ratio',
//         'images.is_new',
//         // Aggregate tags into JSON array using PostgreSQL functions
//         sql<any[]>`
//           COALESCE(
//             JSON_AGG(
//               CASE
//                 WHEN tags.id IS NOT NULL
//                 THEN JSON_BUILD_OBJECT('id', tags.id, 'title', tags.title)
//                 ELSE NULL
//               END
//             ) FILTER (WHERE tags.id IS NOT NULL),
//             '[]'::json
//           )
//         `.as('tags')
//       ])
//       .groupBy(['images.id', 'images.created_at', 'images.blur_data', 'images.aspect_ratio', 'images.is_new'])

//     // Add filtering for specific tags (AND logic - image must have ALL specified tags)
//     if (input.tagIds && input.tagIds.length > 0) {
//       query = query
//         .where('images.id', 'in', (eb) =>
//           eb.selectFrom('images-tags as filter_it')
//             .innerJoin('tags as filter_tags', 'filter_tags.id', 'filter_it.tag_id')
//             .select('filter_it.image_id')
//             .where('filter_it.tag_id', 'in', input.tagIds!)
//             .where('filter_tags.is_validated', '=', true)
//             .groupBy('filter_it.image_id')
//             .having(sql`COUNT(DISTINCT filter_it.tag_id)`, '=', input.tagIds!.length)
//         )
//     }

//     // Add filtering for specific aspect ratios (OR logic - image can have ANY of the specified ratios)
//     if (input.aspectRatios && input.aspectRatios.length > 0) {
//       query = query.where('images.aspect_ratio', 'in', input.aspectRatios)
//     }

//     // Add vector search functionality (search only in vector_description)
//     if (input.search && input.search.trim().length > 0) {
//       const searchTerm = input.search.trim()
//       query = query.where(
//         sql<any>`images.vector_description @@ plainto_tsquery('english', ${searchTerm})` 
//       )
//     }

//     // Add cursor-based pagination
//     if (input.cursor) {
//       query = query.where('images.created_at', '<', input.cursor)
//     }

//     const result = await query
//       .orderBy('images.created_at', 'desc')
//       .limit(input.limit + 1) // Get one extra to check if there's more
//       .execute()

//     const hasMore = result.length > input.limit
//     const images = hasMore ? result.slice(0, input.limit) : result
//     const nextCursor = hasMore ? images[images.length - 1]?.created_at : null

//     return {
//       images,
//       nextCursor,
//       hasMore,
//     }
//   })
