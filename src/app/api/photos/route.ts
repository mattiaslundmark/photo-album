import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPhotosByAlbumId, userCanAccessAlbum } from '@/lib/data';

// GET /api/photos?albumId=xxx - Get photos for an album
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get('albumId');

    if (!albumId) {
      return NextResponse.json(
        { success: false, error: 'albumId parameter is required' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const canAccess = await userCanAccessAlbum(albumId, user?.id || null);

    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Album not found or access denied' },
        { status: 404 }
      );
    }

    const photos = await getPhotosByAlbumId(albumId);

    return NextResponse.json({
      success: true,
      data: { photos },
    });
  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
