import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPhotoById, userCanAccessAlbum } from '@/lib/data';
import { getObject } from '@/lib/storage';

type RouteContext = { params: Promise<{ path: string[] }> };

// GET /api/image/[...path] - Serve an image file with auth check
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { path } = await context.params;
    const key = path.join('/');

    // Extract photo ID from the path (format: photos|thumbnails/albumId/photoId.ext)
    const parts = key.split('/');
    if (parts.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Invalid image path' },
        { status: 400 }
      );
    }

    const photoFilename = parts[parts.length - 1];
    const photoId = photoFilename.split('.')[0];

    // Get photo to check album access
    const photo = await getPhotoById(photoId);
    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check user access to album
    const user = await getCurrentUser();
    const canAccess = await userCanAccessAlbum(photo.albumId, user?.id || null);

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch the image from storage
    const imageBuffer = await getObject(key);

    if (!imageBuffer) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': photo.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image serve error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
