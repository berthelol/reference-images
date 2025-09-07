import { z } from 'zod'
import { pub } from '@/utils/orpc/middlewares'
import { db } from '@/utils/kysely/client'
import { sql } from 'kysely'

export const getAllImages = pub
  .input(
    z.object({
      tagIds: z.array(z.string()).optional(),
    })
  )
  .handler(async ({ input }) => {
    let query = db
      .selectFrom('images')
      .leftJoin('images-tags as it', 'it.image_id', 'images.id')
      .leftJoin('tags', 'tags.id', 'it.tag_id')
      .select([
        'images.id',
        'images.created_at',
        'images.blur_data',
        // Aggregate tags into JSON array using PostgreSQL functions
        sql<any[]>`
          COALESCE(
            JSON_AGG(
              CASE 
                WHEN tags.id IS NOT NULL 
                THEN JSON_BUILD_OBJECT('id', tags.id, 'title', tags.title)
                ELSE NULL 
              END
            ) FILTER (WHERE tags.id IS NOT NULL),
            '[]'::json
          )
        `.as('tags')
      ])
      .groupBy(['images.id', 'images.created_at', 'images.blur_data'])

    // Add filtering for specific tags (AND logic - image must have ALL specified tags)
    if (input.tagIds && input.tagIds.length > 0) {
      query = query
        .where('images.id', 'in', (eb) =>
          eb.selectFrom('images-tags as filter_it')
            .select('filter_it.image_id')
            .where('filter_it.tag_id', 'in', input.tagIds!)
            .groupBy('filter_it.image_id')
            .having(sql`COUNT(DISTINCT filter_it.tag_id)`, '=', input.tagIds!.length)
        )
    }

    const result = await query
      .orderBy('images.created_at', 'desc')
      .execute()

    return result
  })
