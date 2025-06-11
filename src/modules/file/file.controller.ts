import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { FileService } from './file.service';
import { GetPresignedUrlDto } from './dto/get-presigned-url.dto';
import { SaveFileMetadataDto } from './dto/save-file-metadata.dto';
import { FileIdParamDto } from './dto/file-id-param.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('files')
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('buckets')
  @ApiOperation({ summary: 'List all storage buckets' })
  @ApiResponse({ status: 200, description: 'Returns list of all buckets' })
  async listBuckets() {
    return this.fileService.listBuckets();
  }

  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a presigned URL for file upload' })
  @ApiResponse({ status: 200, description: 'Returns presigned URL and file path' })
  async getPresignedUrl(@Body() dto: GetPresignedUrlDto) {
    return this.fileService.getPresignedUploadUrl(dto.fileName, dto.fileType);
  }

  @Post('metadata')
  @ApiOperation({ summary: 'Save file metadata after upload' })
  @ApiResponse({ status: 201, description: 'File metadata saved successfully' })
  async saveMetadata(@Body() dto: SaveFileMetadataDto) {
    return this.fileService.saveFileMetadata(dto.filePath, dto.fileName, dto.mimeType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiResponse({ status: 200, description: 'Returns file data and metadata' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param() params: FileIdParamDto) {
    return this.fileService.getFile(params.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete file by ID' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param() params: FileIdParamDto) {
    return this.fileService.deleteFile(params.id);
  }
}
