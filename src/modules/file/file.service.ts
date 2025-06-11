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

  async saveFileMetadata(filePath: string, fileName: string, mimeType: string) {
    try {
      return await this.prisma.file.create({
        data: {
          filePath,
          fileName,
          contentType: mimeType,
          size: 0, // This should be updated with actual file size
          userId: 'system', // This should be updated with actual user ID from your auth system
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to save file metadata');
    }
  }

  async getFile(fileId: string) {
    const file = await this.prisma.file.findUnique({ 
      where: { id: fileId },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        contentType: true,
        size: true,
        createdAt: true,
      }
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const { data, error } = await this.supabase.storage
      .from('files')
      .download(file.filePath);

    if (error) {
      throw new InternalServerErrorException('Failed to download file from storage');
    }

    return { file, data };
  }

  async deleteFile(fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const { error: storageError } = await this.supabase.storage
      .from('files')
      .remove([file.filePath]);

    if (storageError) {
      throw new InternalServerErrorException('Failed to delete file from storage');
    }

    try {
      await this.prisma.file.delete({ where: { id: fileId } });
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete file metadata');
    }

    return { message: 'File deleted successfully' };
  }
}
