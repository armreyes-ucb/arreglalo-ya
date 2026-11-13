import type { Precio } from '../../entities/precio.entity.js';
import type { PrecioPublico } from '../../solicitudes/interfaces/precio-publico.interface.js';

export function toPrecioPublico(precio: Precio): PrecioPublico {
  return {
    id: precio.id,
    solicitud_id: precio.solicitudId,
    tipo: precio.tipo,
    monto: precio.monto,
    motivo: precio.motivo,
    foto_evidencia_url: precio.fotoEvidenciaUrl,
    aprobado_cliente: precio.aprobadoCliente,
    fecha: precio.fecha,
  };
}
