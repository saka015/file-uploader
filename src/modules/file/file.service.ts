import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Bucket } from '@supabase/storage-js';

@Injectable()
export class FileService {
  private supabase: SupabaseClient;

  constructor(private prisma: PrismaService) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  async listBuckets(): Promise<Bucket[]> {
    const { data, error } = await this.supabase.storage.listBuckets();
    if (error) {
      throw new InternalServerErrorException('Error listing buckets: ' + error.message);
    }
    return data;
  } 





  async getPresignedUploadUrl(fileName: string, fileType: string): Promise<{ uploadUrl: string; filePath: string }> {
    const filePath = `uploads/${Date.now()}_${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('files')
      .createSignedUploadUrl(filePath, { upsert: true });

    if (error || !data.signedUrl) {
      throw new InternalServerErrorException(error?.message || 'Could not generate upload URL');
    }

    return { uploadUrl: data.signedUrl, filePath };
  }

// async saveFileMetadata(filePath: string, fileName: string, mimeType: string) {
//   try {
//     return await this.prisma.file.create({
//       data: {
//         filePath,
//         fileName,
//         contentType: mimeType,
//         size: 0,
//         userId: 'system',
//       },
//     });
//   } catch (error) {
//     console.error('Error saving file metadata:', error);
//     throw new InternalServerErrorException('Failed to save file metadata');
//   }
// }

async saveFileMetadata(filePath: string, fileName: string, mimeType: string) {
  try {
    const fileData = {
      file_path: filePath,
      file_name: fileName,
      content_type: mimeType,
      size: 0,
      user_id: 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // First, try to check if the file already exists
    const { data: existingFile, error: selectError } = await this.supabase
      .from('files')
      .select('*')
      .eq('file_path', filePath)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing file:', selectError);
      throw new InternalServerErrorException(`Failed to check existing file: ${selectError.message}`);
    }

    if (existingFile) {
      // Update existing file
      const { data, error } = await this.supabase
        .from('files')
        .update({
          file_name: fileName,
          content_type: mimeType,
          updated_at: new Date().toISOString(),
        })
        .eq('file_path', filePath)
        .select()
        .single();

      if (error) {
        console.error('Error updating file metadata:', error);
        throw new InternalServerErrorException(`Failed to update file metadata: ${error.message}`);
      }

      return data;
    } else {
      // Create new file record
      const { data, error } = await this.supabase
        .from('files')
        .insert(fileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating file metadata:', error);
        throw new InternalServerErrorException(`Failed to create file metadata: ${error.message}`);
      }

      return data;
    }
  } catch (error) {
    console.error('Error in saveFileMetadata:', error);
    throw new InternalServerErrorException(`Failed to save file metadata: ${error.message}`);
  }
}



  async getFile(fileId: string) {
    try {
      const { data: file, error: dbError } = await this.supabase
        .from('files')
        .select('id, file_name, file_path, content_type, size, created_at')
        .eq('id', fileId)
        .eq('is_deleted', false)
        .single();

      if (dbError || !file) {
        throw new NotFoundException('File not found');
      }

      // Generate public URL for the file
      const { data: publicUrlData } = this.supabase.storage
        .from('files')
        .getPublicUrl(file.file_path);

      return { 
        file: {
          id: file.id,
          fileName: file.file_name,
          filePath: file.file_path,
          contentType: file.content_type,
          size: file.size,
          createdAt: file.created_at,
        }, 
        downloadUrl: publicUrlData.publicUrl
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting file:', error);
      throw new InternalServerErrorException(`Failed to get file: ${error.message}`);
    }
  }

  async deleteFile(fileId: string) {
    try {
      const { data: file, error: dbError } = await this.supabase
        .from('files')
        .select('id, file_path')
        .eq('id', fileId)
        .eq('is_deleted', false)
        .single();

      if (dbError || !file) {
        throw new NotFoundException('File not found');
      }

      const { error: storageError } = await this.supabase.storage
        .from('files')
        .remove([file.file_path]);

      if (storageError) {
        throw new InternalServerErrorException('Failed to delete file from storage');
      }

      const { error: updateError } = await this.supabase
        .from('files')
        .update({ 
          is_deleted: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', fileId);

      if (updateError) {
        throw new InternalServerErrorException('Failed to delete file metadata');
      }

      return { message: 'File deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting file:', error);
      throw new InternalServerErrorException(`Failed to delete file: ${error.message}`);
    }
  }
}
