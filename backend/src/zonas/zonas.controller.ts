import { Controller, Get } from '@nestjs/common';
import type { ZonaPublica } from '../common/interfaces/zona-publica.interface.js';
import { ZonasService } from './zonas.service.js';

@Controller('zonas')
export class ZonasController {
  constructor(private readonly zonasService: ZonasService) {}

  @Get()
  findAll(): Promise<ZonaPublica[]> {
    return this.zonasService.findAll();
  }
}
