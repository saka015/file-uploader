import { Module } from '@nestjs/common';
import { FileController } from './controller/file.controller';
import { StorageService } from './service/storage/storage.service';
import { FileService } from './service/file/file.service';

@Module({
  controllers: [FileController],
  providers: [StorageService, FileService]
})
export class FileModule {}
