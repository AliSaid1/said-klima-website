'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, GripVertical, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface UploadedImage {
  id?: string;
  datei_id?: string;
  url: string;
  alt_text?: string;
  anzeige_reihenfolge: number;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  bucket?: string;
  maxFiles?: number;
}

export default function ImageUpload({ images, onChange, bucket = 'product-images', maxFiles = 10 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

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
        }
      } catch {
        // Failed upload — skip
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

      {/* Dropzone */}
      {images.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-600 bg-blue-50'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-600">Wird hochgeladen...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-600">
                {isDragActive ? 'Dateien hier ablegen' : 'Bilder hierher ziehen oder klicken'}
              </p>
              <p className="text-xs text-slate-400">
                JPEG, PNG, WebP, AVIF · max. 10 MB · {maxFiles - images.length} verbleibend
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

