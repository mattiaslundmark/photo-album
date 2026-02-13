import AlbumCard from '@/components/AlbumCard';
import { getAlbumsForUser, getPhotosByAlbumId } from '@/lib/data';
import { getCurrentUser } from '@/lib/auth';
import { getPresignedDownloadUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  const albums = await getAlbumsForUser(user?.id || null);

  // Get newest photo as cover for each album
  const albumsWithCovers = await Promise.all(
    albums.map(async (album) => {
      const photos = await getPhotosByAlbumId(album.id);
      const photoCount = photos.length;

      // Get the newest photo (by uploadedAt)
      const newestPhoto = photos.length > 0
        ? photos.reduce((newest, photo) =>
            new Date(photo.uploadedAt) > new Date(newest.uploadedAt) ? photo : newest
          )
        : null;

      let coverUrl: string | undefined;
      if (newestPhoto) {
        coverUrl = await getPresignedDownloadUrl(newestPhoto.thumbnailKey);
      }

      return { album, coverUrl, photoCount };
    })
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {albumsWithCovers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No albums available yet.</p>
          {user?.role === 'admin' && (
            <p className="mt-2 text-sm text-gray-400">
              <a href="/admin" className="text-blue-600 hover:underline">
                Create your first album
              </a>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albumsWithCovers.map(({ album, coverUrl, photoCount }) => (
            <AlbumCard
              key={album.id}
              album={album}
              coverUrl={coverUrl}
              photoCount={photoCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
