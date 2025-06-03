
import { supabase } from "@/integrations/supabase/client";

export interface FileUploadResult {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  storagePath: string;
  publicUrl: string;
}

export class FileService {
  static async uploadFile(
    file: File,
    noteId?: string
  ): Promise<FileUploadResult> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Create unique file path with user folder structure
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const filePath = `${user.id}/${fileName}.${fileExt}`;

      console.log('📁 Uploading file:', file.name, 'to path:', filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ File uploaded to storage:', uploadData.path);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      // Create database record using the function
      const { data: fileRecord, error: dbError } = await supabase
        .rpc('handle_file_upload', {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: filePath,
          note_id: noteId || null
        });

      if (dbError) {
        console.error('❌ Database record error:', dbError);
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from('user-files').remove([filePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('✅ File record created with ID:', fileRecord);

      return {
        id: fileRecord,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        storagePath: filePath,
        publicUrl
      };

    } catch (error) {
      console.error('💥 File upload failed:', error);
      throw error;
    }
  }

  static async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file record to get storage path
      const { data: file, error: fetchError } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch file: ${fetchError.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([file.storage_path]);

      if (storageError) {
        console.warn('⚠️ Storage deletion warning:', storageError);
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }

      console.log('✅ File deleted successfully:', fileId);

    } catch (error) {
      console.error('❌ File deletion failed:', error);
      throw error;
    }
  }

  static async getUserFiles(noteId?: string) {
    try {
      let query = supabase
        .from('files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (noteId) {
        query = query.eq('note_id', noteId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch files: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('❌ Failed to fetch user files:', error);
      throw error;
    }
  }

  static getFilePreviewUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from('user-files')
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  }

  static isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  static isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  static isAudioFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  static isPdfFile(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }
}
