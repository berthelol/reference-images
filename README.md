# Reference Images

A Next.js application for browsing and downloading reference images organized by tags.

## Features

- Browse reference images in a responsive grid layout
- Filter images by multiple tags
- Copy image URLs to clipboard
- Download images directly
- Open images in new tabs

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **API**: ORPC for type-safe API calls
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase project

### Environment Setup

1. Clone the repository
2. Copy `.env.local.example` to `.env.local`
3. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Database Setup

Run the following SQL commands in your Supabase SQL editor:

```sql
-- Create tables
CREATE TABLE public.reference_images (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tags (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.image_tags (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    image_id BIGINT NOT NULL REFERENCES public.reference_images(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(image_id, tag_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_tags ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Public read access" ON public.reference_images FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.image_tags FOR SELECT USING (true);

-- Add some sample data
INSERT INTO public.tags (title) VALUES 
('nature'), 
('architecture'), 
('portrait'), 
('landscape'), 
('abstract'),
('black-white'),
('color'),
('minimal');

-- Add sample images (replace with your actual image URLs)
INSERT INTO public.reference_images (url) VALUES 
('https://images.unsplash.com/photo-1506905925346-21bda4d32df4'),
('https://images.unsplash.com/photo-1518837695005-2083093ee35b'),
('https://images.unsplash.com/photo-1500648767791-00dcc994a43e');

-- Tag the images
INSERT INTO public.image_tags (image_id, tag_id) VALUES 
(1, 1), (1, 4), -- nature, landscape
(2, 2), (2, 7), -- architecture, color
(3, 3), (3, 7); -- portrait, color
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                 # Next.js app router
├── components/          # React components
│   ├── images/         # Image-related components
│   └── ui/             # Reusable UI components
├── providers/          # React context providers
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
    ├── orpc/           # ORPC configuration and routes
    ├── queries/        # TanStack Query configurations
    └── supabase/       # Supabase client configuration
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Adding More Images

To add more images, you can either:

1. Insert directly into the database using SQL
2. Build an admin interface (not included in this boilerplate)
3. Use Supabase's dashboard to add data manually

## Contributing

Feel free to submit issues and enhancement requests!