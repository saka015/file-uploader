import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileModule } from './modules/file/file.module';
import { PrismaModule } from './prisma/prisma.module'; // 👈 Add this

@Module({
  imports: [FileModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
