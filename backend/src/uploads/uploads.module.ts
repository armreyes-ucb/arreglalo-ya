import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ImageStorageService } from './image-storage.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [ImageStorageService],
})
export class UploadsModule {}
