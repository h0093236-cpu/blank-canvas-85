import { supabase } from '@/integrations/supabase/client';

/**
 * Get the public URL for a file stored in a Supabase storage bucket.
 */
export function getStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}
