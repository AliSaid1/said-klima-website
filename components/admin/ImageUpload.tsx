'use client';

/**
 * Client component module for admin image upload and media-library selection.
 * It manages artikel (product) image attachments, upload progress, alt text,
 * media search, and selection limits for editable admin forms.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, GripVertical, Loader2, ImageIcon, Search } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface UploadedImage {
  /** Existing artikel_bilder row id when editing a saved image relation. */
  id?: string;
  /** Media-file id stored in the backend dateien/media table. */
  datei_id?: string;
  /** Public image URL used for preview rendering. */
  url: string;
  /** Optional alternative text saved with the product image relation. */
  alt_text?: string;
  /** Zero-based display order, with 0 treated as the Hauptbild (main image). */
  anzeige_reihenfolge: number;
}

interface MediaFile {
  /** Unique media-file id returned by the media API. */
  id: string;
  /** Public URL for previewing or selecting the stored file. */
  url: string;
  /** Storage path used for media-library search and display. */
  speicherpfad: string;
  /** MIME type recorded for the uploaded file. */
  mime_type: string;
  /** File size in bytes. */
  groesse_bytes: number;
  /** Creation timestamp from the media backend. */
  erstellt_am: string;
}

interface ImageUploadProps {
  /** Current list of selected/uploaded images controlled by the parent form. */
  images: UploadedImage[];
  /** Emits the complete updated image list after upload, removal, alt text edit, or library selection. */
  onChange: (images: UploadedImage[]) => void;
  /** Storage bucket passed to the upload API; defaults to product-images. */
  bucket?: string;
  /** Maximum number of images accepted by upload and media-library selection. */
  maxFiles?: number;
}

/**
 * Renders a controlled admin image manager as a client component.
 *
 * Supports drag-and-drop uploads to `/api/upload`, preview cards with editable
 * alt text, duplicate-safe selection from `/api/media`, search within the
 * Medienbibliothek (media library), and max-file enforcement.
 *
 * @param props - Component props.
 * @param props.images - Selected artikel (product) image relations.
 * @param props.onChange - Callback receiving the next complete image list.
 * @param props.bucket - Upload bucket name used by the API.
 * @param props.maxFiles - Maximum selectable image count.
 */
export default function ImageUpload({ images, onChange, bucket = 'product-images', maxFiles = 10 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();

        if (res.ok && json.data) {
          newImages.push({
            datei_id: json.data.id,
            url: json.data.url,
            alt_text: '',
            anzeige_reihenfolge: images.length + newImages.length,
          });
          toast.success(`${file.name} hochgeladen`);
        } else {
          toast.error(`${file.name}: ${json.error || 'Fehler'}`);
        }
      } catch {
        toast.error(`${file.name}: Upload fehlgeschlagen`);
      }
    }

    onChange([...images, ...newImages]);
    setUploading(false);
  }, [images, onChange, bucket]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif'] },
    maxFiles: maxFiles - images.length,
    disabled: uploading || images.length >= maxFiles,
  });

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index).map((img, i) => ({
      ...img,
      anzeige_reihenfolge: i,
    }));
    onChange(updated);
  };

  const updateAltText = (index: number, alt_text: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index], alt_text };
    onChange(updated);
  };

  // ── Media Library ──
  const openLibrary = async () => {
    setShowLibrary(true);
    setMediaLoading(true);
    try {
      const res = await fetch('/api/media');
      const json = await res.json();
      setMediaFiles(json.data || []);
    } catch {
      toast.error('Medienbibliothek konnte nicht geladen werden');
    }
    setMediaLoading(false);
  };

  const selectFromLibrary = (file: MediaFile) => {
    // Check if already added
    if (images.some((img) => img.datei_id === file.id)) {
      toast.info('Bild ist bereits hinzugefügt');
      return;
    }
    if (images.length >= maxFiles) {
      toast.error(`Maximal ${maxFiles} Bilder erlaubt`);
      return;
    }

    onChange([
      ...images,
      {
        datei_id: file.id,
        url: file.url,
        alt_text: '',
        anzeige_reihenfolge: images.length,
      },
    ]);
    toast.success('Bild hinzugefügt');
  };

  const filteredMedia = mediaSearch
    ? mediaFiles.filter((f) => f.speicherpfad.toLowerCase().includes(mediaSearch.toLowerCase()))
    : mediaFiles;

  // Already-used datei_ids
  const usedIds = new Set(images.map((img) => img.datei_id).filter(Boolean));

  return (
    <div className="space-y-4">
      {/* Existing Images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="relative h-32">
                <Image
                  src={img.url}
                  alt={img.alt_text || ''}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-5 h-5 text-white" />
                </div>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Hauptbild
                  </span>
                )}
              </div>
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Alt-Text"
                  value={img.alt_text || ''}
                  onChange={(e) => updateAltText(index, e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {images.length < maxFiles && (
        <div className="flex gap-3">
          {/* Upload Dropzone */}
          <div
            {...getRootProps()}
            className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-600">Wird hochgeladen...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-7 h-7 text-slate-400" />
                <p className="text-sm text-slate-600 font-medium">
                  {isDragActive ? 'Hier ablegen' : 'Neues Bild hochladen'}
                </p>
                <p className="text-xs text-slate-400">JPEG, PNG, WebP · max. 10 MB</p>
              </div>
            )}
          </div>

          {/* Media Library Button */}
          <button
            type="button"
            onClick={openLibrary}
            className="flex flex-col items-center justify-center gap-1.5 px-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer min-w-[140px]"
          >
            <ImageIcon className="w-7 h-7 text-purple-500" />
            <p className="text-sm text-slate-600 font-medium">Bibliothek</p>
            <p className="text-xs text-slate-400">Vorhandene Bilder</p>
          </button>
        </div>
      )}

      {/* ── Media Library Modal ── */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowLibrary(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="font-outfit font-bold text-slate-900 text-lg">Medienbibliothek</h3>
                <p className="text-sm text-slate-500 mt-0.5">{mediaFiles.length} Dateien gespeichert</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-48"
                  />
                </div>
                <button onClick={() => setShowLibrary(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {mediaLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-16">
                  <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">{mediaSearch ? 'Keine Treffer' : 'Noch keine Bilder hochgeladen'}</p>
                  <p className="text-slate-400 text-sm mt-1">Laden Sie zuerst Bilder über den Upload-Bereich hoch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredMedia.map((file) => {
                    const isUsed = usedIds.has(file.id);
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => selectFromLibrary(file)}
                        disabled={isUsed}
                        className={`relative group rounded-xl overflow-hidden border-2 transition-all text-left ${
                          isUsed
                            ? 'border-green-400 opacity-60 cursor-not-allowed'
                            : 'border-transparent hover:border-blue-500 hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <div className="relative aspect-square bg-slate-100">
                          <Image
                            src={file.url}
                            alt={file.speicherpfad}
                            fill
                            className="object-cover"
                            sizes="150px"
                            referrerPolicy="no-referrer"
                          />
                          {isUsed && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Ausgewählt</span>
                            </div>
                          )}
                          {!isUsed && (
                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                Auswählen
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="text-[10px] text-slate-400 truncate">{file.speicherpfad}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLibrary(false)}
                className="px-5 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
