import type { EstadoQr } from '../../common/enums/estado-qr.enum.js';

export interface PagoPublico {
  id: string;
  solicitud_id: string;
  precio_total_acordado: number;
  pago_inicial_25: number;
  parte_trabajador_20: number;
  comision_5: number;
  saldo_75: number;
  codigo_qr_data: string | null;
  qr_vence_en: Date | null;
  estado_qr: EstadoQr;
  ya_pague_cliente: boolean;
  fecha_ya_pague: Date | null;
  saldo_75_confirmado_trabajador: boolean;
  fecha_confirmacion_trabajador: Date | null;
  transferido_al_trabajador: boolean;
  comprobante_transferencia: string | null;
}
