import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/auth';
import { getAlbumById, createPhoto, getPhotosByAlbumId } from '@/lib/data';
import { uploadPhoto, uploadThumbnail } from '@/lib/storage';
import { processImage, isValidImage } from '@/lib/images';
import type { Photo } from '@/lib/types';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// POST /api/upload - Upload a photo to an album
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const albumId = formData.get('albumId') as string | null;
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!albumId) {
      return NextResponse.json(
        { success: false, error: 'albumId is required' },
        { status: 400 }
      );
    }

    // Check album exists
    const album = await getAlbumById(albumId);
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 20MB limit' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate image
    if (!(await isValidImage(buffer))) {
      return NextResponse.json(
        { success: false, error: 'Invalid image file' },
        { status: 400 }
      );
    }

    // Process image (resize and create thumbnail)
    const processed = await processImage(buffer);

    // Generate unique filename
    const photoId = uuidv4();
    const extension = 'jpg'; // We always convert to JPEG
    const filename = `${photoId}.${extension}`;

    // Upload to storage
    const [fullKey, thumbnailKey] = await Promise.all([
      uploadPhoto(albumId, filename, processed.full, 'image/jpeg'),
      uploadThumbnail(albumId, filename, processed.thumbnail, 'image/jpeg'),
    ]);

    // Get current max sort order for the album
    const existingPhotos = await getPhotosByAlbumId(albumId);
    const maxSortOrder = existingPhotos.reduce(
      (max, p) => Math.max(max, p.sortOrder),
      -1
    );

    // Create photo record
    const photo: Photo = {
      id: photoId,
      albumId,
      filename,
      originalFilename: file.name,
      mimeType: 'image/jpeg',
      size: processed.full.length,
      width: processed.width,
      height: processed.height,
      thumbnailKey,
      fullKey,
      caption,
      sortOrder: maxSortOrder + 1,
      uploadedAt: new Date().toISOString(),
    };

    await createPhoto(photo);

    // If this is the first photo and album has no cover, set it as cover
    if (!album.coverPhotoId) {
      const { updateAlbum } = await import('@/lib/data');
      await updateAlbum(albumId, { coverPhotoId: photoId });
    }

    return NextResponse.json({
      success: true,
      data: { photo },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
