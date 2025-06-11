
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
      const existingFile = await this.prisma.file.findUnique({
        where: { filePath },
      });

      if (existingFile) {
        return await this.prisma.file.update({
          where: { filePath },
          data: {
            fileName,
            contentType: mimeType,
            updatedAt: new Date(),
          },
        });
      } else {
        return await this.prisma.file.create({
          data: {
            filePath,
            fileName,
            contentType: mimeType,
            size: 0,
            userId: 'system',
          },
        });
      }
    } catch (error) {
      throw new InternalServerErrorException(`Failed to save file metadata: ${error.message}`);
    }
  }

  async getFile(fileId: string) {
    try {
      const file = await this.prisma.file.findFirst({
        where: {
          id: fileId,
          isDeleted: false,
        },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      const { data: publicUrlData } = this.supabase.storage
        .from('files')
        .getPublicUrl(file.filePath);

      return {
        file: {
          id: file.id,
          fileName: file.fileName,
          filePath: file.filePath,
          contentType: file.contentType,
          size: file.size,
          createdAt: file.createdAt,
        },
        downloadUrl: publicUrlData.publicUrl,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to get file: ${error.message}`);
    }
  }

  async deleteFile(fileId: string) {
    try {
      const file = await this.prisma.file.findFirst({
        where: {
          id: fileId,
          isDeleted: false,
        },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      const { error: storageError } = await this.supabase.storage
        .from('files')
        .remove([file.filePath]);

      if (storageError) {
        throw new InternalServerErrorException('Failed to delete file from storage');
      }

      await this.prisma.file.update({
        where: { id: fileId },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      });

      return { message: 'File deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to delete file: ${error.message}`);
    }
  }
}
