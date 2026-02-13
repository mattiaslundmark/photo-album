'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Image from 'next/image';

interface Album {
  id: string;
  title: string;
  description: string;
  slug: string;
  isPublic: boolean;
  coverPhotoId: string | null;
}

interface Photo {
  id: string;
  albumId: string;
  caption: string;
  thumbnailUrl?: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [newAlbumPublic, setNewAlbumPublic] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAlbums();
    }
  }, [user]);

  const fetchAlbums = async () => {
    try {
      const res = await fetch('/api/albums');
      const data = await res.json();
      if (data.success) {
        setAlbums(data.data.albums);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (albumId: string) => {
    try {
      const res = await fetch(`/api/photos?albumId=${albumId}`);
      const data = await res.json();
      if (data.success) {
        // Get thumbnail URLs for each photo
        const photosWithUrls = await Promise.all(
          data.data.photos.map(async (photo: Photo) => {
            const photoRes = await fetch(`/api/photos/${photo.id}`);
            const photoData = await photoRes.json();
            return {
              ...photo,
              thumbnailUrl: photoData.data?.photo?.thumbnailUrl,
            };
          })
        );
        setPhotos(photosWithUrls);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    }
  };

  const handleSelectAlbum = (album: Album) => {
    setSelectedAlbum(album);
    fetchPhotos(album.id);
  };

  const handleCreateAlbum = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAlbumTitle,
          description: newAlbumDescription,
          isPublic: newAlbumPublic,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlbums([...albums, data.data.album]);
        setNewAlbumTitle('');
        setNewAlbumDescription('');
        setNewAlbumPublic(true);
        setShowNewAlbum(false);
      }
    } catch (error) {
      console.error('Failed to create album:', error);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album and all its photos?')) {
      return;
    }
    try {
      const res = await fetch(`/api/albums/${albumId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAlbums(albums.filter((a) => a.id !== albumId));
        if (selectedAlbum?.id === albumId) {
          setSelectedAlbum(null);
          setPhotos([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete album:', error);
    }
  };

  const handleUpload = async (files: FileList) => {
    if (!selectedAlbum) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('albumId', selectedAlbum.id);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          // Refresh photos
          fetchPhotos(selectedAlbum.id);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPhotos(photos.filter((p) => p.id !== photoId));
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-700 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Albums List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Albums</h2>
              <button
                onClick={() => setShowNewAlbum(!showNewAlbum)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showNewAlbum ? 'Cancel' : '+ New'}
              </button>
            </div>

            {showNewAlbum && (
              <form onSubmit={handleCreateAlbum} className="mb-4 p-4 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="Album title"
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm bg-white text-gray-900"
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm bg-white text-gray-900"
                  rows={2}
                />
                <label className="flex items-center mb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newAlbumPublic}
                    onChange={(e) => setNewAlbumPublic(e.target.checked)}
                    className="mr-2"
                  />
                  Public album
                </label>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Create Album
                </button>
              </form>
            )}

            <ul className="space-y-2">
              {albums.map((album) => (
                <li
                  key={album.id}
                  className={`flex items-center justify-between p-3 rounded cursor-pointer ${
                    selectedAlbum?.id === album.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectAlbum(album)}
                >
                  <div>
                    <p className="font-medium">{album.title}</p>
                    <p className="text-xs text-gray-500">
                      {album.isPublic ? 'Public' : 'Private'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAlbum(album.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Album Photos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {selectedAlbum ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{selectedAlbum.title}</h2>
                  <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    {uploading ? 'Uploading...' : 'Upload Photos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && handleUpload(e.target.files)}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>

                {photos.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No photos yet. Upload some!
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group aspect-square">
                        {photo.thumbnailUrl ? (
                          <Image
                            src={photo.thumbnailUrl}
                            alt={photo.caption || 'Photo'}
                            fill
                            className="object-cover rounded"
                            sizes="(max-width: 640px) 33vw, 20vw"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-200 rounded" />
                        )}
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Select an album to manage its photos
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
