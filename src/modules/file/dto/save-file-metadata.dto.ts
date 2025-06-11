import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveFileMetadataDto {
  @ApiProperty({
    description: 'Path where the file is stored',
    example: 'uploads/1234567890_document.pdf'
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiProperty({
    description: 'Original name of the file',
    example: 'document.pdf'
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf'
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
