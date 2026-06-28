import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Loader2, X, ChevronLeft, ChevronRight, ArrowLeft, Folder } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './pages.css';

export const Gallery = () => {
  const { currentUser, globalConfig } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    // Function to fetch photos using standard fetch
    const fetchPhotos = async () => {
      try {
        let accessToken = import.meta.env.VITE_FB_ACCESS_TOKEN;
        let pageId = globalConfig?.facebookPageId || '1206764219182291'; // Fallback page ID

        // If user belongs to a specific chapter, try to override with chapter-specific DB settings
        if (currentUser?.chapterId) {
          const chapterRes = await api.getChapterData(currentUser.chapterId);
          if (chapterRes.success && chapterRes.data) {
            if (chapterRes.data.fbAccessToken) accessToken = chapterRes.data.fbAccessToken;
            if (chapterRes.data.fbPageId) pageId = chapterRes.data.fbPageId;
          }
        }
        
        if (!accessToken || !pageId) {
          setError('Facebook Gallery is not configured. Please add VITE_FB_ACCESS_TOKEN to .env or configure it in the Admin Dashboard.');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/albums?fields=name,photos{images,name,created_time}&access_token=${accessToken}`
        );
        const data = await response.json();

        if (response.ok && data && !data.error) {
          const parsedAlbums = [];
          
          if (data.data) {
            data.data.forEach(albumData => {
              if (albumData.photos && albumData.photos.data && albumData.photos.data.length > 0) {
                
                // Map photos for this album
                const photos = albumData.photos.data.map(item => ({
                  id: item.id,
                  src: item.images && item.images.length > 0 ? item.images[0].source : '',
                  caption: item.name || '',
                  date: new Date(item.created_time).toLocaleDateString()
                })).filter(img => img.src);
                
                photos.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                if (photos.length > 0) {
                  parsedAlbums.push({
                    id: albumData.id,
                    name: albumData.name || 'Untitled Album',
                    coverSrc: photos[0].src,
                    photoCount: photos.length,
                    photos: photos
                  });
                }
              }
            });
          }
          
          setAlbums(parsedAlbums);
          setLoading(false);
        } else {
          console.error('Error fetching Facebook photos:', data.error);
          setError(data.error?.message || 'Failed to load photos from Facebook.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Network error fetching photos:', err);
        setError('Network error. Failed to load photos.');
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  // Get currently active images list (either from selected album or empty)
  const activeImages = selectedAlbum ? selectedAlbum.photos : [];

  // Keyboard navigation for Carousel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : activeImages.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev < activeImages.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, activeImages.length]);

  const handlePrevious = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : activeImages.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev < activeImages.length - 1 ? prev + 1 : 0));
  };

  const selectedImage = selectedIndex !== null ? activeImages[selectedIndex] : null;

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header" style={{ marginBottom: selectedAlbum ? '16px' : '24px' }}>
        <div className="page-title">
          <h1>Photo Gallery</h1>
          <p className="page-subtitle">Memories and highlights from our club activities</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          <span className="ml-2 text-gray-600">Loading photos...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-center">
          {error}
        </div>
      ) : !selectedAlbum ? (
        /* ALBUMS GRID VIEW */
        <div className="gallery-grid">
          {albums.map((album) => (
            <div 
              key={album.id} 
              className="gallery-item cursor-pointer"
              onClick={() => setSelectedAlbum(album)}
            >
              <img src={album.coverSrc} alt={album.name} className="gallery-image" loading="lazy" />
              <div className="gallery-caption" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>{album.name}</span>
                <span style={{ fontSize: '12px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Folder size={12} />
                  {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* PHOTOS GRID VIEW (Inside an Album) */
        <div className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', backgroundColor: 'var(--bg-secondary)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedAlbum(null)}
                style={{ padding: '8px', borderRadius: '50%' }}
                aria-label="Back to Albums"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--rotary-blue-dark)' }}>{selectedAlbum.name}</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedAlbum.photoCount} photos</span>
              </div>
            </div>
          </div>
          
          <div className="gallery-grid">
            {activeImages.map((img, index) => (
              <div 
                key={img.id} 
                className="gallery-item cursor-pointer"
                onClick={() => setSelectedIndex(index)}
              >
                <img src={img.src} alt={img.caption || 'Gallery Image'} className="gallery-image" loading="lazy" />
                {img.caption && (
                  <div className="gallery-caption">
                    {img.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Carousel Modal */}
      {selectedImage && createPortal(
        <div 
          onClick={() => setSelectedIndex(null)}
          style={{ 
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1000, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px 0',
            backgroundColor: 'rgba(0,0,0,0.95)',
            backdropFilter: 'blur(8px)'
          }}
        >
          {/* Inject style to hide scrollbar on thumbnails */}
          <style>{`
            .thumbnails-container::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {/* Main Image Area */}
          <div 
            className="animate-fade-in"
            style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              width: '100%',
              maxWidth: '100%',
              minHeight: 0,
              padding: '0 20px'
            }}
            onClick={e => e.stopPropagation()} 
          >
            {/* The actual image container */}
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedIndex(null)}
                aria-label="Close preview"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '50%',
                  padding: '8px',
                  cursor: 'pointer',
                  zIndex: 20,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <X size={26} />
              </button>

              {/* Previous Button */}
              {activeImages.length > 1 && (
                <button 
                  onClick={handlePrevious}
                  aria-label="Previous image"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '16px',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '50%',
                    padding: '12px',
                    cursor: 'pointer',
                    zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <ChevronLeft size={32} />
                </button>
              )}

              {/* Next Button */}
              {activeImages.length > 1 && (
                <button 
                  onClick={handleNext}
                  aria-label="Next image"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '16px',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '50%',
                    padding: '12px',
                    cursor: 'pointer',
                    zIndex: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <ChevronRight size={32} />
                </button>
              )}
              
              <img 
                src={selectedImage.src} 
                alt={selectedImage.caption || 'Preview Image'} 
                style={{ 
                  maxHeight: 'calc(100vh - 150px)', // Leave room for thumbnails
                  width: 'auto', 
                  maxWidth: '100%', 
                  objectFit: 'contain', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
                  backgroundColor: '#0a0a0a'
                }}
              />
              
              {selectedImage.caption && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                    padding: '30px 24px 20px',
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}
                >
                  <p style={{ color: 'white', fontSize: '18px', fontWeight: '500', textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.5)', margin: 0 }}>
                    {selectedImage.caption}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails Area */}
          <div 
            className="thumbnails-container animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{ 
              height: '90px', 
              width: '100%',
              maxWidth: '1200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              overflowX: 'auto',
              padding: '0 20px',
              marginTop: '16px',
              flexShrink: 0,
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none' // IE/Edge
            }}
          >
            {activeImages.map((img, idx) => (
              <img 
                key={img.id}
                src={img.src} 
                onClick={() => setSelectedIndex(idx)}
                alt={`Thumbnail ${idx + 1}`} 
                style={{ 
                  width: '74px', 
                  height: '74px', 
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: selectedIndex === idx ? '3px solid white' : '2px solid transparent',
                  opacity: selectedIndex === idx ? 1 : 0.35,
                  transform: selectedIndex === idx ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: selectedIndex === idx ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                }}
                onMouseEnter={(e) => { if (selectedIndex !== idx) e.target.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { if (selectedIndex !== idx) e.target.style.opacity = '0.35'; }}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
