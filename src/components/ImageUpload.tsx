import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  userId: string;
}

const ImageUpload = ({ images, onImagesChange, maxImages = 10, userId }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('car-images')
      .upload(fileName, file, { upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('car-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }, [userId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const urls = await Promise.all(filesToUpload.map(uploadImage));
      onImagesChange([...images, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image(s)');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-3">
        {images.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
            <img src={url} alt={`Car photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">Add Photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{images.length}/{maxImages} photos uploaded</p>
    </div>
  );
};

export default ImageUpload;
