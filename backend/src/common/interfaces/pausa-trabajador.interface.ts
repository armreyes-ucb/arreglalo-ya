export type EstadoPausa = 'ACTIVA' | 'VENCIDA' | 'BAJA';

export interface PausaTrabajador {
  pausado: boolean;
  estado: EstadoPausa | null;
  inicio: string | null;
  vence_en: string | null;
  dias_restantes: number | null;
  aviso: boolean;
  baja_en: string | null;
}
