import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/auth';
import {
  getAlbumsForUser,
  createAlbum,
  getAlbumBySlug,
} from '@/lib/data';
import type { Album } from '@/lib/types';

// GET /api/albums - List albums (filtered by user access)
export async function GET() {
  try {
    const user = await getCurrentUser();
    const albums = await getAlbumsForUser(user?.id || null);

    return NextResponse.json({
      success: true,
      data: { albums },
    });
  } catch (error) {
    console.error('Get albums error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/albums - Create a new album (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description = '', isPublic = false, allowedUsers = [] } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug exists, append number if needed
    let slug = baseSlug;
    let counter = 1;
    while (await getAlbumBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const album: Album = {
      id: uuidv4(),
      title,
      description,
      slug,
      coverPhotoId: null,
      isPublic,
      allowedUsers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createAlbum(album);

    return NextResponse.json({
      success: true,
      data: { album },
    });
  } catch (error) {
    console.error('Create album error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
