import { config } from 'dotenv'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { db } from '@/utils/kysely/client'
import { readFileSync } from 'fs'
import { join } from 'path'

config()

// Set to true to delete all existing tags and recreate, false to only create non-existing ones
const OVERRIDE = true 

interface TagCategory {
  name: string
  tags: string[]
  mandatory?: boolean
}

async function generateTags() {

  const tagsJsonPath = join(__dirname, 'tags.json')
  const tagsData: TagCategory[] = JSON.parse(readFileSync(tagsJsonPath, 'utf-8'))

  console.log('Starting tag generation...')
  console.log(`OVERRIDE mode: ${OVERRIDE ? 'ON - Will delete all existing tags' : 'OFF - Will only create non-existing tags'}`)

  // If OVERRIDE is true, delete all existing tags
  if (OVERRIDE) {
    console.log('\n🗑️  Deleting all existing tags...')
    
    try {
      // Delete images-tags relationships first (foreign key constraint)
      await db.deleteFrom('images-tags').execute()
      console.log('✓ Deleted all images-tags relationships')
      
      // Then delete all tags
      await db.deleteFrom('tags').execute()
      console.log('✓ All existing tags deleted')
    } catch (error) {
      console.error('Error deleting existing tags:', error)
      return
    }
  }

  // Get existing tags if not in OVERRIDE mode
  let existingTags: { title: string }[] = []
  if (!OVERRIDE) {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('title')
    
    if (error) {
      console.error('Error fetching existing tags:', error)
      return
    }
    
    existingTags = (data || []).filter((tag): tag is { title: string } => tag.title !== null)
    console.log(`Found ${existingTags.length} existing tags`)
  }

  const existingTagTitles = new Set(existingTags.map(tag => tag.title))

  for (const category of tagsData) {
    console.log(`\nProcessing category: ${category.name}`)

    // Check if master tag already exists
    let masterTag: { id: string } | null = null
    
    if (!OVERRIDE && existingTagTitles.has(category.name)) {
      // Get existing master tag
      const { data, error } = await supabaseAdmin
        .from('tags')
        .select('id')
        .eq('title', category.name)
        .is('master_tag_id', null)
        .single()
      
      if (error) {
        console.error(`Error fetching existing master tag "${category.name}":`, error)
        continue
      }
      
      masterTag = data
      console.log(`  ↻ Using existing master tag: ${category.name} (ID: ${masterTag.id})`)
    } else {
      // Create new master tag
      const { data, error: masterError } = await supabaseAdmin
        .from('tags')
        .insert({
          title: category.name,
          is_validated: true,
          is_mandatory_category: category.mandatory
        })
        .select('id')
        .single()

      if (masterError) {
        console.error(`Error creating master tag "${category.name}":`, masterError)
        continue
      }

      masterTag = data
      console.log(`  ✓ Created master tag: ${category.name} (ID: ${masterTag.id})`)
    }

    for (const tagTitle of category.tags) {
      // Check if sub-tag already exists
      if (!OVERRIDE && existingTagTitles.has(tagTitle)) {
        console.log(`    ↻ Sub-tag already exists: ${tagTitle}`)
        continue
      }

      const { data: subTag, error: subError } = await supabaseAdmin
        .from('tags')
        .insert({
          title: tagTitle,
          master_tag_id: masterTag.id,
          is_validated: true
        })
        .select('id')
        .single()

      if (subError) {
        console.error(`  ✗ Error creating sub-tag "${tagTitle}":`, subError)
        continue
      }

      console.log(`    ✓ Created sub-tag: ${tagTitle} (ID: ${subTag.id})`)
    }
  }

  console.log('\n🎉 Tag generation completed!')
}

generateTags().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})