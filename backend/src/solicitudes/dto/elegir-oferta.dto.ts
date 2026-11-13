import { IsUUID } from 'class-validator';

export class ElegirOfertaDto {
  @IsUUID()
  oferta_id: string;
}
