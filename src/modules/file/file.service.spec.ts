import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('FileService', () => {
  let service: FileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileService, PrismaService],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
