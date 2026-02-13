# API Reference

## Authentication

### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "string", "username": "string", "role": "admin|viewer" },
    "token": "string"
  }
}
```

### POST /api/auth/register
Register a new user. First user becomes admin. Subsequent registrations require admin auth.

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "role": "admin|viewer"
}
```

### POST /api/auth/logout
Log out the current user (clears cookie).

### GET /api/auth/verify
Check if current user is authenticated.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "string", "username": "string", "role": "admin|viewer" }
  }
}
```

## Albums

### GET /api/albums
List all albums the current user can access.

**Response:**
```json
{
  "success": true,
  "data": {
    "albums": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "slug": "string",
        "coverPhotoId": "string|null",
        "isPublic": true,
        "allowedUsers": ["userId"],
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    ]
  }
}
```

### POST /api/albums
Create a new album (admin only).

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "isPublic": true,
  "allowedUsers": []
}
```

### GET /api/albums/[id]
Get a single album by ID.

### PATCH /api/albums/[id]
Update an album (admin only).

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "isPublic": true,
  "allowedUsers": [],
  "coverPhotoId": "string|null"
}
```

### DELETE /api/albums/[id]
Delete an album and all its photos (admin only).

## Photos

### GET /api/photos?albumId=xxx
List all photos in an album.

**Response:**
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "string",
        "albumId": "string",
        "filename": "string",
        "originalFilename": "string",
        "mimeType": "image/jpeg",
        "size": 12345,
        "width": 1920,
        "height": 1080,
        "thumbnailKey": "string",
        "fullKey": "string",
        "caption": "string",
        "sortOrder": 0,
        "uploadedAt": "ISO date"
      }
    ]
  }
}
```

### GET /api/photos/[id]
Get a single photo with presigned URLs.

**Response includes:**
```json
{
  "photo": {
    "...photo fields",
    "thumbnailUrl": "presigned URL",
    "fullUrl": "presigned URL"
  }
}
```

### PATCH /api/photos/[id]
Update photo metadata (admin only).

**Request:**
```json
{
  "caption": "string",
  "sortOrder": 0
}
```

### DELETE /api/photos/[id]
Delete a photo (admin only).

## Upload

### POST /api/upload
Upload a photo to an album (admin only).

**Request:** `multipart/form-data`
- `file`: Image file (max 20MB)
- `albumId`: Album ID
- `caption`: Optional caption

**Response:**
```json
{
  "success": true,
  "data": {
    "photo": { "...photo object" }
  }
}
```

## Image Proxy

### GET /api/image/[...path]
Serve an image with authentication check. Path should match S3 key structure.

Example: `/api/image/photos/albumId/photoId.jpg`
