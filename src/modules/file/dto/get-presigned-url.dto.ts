import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPresignedUrlDto {
  @ApiProperty({
    description: 'Name of the file to upload',
    example: 'my-document.pdf'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-_. ]+$/, {
    message: 'fileName can only contain alphanumeric characters, spaces, dots, underscores and hyphens',
  })
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf'
  })
  @IsString()
  @IsNotEmpty()
  fileType: string;
}
