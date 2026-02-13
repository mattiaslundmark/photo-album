import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getPhotoById,
  getAlbumById,
  updatePhoto,
  deletePhotoData,
  userCanAccessAlbum,
} from '@/lib/data';
import { deletePhoto, getPresignedDownloadUrl } from '@/lib/storage';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/photos/[id] - Get a single photo with signed URLs
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    const user = await getCurrentUser();
    const canAccess = await userCanAccessAlbum(photo.albumId, user?.id || null);

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Photo not found or access denied' },
        { status: 404 }
      );
    }

    // Generate presigned URLs for the photo
    const [fullUrl, thumbnailUrl] = await Promise.all([
      getPresignedDownloadUrl(photo.fullKey),
      getPresignedDownloadUrl(photo.thumbnailKey),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        photo: {
          ...photo,
          fullUrl,
          thumbnailUrl,
        },
      },
    });
  } catch (error) {
    console.error('Get photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/photos/[id] - Update photo metadata (admin only)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const photo = await getPhotoById(id);
    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    const updates = await request.json();
    const allowedFields = ['caption', 'sortOrder'];

    const filteredUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    const updatedPhoto = await updatePhoto(id, filteredUpdates);

    return NextResponse.json({
      success: true,
      data: { photo: updatedPhoto },
    });
  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[id] - Delete a photo (admin only)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const photo = await getPhotoById(id);
    if (!photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Check if this photo is used as album cover
    const album = await getAlbumById(photo.albumId);
    if (album && album.coverPhotoId === id) {
      // Remove cover photo reference
      const { updateAlbum } = await import('@/lib/data');
      await updateAlbum(album.id, { coverPhotoId: null });
    }

    // Delete from storage
    await deletePhoto(photo.fullKey, photo.thumbnailKey);

    // Delete from data
    await deletePhotoData(id);

    return NextResponse.json({
      success: true,
      data: { message: 'Photo deleted successfully' },
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
