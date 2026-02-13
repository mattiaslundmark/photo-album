# Claude Code Context

This is a photo album web application built with Next.js, designed to be deployed on Scaleway Serverless Containers.

## Quick Reference

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: Scaleway Object Storage (S3-compatible)
- **Auth**: JWT with bcrypt

## Key Files

- `src/lib/storage.ts` - S3 operations
- `src/lib/data.ts` - JSON data CRUD
- `src/lib/auth.ts` - Authentication
- `src/app/api/` - API routes
- `Dockerfile.scaleway` - Docker build
- `deploy.sh` - Deployment script
- `upload-folder.sh` - Batch upload images from a folder

## Common Tasks

### Run locally
```bash
npm run dev
```

### Deploy
```bash
./deploy.sh
```

### Backup data
```bash
./backup.sh
```

### Upload folder of images
```bash
# Interactive mode (prompts for credentials and album)
./upload-folder.sh /path/to/photos

# With environment variables and album ID
PHOTO_ALBUM_URL=https://photos.example.com \
PHOTO_ALBUM_USER=admin \
PHOTO_ALBUM_PASS=secret \
./upload-folder.sh /path/to/photos album-uuid
```

## Architecture Notes

- No database - all data stored as JSON files in S3
- First user to register becomes admin
- Photos are processed server-side (resize + thumbnails)
- Images served via presigned URLs or API proxy
- Batch uploads supported via CLI script using the same REST API and JWT auth as the web interface

## Environment Variables

See `.env.example` for required configuration.
