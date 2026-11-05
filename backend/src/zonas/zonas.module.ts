import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zona } from '../entities/zona.entity.js';
import { ZonasController } from './zonas.controller.js';
import { ZonasService } from './zonas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Zona])],
  controllers: [ZonasController],
  providers: [ZonasService],
})
export class ZonasModule {}
