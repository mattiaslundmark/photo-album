# Photo Album Project

A personal photo album website with public and private galleries, built with Next.js and deployed on Scaleway Serverless Containers.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Storage**: Scaleway Object Storage (S3-compatible)
- **Data**: Flat JSON files stored in S3 (no database)
- **Auth**: JWT tokens with bcrypt password hashing
- **Images**: Sharp for processing and thumbnails
- **Deployment**: Scaleway Serverless Containers

## Project Structure

```
photo-album/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── albums/         # Album CRUD
│   │   │   ├── photos/         # Photo CRUD
│   │   │   ├── upload/         # Photo upload
│   │   │   └── image/          # Image serving proxy
│   │   ├── album/[slug]/       # Album view page
│   │   ├── admin/              # Admin dashboard
│   │   ├── login/              # Login page
│   │   └── setup/              # Initial setup page
│   ├── components/             # React components
│   └── lib/                    # Core libraries
│       ├── auth.ts             # JWT authentication
│       ├── data.ts             # JSON data management
│       ├── images.ts           # Image processing
│       ├── storage.ts          # S3 operations
│       └── types.ts            # TypeScript types
├── .claude/                    # Claude Code context
├── Dockerfile.scaleway         # Docker configuration
├── deploy.sh                   # Deployment script
├── backup.sh                   # Backup script
└── restore.sh                  # Restore script
```

## Key Features

- **Public Albums**: Portfolio/showcase galleries visible to everyone
- **Private Albums**: Family photos requiring authentication
- **Admin Dashboard**: Upload photos, manage albums, configure visibility
- **Image Processing**: Automatic thumbnail generation, resize large images
- **Responsive Design**: Mobile-friendly gallery with lightbox viewer

## Data Model

All data is stored as JSON files in S3:

- `data/albums.json` - Album metadata
- `data/photos.json` - Photo metadata
- `data/users.json` - User credentials (hashed passwords)
- `photos/{albumId}/{photoId}.jpg` - Full-size photos
- `thumbnails/{albumId}/{photoId}.jpg` - Thumbnails (400x400)

## Authentication Flow

1. First user to register becomes admin (via `/setup`)
2. Admins can create additional users via API
3. JWT tokens stored in HTTP-only cookies
4. 7-day token expiration

## Deployment

See `deploy.sh` for Scaleway deployment. Required environment variables:

- `SCW_ACCESS_KEY` - Scaleway API access key
- `SCW_SECRET_KEY` - Scaleway API secret key
- `SCW_BUCKET_NAME` - S3 bucket name
- `SCW_ENDPOINT` - S3 endpoint URL
- `SCW_REGION` - Scaleway region
- `JWT_SECRET` - Secret for signing JWT tokens
