import { config } from 'dotenv'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'

config()

interface TagCategory {
  name: string
  tags: string[]
}

async function generateTags() {

  const tagsJsonPath = join(__dirname, 'tags.json')
  const tagsData: TagCategory[] = JSON.parse(readFileSync(tagsJsonPath, 'utf-8'))

  console.log('Starting tag generation...')

  for (const category of tagsData) {
    console.log(`\nProcessing category: ${category.name}`)

    const { data: masterTag, error: masterError } = await supabaseAdmin
      .from('tags')
      .insert({
        title: category.name
      })
      .select('id')
      .single()

    if (masterError) {
      console.error(`Error creating master tag "${category.name}":`, masterError)
      continue
    }

    console.log(`   Created master tag: ${category.name} (ID: ${masterTag.id})`)

    for (const tagTitle of category.tags) {
      const { data: subTag, error: subError } = await supabaseAdmin
        .from('tags')
        .insert({
          title: tagTitle,
          master_tag_id: masterTag.id
        })
        .select('id')
        .single()

      if (subError) {
        console.error(`   Error creating sub-tag "${tagTitle}":`, subError)
        continue
      }

      console.log(`     Created sub-tag: ${tagTitle} (ID: ${subTag.id})`)
    }
  }

  console.log('\n Tag generation completed!')
}

generateTags().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})