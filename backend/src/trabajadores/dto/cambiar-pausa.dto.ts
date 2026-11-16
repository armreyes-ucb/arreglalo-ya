import { IsEnum } from 'class-validator';
import { AccionPausa } from '../../common/enums/accion-pausa.enum.js';

export class CambiarPausaDto {
  @IsEnum(AccionPausa)
  accion: AccionPausa;
}
