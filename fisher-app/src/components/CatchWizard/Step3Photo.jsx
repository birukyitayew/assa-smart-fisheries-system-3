import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X, CheckCircle2 } from 'lucide-react';
import api from '@/services/api';

/**
 * Step3Photo — real file upload with progress indicator.
 * Calls POST /api/catches/upload and stores returned URL in `photos`.
 *
 * Props:
 *   photos      {string[]}  — array of uploaded photo URLs
 *   onAddPhoto  {fn}        — called with (url) to append a photo
 *   onRemove    {fn}        — called with (index) to remove a photo
 */
export default function Step3Photo({ photos, onAddPhoto, onRemove }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected after removal
    e.target.value = '';
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await api.post('/catches/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      const url = res.data?.url || res.data?.secure_url;
      if (url) onAddPhoto(url);
      else setError('Upload succeeded but no URL returned.');
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add 1–3 photos of your catch. Photos help with verification.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {photos.map((url, i) => (
          <div
            key={i}
            className="aspect-square relative rounded-xl overflow-hidden border-2 border-primary/20"
          >
            <img src={url} alt={`Catch photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove?.(i)}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-destructive transition-colors"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
            <CheckCircle2 className="absolute bottom-1 right-1 h-4 w-4 text-success drop-shadow" />
          </div>
        ))}

        {uploading && (
          <div className="aspect-square bg-muted rounded-xl flex flex-col items-center justify-center gap-1 border-2 border-primary/20">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}

        {!uploading && photos.length < 3 && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="aspect-square h-auto flex-col gap-1 border-dashed"
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs">Add photo</span>
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {photos.length === 0 && !uploading && (
        <p className="text-xs text-muted-foreground">
          Photo is optional but recommended for catches over 50 kg.
        </p>
      )}
    </div>
  );
}
