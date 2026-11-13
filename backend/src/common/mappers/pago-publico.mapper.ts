import type { Pago } from '../../entities/pago.entity.js';
import type { PagoPublico } from '../../pagos/interfaces/pago-publico.interface.js';

export function toPagoPublico(pago: Pago): PagoPublico {
  return {
    id: pago.id,
    solicitud_id: pago.solicitudId,
    precio_total_acordado: pago.precioTotalAcordado,
    pago_inicial_25: pago.pagoInicial25,
    parte_trabajador_20: pago.parteTrabajador20,
    comision_5: pago.comision5,
    saldo_75: pago.saldo75,
    codigo_qr_data: pago.codigoQrData,
    qr_vence_en: pago.qrVenceEn,
    estado_qr: pago.estadoQr,
    ya_pague_cliente: pago.yaPagueCliente,
    fecha_ya_pague: pago.fechaYaPague,
    saldo_75_confirmado_trabajador:
      pago.saldo75ConfirmadoTrabajador,
    fecha_confirmacion_trabajador:
      pago.fechaConfirmacionTrabajador,
    transferido_al_trabajador: pago.transferidoAlTrabajador,
    comprobante_transferencia: pago.comprobanteTransferencia,
  };
}
