import type { CuentaBancaria } from '../../entities/cuenta-bancaria.entity.js';
import type { Documento } from '../../entities/documento.entity.js';
import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import { calcularEstadoAntecedentes } from '../../common/utils/fechas.js';
import { motivoBloqueoOferta } from '../../common/utils/rn10.js';
import type { DocumentoRevision } from '../interfaces/documento-revision.interface.js';
import type { EstadoVerificacionTrabajador } from '../interfaces/estado-verificacion.interface.js';
import type { ExpedienteVerificacion } from '../interfaces/expediente-verificacion.interface.js';
import type { RespuestaCargaDocumentos } from '../interfaces/respuesta-carga-documentos.interface.js';

export function toDocumentoRevision(
  documento: Documento,
  incluirUrl = false,
): DocumentoRevision {
  return {
    id: documento.id,
    tipo: documento.tipo,
    estado: documento.estadoRevision,
    ...(incluirUrl
      ? { archivo_privado_url: documento.archivoPrivadoUrl }
      : {}),
    motivo_rechazo: documento.motivoRechazo,
    vence_en: documento.venceEn,
    fecha_carga: documento.fechaCarga,
    revisado_por: documento.revisadoPorId,
  };
}

export function toEstadoVerificacionTrabajador(
  perfil: PerfilTrabajador,
  documentos: Documento[],
  cuenta: CuentaBancaria | null,
): EstadoVerificacionTrabajador {
  const antecedentes = calcularEstadoAntecedentes(
    perfil.venceAntecedentes,
  );
  const motivoBloqueo = motivoBloqueoOferta(
    perfil,
    Boolean(cuenta),
  );
  return {
    perfil_id: perfil.id,
    estado: perfil.estado,
    nivel_verificacion: perfil.nivelVerificacion,
    vence_antecedentes: perfil.venceAntecedentes,
    antecedentes_registrados: antecedentes.registrado,
    antecedentes_por_vencer: antecedentes.por_vencer,
    antecedentes_vencidos: antecedentes.vencido,
    puede_ofertar: motivoBloqueo === null,
    motivo_bloqueo: motivoBloqueo,
    cuenta_bancaria: cuenta
      ? {
          registrada: true,
          banco: cuenta.banco,
          titular: cuenta.titular,
        }
      : null,
    documentos: documentos.map((documento) =>
      toDocumentoRevision(documento),
    ),
  };
}

export function toExpedienteVerificacion(
  perfil: PerfilTrabajador,
  documentos: Documento[],
  cuenta: CuentaBancaria | null,
  fechaIngreso: Date,
  ahora: Date = new Date(),
): ExpedienteVerificacion {
  const horasEnEspera = Math.max(
    0,
    Math.floor(
      (ahora.getTime() - fechaIngreso.getTime()) / (60 * 60 * 1000),
    ),
  );
  return {
    trabajador_id: perfil.id,
    usuario_id: perfil.usuarioId,
    nombre_completo: perfil.usuario?.nombreCompleto ?? '',
    telefono: perfil.usuario?.telefono ?? '',
    nivel_verificacion: perfil.nivelVerificacion,
    estado: perfil.estado,
    vence_antecedentes: perfil.venceAntecedentes,
    mas_de_48_horas: horasEnEspera > 48,
    horas_en_espera: horasEnEspera,
    cuenta_bancaria: cuenta
      ? {
          banco: cuenta.banco,
          titular: cuenta.titular,
        }
      : null,
    documentos: documentos.map((documento) =>
      toDocumentoRevision(documento, true),
    ),
  };
}

export function toRespuestaCargaDocumentos(
  perfil: PerfilTrabajador,
  documentos: Documento[],
  cuenta: CuentaBancaria,
  venceAntecedentes: string | null = perfil.venceAntecedentes,
): RespuestaCargaDocumentos {
  return {
    mensaje: 'Documentos recibidos para revisión',
    perfil_id: perfil.id,
    estado: perfil.estado,
    vence_antecedentes: venceAntecedentes,
    cuenta_bancaria: {
      banco: cuenta.banco,
      titular: cuenta.titular,
    },
    documentos: documentos.map((documento) =>
      toDocumentoRevision(documento),
    ),
  };
}
