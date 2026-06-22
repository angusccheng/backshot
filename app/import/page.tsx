'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/flow-hover-button';
import { BackButton } from '@/components/BackButton';

interface ImportPhoto {
  id: string;
  base64: string;
  preview: string;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

export default function ImportPage() {
  const [photos, setPhotos] = useState<ImportPhoto[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const newPhotos: ImportPhoto[] = await Promise.all(
      imageFiles.map(async (file) => ({
        id: crypto.randomUUID(),
        base64: await fileToBase64(file),
        preview: URL.createObjectURL(file),
        name: file.name,
        status: 'pending' as const,
      }))
    );
    setPhotos(prev => [...prev, ...newPhotos]);
    setDone(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const removePhoto = (id: string) => setPhotos(prev => prev.filter(p => p.id !== id));

  const handleImport = async () => {
    const pending = photos.filter(p => p.status === 'pending');
    if (!pending.length) return;
    setImporting(true);

    for (let i = 0; i < pending.length; i += 3) {
      const batch = pending.slice(i, i + 3);
      setPhotos(prev => prev.map(p => batch.find(b => b.id === p.id) ? { ...p, status: 'uploading' } : p));
      try {
        const res = await fetch('/api/analyze-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: batch.map(p => ({ base64: p.base64, photoId: p.id })) }),
        });
        if (!res.ok) throw new Error('Upload failed');
        setPhotos(prev => prev.map(p => batch.find(b => b.id === p.id) ? { ...p, status: 'done' } : p));
      } catch {
        setPhotos(prev => prev.map(p => batch.find(b => b.id === p.id) ? { ...p, status: 'error' } : p));
      }
    }

    setImporting(false);
    setDone(true);
  };

  const pendingCount = photos.filter(p => p.status === 'pending').length;
  const doneCount = photos.filter(p => p.status === 'done').length;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="glass fixed top-0 left-0 right-0 z-20 px-8 h-14 flex items-center justify-center relative" style={{ borderBottom: '1px solid var(--border)' }}>
        <BackButton />
        <span className="font-display font-semibold text-sm" style={{ color: 'var(--fg)' }}>Import Photos</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-8 pb-16">
        <p className="text-base mb-8" style={{ color: 'var(--fg-secondary)' }}>
          Add photos to your library so the AI has a richer pool to draw from when you write.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-3xl px-8 py-14 text-center cursor-pointer transition-all mb-8"
          style={{ border: '1.5px dashed var(--fg-tertiary)', background: 'var(--bg-alt)' }}
        >
          <p className="font-display text-lg mb-1" style={{ color: 'var(--fg)', letterSpacing: '-0.01em' }}>
            Drop photos here
          </p>
          <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
            or <span className="underline cursor-pointer">click to browse</span> — JPG, PNG, WEBP
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
          />
        </div>

        {photos.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-8">
              {photos.map(photo => (
                <div key={photo.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.preview}
                    alt={photo.name}
                    className="w-full aspect-square object-cover rounded-2xl"
                    style={{
                      opacity: photo.status === 'uploading' ? 0.5 : 1,
                      outline: photo.status === 'done' ? '2px solid #34C759' : photo.status === 'error' ? '2px solid #FF3B30' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                  {photo.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {photo.status === 'done' && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#34C759' }}>✓</div>
                  )}
                  {photo.status === 'error' && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#FF3B30' }}>!</div>
                  )}
                  {!importing && photo.status === 'pending' && (
                    <button
                      onClick={e => { e.stopPropagation(); removePhoto(photo.id); }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--fg)' }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>

            {done ? (
              <div className="text-center space-y-6">
                <p className="font-display text-2xl font-light" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>
                  {doneCount} photo{doneCount !== 1 ? 's' : ''} added.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setPhotos([]); setDone(false); }}
                    className="py-2.5 px-6 rounded-full text-sm font-display font-medium transition-opacity hover:opacity-70"
                    style={{ border: '1px solid var(--border)', color: 'var(--fg-secondary)' }}
                  >
                    Import more
                  </button>
                  <Link href="/write" className="inline-flex items-center justify-center rounded-lg px-6 py-2.5 font-display font-medium text-sm bg-[var(--fg)] text-[var(--bg)] transition-colors">
                    Write an entry →
                  </Link>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleImport}
                disabled={importing || pendingCount === 0}
                className="w-full py-4 text-base rounded-lg"
              >
                {importing
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Analyzing {pendingCount} photo{pendingCount !== 1 ? 's' : ''}...
                    </span>
                  : `Add ${pendingCount} photo${pendingCount !== 1 ? 's' : ''} to library`
                }
              </Button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
