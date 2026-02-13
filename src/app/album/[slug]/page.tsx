import { notFound } from 'next/navigation';
import PhotoGrid from '@/components/PhotoGrid';
import { getAlbumBySlug, getPhotosByAlbumId, userCanAccessAlbum } from '@/lib/data';
import { getCurrentUser } from '@/lib/auth';
import { getPresignedDownloadUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AlbumPage({ params }: PageProps) {
  const { slug } = await params;
  const album = await getAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  const user = await getCurrentUser();
  const canAccess = await userCanAccessAlbum(album.id, user?.id || null);

  if (!canAccess) {
    notFound();
  }

  const photosData = await getPhotosByAlbumId(album.id);

  // Get signed URLs for all photos
  const photos = await Promise.all(
    photosData.map(async (photo) => {
      const [thumbnailUrl, fullUrl] = await Promise.all([
        getPresignedDownloadUrl(photo.thumbnailKey),
        getPresignedDownloadUrl(photo.fullKey),
      ]);
      return {
        id: photo.id,
        caption: photo.caption,
        width: photo.width,
        height: photo.height,
        thumbnailUrl,
        fullUrl,
      };
    })
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-700">{album.title}</h1>
        {album.description && (
          <p className="mt-2 text-gray-600">{album.description}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No photos in this album yet.</p>
        </div>
      ) : (
        <PhotoGrid photos={photos} />
      )}
    </div>
  );
}
