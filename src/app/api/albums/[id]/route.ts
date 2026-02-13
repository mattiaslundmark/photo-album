import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getAlbumById,
  updateAlbum,
  deleteAlbum,
  deletePhotosByAlbumId,
  userCanAccessAlbum,
} from '@/lib/data';
import { deletePhoto } from '@/lib/storage';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/albums/[id] - Get a single album
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();

    const canAccess = await userCanAccessAlbum(id, user?.id || null);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Album not found or access denied' },
        { status: 404 }
      );
    }

    const album = await getAlbumById(id);

    return NextResponse.json({
      success: true,
      data: { album },
    });
  } catch (error) {
    console.error('Get album error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/albums/[id] - Update an album (admin only)
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

    const album = await getAlbumById(id);
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    const updates = await request.json();
    const allowedFields = [
      'title',
      'description',
      'isPublic',
      'allowedUsers',
      'coverPhotoId',
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    const updatedAlbum = await updateAlbum(id, filteredUpdates);

    return NextResponse.json({
      success: true,
      data: { album: updatedAlbum },
    });
  } catch (error) {
    console.error('Update album error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/albums/[id] - Delete an album (admin only)
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

    const album = await getAlbumById(id);
    if (!album) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    // Delete all photos in the album from storage
    const photos = await deletePhotosByAlbumId(id);
    await Promise.all(
      photos.map((photo) => deletePhoto(photo.fullKey, photo.thumbnailKey))
    );

    // Delete the album
    await deleteAlbum(id);

    return NextResponse.json({
      success: true,
      data: { message: 'Album deleted successfully' },
    });
  } catch (error) {
    console.error('Delete album error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
