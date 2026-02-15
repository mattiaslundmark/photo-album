# Deployment Guide

## Prerequisites

1. **Scaleway Account** - Sign up at scaleway.com
2. **Scaleway CLI** - Install from https://www.scaleway.com/en/docs/developer-tools/scaleway-cli/
3. **Docker** - Installed locally for building images
4. **AWS CLI** - For backup/restore scripts (S3-compatible)

## Initial Setup

### 1. Create Scaleway Resources

1. **Create Object Storage Bucket**
   - Go to Scaleway Console > Object Storage
   - Create a new bucket (e.g., `photo-album`)
   - Note the bucket name and region

2. **Generate API Keys**
   - Go to Project > Credentials > API Keys
   - Create a new API key with Object Storage permissions
   - Save the Access Key and Secret Key

3. **Create Container Registry** (optional, deploy.sh creates it)
   - Go to Container Registry
   - Create a namespace (e.g., `photo-album`)

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

Required variables:
```
SCW_ACCESS_KEY=SCWXXXXXXXXXXXXXXXXX
SCW_SECRET_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SCW_BUCKET_NAME=photo-album
SCW_ENDPOINT=https://s3.fr-par.scw.cloud
SCW_REGION=fr-par
JWT_SECRET=your-very-long-random-secret-key
```

### 3. Configure Scaleway CLI

```bash
scw init
# Follow prompts to enter your credentials
```

## Deploy

### Build and Deploy

```bash
./deploy.sh
```

This script will:
1. Build the Docker image
2. Push to Scaleway Container Registry
3. Create/update the Serverless Container
4. Display the container URL

### Set Environment Variables

After deployment, set environment variables in Scaleway Console:

1. Go to Serverless > Containers > your-container
2. Click "Settings" > "Environment variables"
3. Add all variables from your `.env` file

### Custom Domain (Optional)

1. Go to Serverless > Containers > your-container
2. Click "Settings" > "Custom domains"
3. Add your domain and follow DNS instructions

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your Scaleway credentials
cp .env.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## Backup & Restore

### Create Backup

```bash
./backup.sh
```

Creates a compressed archive in `./backups/`

### Restore from Backup

```bash
./restore.sh ./backups/photo-album-backup-YYYYMMDD_HHMMSS.tar.gz
```

## CLI Batch Upload

Upload an entire folder of images using the command line script:

```bash
# Interactive mode - prompts for credentials and album selection
./upload-folder.sh /path/to/photos

# With environment variables
PHOTO_ALBUM_URL=https://photos.example.com \
PHOTO_ALBUM_USER=admin \
PHOTO_ALBUM_PASS=secret \
./upload-folder.sh /path/to/photos

# Specify album ID directly
./upload-folder.sh /path/to/photos album-uuid
```

**Requirements:** `curl` and `jq`

**Features:**
- Authenticates using the same JWT system as the web interface
- Lists existing albums or creates a new one (uses folder name as default title)
- Uploads all images (jpg, jpeg, png, gif, webp, heic, heif)
- Shows progress with success/failure for each file

## Costs

Estimated monthly costs with Scaleway:

| Resource | Cost |
|----------|------|
| Serverless Container (idle) | €0 |
| Serverless Container (active) | ~€0.10-0.50 |
| Object Storage (10GB) | ~€0.22 |
| **Total** | **~€0-2/month** |

## Troubleshooting

### Container won't start
- Check environment variables are set
- View logs in Scaleway Console

### Images not loading
- Verify bucket permissions
- Check SCW_ENDPOINT matches your region
- Ensure presigned URLs are being generated

### Auth issues
- Verify JWT_SECRET is consistent across deployments
- Check cookie settings for your domain
