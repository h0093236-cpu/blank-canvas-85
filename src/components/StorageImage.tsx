import { getStorageUrl } from '@/lib/storage-utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ImageOff } from 'lucide-react';

interface StorageImageProps {
  bucket: string;
  path: string | null | undefined;
  alt: string;
  className?: string;
  /** If true, clicking opens a fullscreen dialog */
  expandable?: boolean;
}

export default function StorageImage({ bucket, path, alt, className = '', expandable = true }: StorageImageProps) {
  const url = getStorageUrl(bucket, path);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  const img = (
    <img
      src={url}
      alt={alt}
      className={`object-cover rounded-lg ${className}`}
      loading="lazy"
    />
  );

  if (!expandable) return img;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="cursor-pointer focus:outline-none">
          {img}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
        <img src={url} alt={alt} className="w-full h-full object-contain rounded-lg" />
      </DialogContent>
    </Dialog>
  );
}
