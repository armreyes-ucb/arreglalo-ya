export type Rol = 'CLIENTE' | 'TRABAJADOR' | 'SUPERVISOR' | 'SUPERADMIN';

export type Especialidad = 'PLOMERIA' | 'ALBANILERIA' | 'ELECTRICIDAD' | 'ELECTRODOMESTICOS';

export type EstadoSolicitud =
  | 'PUBLICADA'
  | 'CON_OFERTAS'
  | 'PENDIENTE_PAGO'
  | 'CONFIRMADA'
  | 'EN_PROGRESO'
  | 'TERMINADA_TRABAJADOR'
  | 'FINALIZADA'
  | 'ANULADA'
  | 'CANCELADA';

export type EstadoOferta = 'ENVIADA' | 'ELEGIDA' | 'CERRADA' | 'RECHAZADA';

export type EstadoTrabajador = 'PENDIENTE' | 'ACTIVO' | 'PAUSADO' | 'SUSPENDIDO' | 'BAJA';

export type EstadoQr = 'PENDIENTE' | 'PAGADO' | 'VENCIDO' | 'DEVUELTO';

export type TipoPrecio = 'PREVIO' | 'FINAL' | 'INCREMENTO';

export type EstadoReclamo =
  | 'ABIERTO'
  | 'RESPONDIDO'
  | 'EN_REVISION_SUPERVISOR'
  | 'RESUELTO'
  | 'FALTA_TRABAJADOR'
  | 'RECHAZADO';

export type EstadoDevolucion = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA';

export type EstadoRevision = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REQUIERE_DATOS';

export type TipoDocumento =
  'CARNET_ANVERSO' | 'CARNET_REVERSO' | 'SELFIE' | 'REJAP' | 'CERTIFICADO' | 'FOTO_TRABAJO';

export type DecisionRevision = 'APROBAR' | 'RECHAZAR' | 'REQUIERE_DATOS';

export type DecisionReclamo = 'FALTA_TRABAJADOR' | 'RECHAZADO';

export interface UsuarioPublico {
  id: string;
  nombre_completo: string;
  telefono: string;
  roles: Rol[];
  estado: string;
  fecha_registro: string;
}

export interface Sesion {
  token: string;
  usuario: UsuarioPublico;
  rolActivo: Rol;
  expiraEn: number;
}

export interface Zona {
  id: number;
  nombre: string;
  otb: string;
  municipio: string;
  zonas_vecinas: string[];
}

export interface Solicitud {
  id: string;
  cliente_id: string;
  trabajador_confirmado_id: string | null;
  zona_id: number;
  zona: Zona | null;
  especialidad: Especialidad;
  tipo_problema: string;
  descripcion: string;
  fotos_urls: string[];
  direccion_oculta: string;
  fecha_cita_preferida: string;
  urgente: boolean;
  estado: EstadoSolicitud;
  creada_en: string;
  vence_en: string;
  entro_al_tope: string | null;
  cerrada_en: string | null;
}

export interface EventoHistorial {
  estado: EstadoSolicitud;
  fecha_hora: string;
  usuario_id: string;
  usuario_nombre: string | null;
}

export interface SolicitudDetalle extends Omit<Solicitud, 'direccion_oculta'> {
  direccion_oculta: string | null;
  whatsapp_url: string | null;
  total_ofertas: number;
  advertir_cliente_conflictivo: boolean;
  historial: EventoHistorial[];
}

export interface SolicitudDisponible {
  id: string;
  zona_id: number;
  zona: Zona | null;
  especialidad: Especialidad;
  tipo_problema: string;
  descripcion: string;
  fotos_urls: string[];
  fecha_cita_preferida: string;
  urgente: boolean;
  estado: EstadoSolicitud;
  creada_en: string;
  vence_en: string;
  advertir_cliente_conflictivo: boolean;
}

export interface Oferta {
  id: string;
  solicitud_id: string;
  trabajador_id: string;
  precio_estimado: number;
  costo_transporte: number;
  fecha_propuesta: string;
  mensaje: string | null;
  estado: EstadoOferta;
  creada_en: string;
}

export interface ResumenSolicitudOferta {
  id: string;
  zona_id: number;
  zona: Zona | null;
  especialidad: Especialidad;
  tipo_problema: string;
  estado: EstadoSolicitud;
  urgente: boolean;
  fecha_cita_preferida: string;
}

export interface OfertaConSolicitud extends Oferta {
  solicitud: ResumenSolicitudOferta;
  advertir_cliente_conflictivo: boolean;
}

export interface PerfilTrabajadorPropio {
  id: string;
  usuario_id: string;
  nombre_completo: string;
  telefono: string;
  especialidades: Especialidad[];
  horarios: string | null;
  precios_estimados: Record<string, number>;
  promedio: number;
  trabajos_completados: number;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  acepto_contrato_digital: boolean;
  zonas: Zona[];
  fotos_trabajos: string[];
  vence_antecedentes: string | null;
  antecedentes_por_vencer: boolean;
  antecedentes_vencidos: boolean;
  puede_ofertar: boolean;
  motivo_bloqueo: string | null;
}

export interface TrabajadorPublico {
  id: string;
  nombre_completo: string;
  especialidades: Especialidad[];
  horarios: string | null;
  precios_estimados: Record<string, number>;
  promedio: number;
  trabajos_completados: number;
  nivel_verificacion: number;
  antecedentes_vencidos: boolean;
  zonas: Zona[];
  fotos_trabajos: string[];
}

export interface TrabajadorMatch extends TrabajadorPublico {
  distancia: number;
}

export interface DocumentoRevision {
  id: string;
  tipo: TipoDocumento | string;
  estado: EstadoRevision;
  archivo_privado_url?: string;
  motivo_rechazo: string | null;
  vence_en: string | null;
  fecha_carga: string;
  revisado_por: string | null;
}

export interface EstadoVerificacion {
  perfil_id: string;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  vence_antecedentes: string | null;
  antecedentes_registrados: boolean;
  antecedentes_por_vencer: boolean;
  antecedentes_vencidos: boolean;
  puede_ofertar: boolean;
  motivo_bloqueo: string | null;
  cuenta_bancaria: {
    registrada: boolean;
    banco: string | null;
    titular: string | null;
  } | null;
  documentos: DocumentoRevision[];
}

export interface ExpedienteVerificacion {
  trabajador_id: string;
  usuario_id: string;
  nombre_completo: string;
  telefono: string;
  nivel_verificacion: number;
  estado: EstadoTrabajador;
  vence_antecedentes: string | null;
  mas_de_48_horas: boolean;
  horas_en_espera: number;
  cuenta_bancaria: {
    banco: string;
    titular: string;
  } | null;
  documentos: DocumentoRevision[];
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  rol_activo: Rol;
  usuario: UsuarioPublico;
}

export interface ActivacionTrabajadorResponse extends AuthTokenResponse {
  perfil: {
    id: string;
    especialidades: Especialidad[];
    estado: EstadoTrabajador;
    nivel_verificacion: number;
    acepto_contrato_digital: boolean;
    promedio: number;
    trabajos_completados: number;
  };
  zonas: Zona[];
}

export interface SolicitarCodigoResponse {
  mensaje: string;
  expira_en_segundos: number;
  codigo_desarrollo?: string;
}

export interface RespuestaCargaDocumentos {
  mensaje: string;
  perfil_id: string;
  estado: EstadoTrabajador;
  vence_antecedentes: string | null;
  cuenta_bancaria: {
    banco: string;
    titular: string;
  };
  documentos: DocumentoRevision[];
}

export interface ResultadoRevision {
  mensaje: string;
  perfil_id: string;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  decide: DecisionRevision;
  documentos: DocumentoRevision[];
}

export interface NuevaOferta {
  precio_estimado: number;
  costo_transporte: number;
  fecha_propuesta: string;
  mensaje?: string;
}

export interface TrabajadorResumenOferta {
  id: string;
  nombre_completo: string;
  promedio: number;
  trabajos_completados: number;
  nivel_verificacion: number;
  especialidades: Especialidad[];
  zonas: Zona[];
}

export interface OfertaConTrabajador extends Oferta {
  trabajador: TrabajadorResumenOferta;
}

export interface Pago {
  id: string;
  solicitud_id: string;
  precio_total_acordado: number;
  pago_inicial_25: number;
  parte_trabajador_20: number;
  comision_5: number;
  saldo_75: number;
  codigo_qr_data: string | null;
  qr_vence_en: string | null;
  estado_qr: EstadoQr;
  ya_pague_cliente: boolean;
  fecha_ya_pague: string | null;
  saldo_75_confirmado_trabajador: boolean;
  fecha_confirmacion_trabajador: string | null;
  transferido_al_trabajador: boolean;
  comprobante_transferencia: string | null;
}

export interface ReportePublico {
  id: string;
  estado: EstadoReclamo;
}

export interface PagoSolicitud {
  pago: Pago;
  reporte_abierto: ReportePublico | null;
}

export interface Precio {
  id: string;
  solicitud_id: string;
  tipo: TipoPrecio;
  monto: number;
  motivo: string | null;
  foto_evidencia_url: string | null;
  aprobado_cliente: boolean | null;
  fecha: string;
}

export interface TransferenciaSimulada {
  monto: number;
  comision_plataforma: number;
  comprobante: string;
  simulada: true;
}

export interface ResolucionPagoFinal {
  pago: Pago;
  estado_solicitud: EstadoSolicitud;
  transferencia: TransferenciaSimulada | null;
  reporte: ReportePublico | null;
}

export interface DevolucionPublica {
  id: string;
  pago_id: string;
  motivo: string;
  monto: number;
  fecha_limite: string;
  estado: EstadoDevolucion;
}

export interface ResolucionPrecio {
  precio: Precio;
  pago: Pago | null;
  devolucion: DevolucionPublica | null;
  estado_solicitud: EstadoSolicitud;
}

export interface SuspensionPublica {
  id: string;
  trabajador_id: string;
  numero_falta: number;
  dias_fibonacci: number;
  motivo: string;
  inicio: string;
  fin: string;
}

export interface ResolucionCancelacion {
  solicitud: Solicitud;
  pago: Pago | null;
  devolucion: DevolucionPublica | null;
  suspension: SuspensionPublica | null;
  transferencia: TransferenciaSimulada | null;
}

export interface CalificacionPublica {
  id: string;
  solicitud_id: string;
  autor_id: string;
  destinatario_id: string;
  estrellas: number;
  calidad: number | null;
  puntualidad: number | null;
  trato: number | null;
  precio_justo: number | null;
  comentario: string | null;
  respuesta_trabajador: string | null;
  fecha: string;
}

export interface PromedioHabilidad {
  calidad: number | null;
  puntualidad: number | null;
  trato: number | null;
  precio_justo: number | null;
}

export interface ResumenReputacion {
  trabajador_id: string;
  promedio: number;
  total_trabajos: number;
  total_calificaciones: number;
  por_habilidad: PromedioHabilidad;
  calificaciones: CalificacionPublica[];
}

export interface ReclamoPublico {
  id: string;
  solicitud_id: string;
  motivo: string;
  evidencia_fotos: string[];
  respuesta_trabajador: string | null;
  estado: EstadoReclamo;
  resolucion_supervisor: string | null;
  fecha_apertura: string;
  horas_para_responder: number | null;
  horas_sla_supervisor: number | null;
  fuera_de_plazo: boolean;
  vencido_sla: boolean;
}

export interface SuspensionRegistrada extends SuspensionPublica {
  activa: boolean;
}

export type EstadoClienteConflictivo = 'POTENCIAL' | 'CONFIRMADO' | 'DESESTIMADO';

export type DecisionConflicto = 'CONFIRMAR' | 'DESESTIMAR';

export interface ClienteConflictivoPublico {
  id: string;
  cliente_id: string;
  reportes_acumulados: number;
  motivo: string;
  fecha_registro: string;
  advertir: boolean;
  estado: EstadoClienteConflictivo;
  reportes_comprobados: number;
  reportes_pendientes: number;
  reclamos_totales: number;
  reclamos_rechazados: number;
  cancelaciones: number;
  periodo_dias: number;
  actualizado_en: string;
}

export interface IndicadoresConflictoPublicos {
  reclamos_totales: number;
  reclamos_rechazados: number;
  cancelaciones: number;
  reportes_comprobados: number;
  reportes_pendientes: number;
  periodo_dias: number;
}

export interface ReclamoEvidencia {
  id: string;
  solicitud_id: string;
  fecha: string;
  estado: EstadoReclamo;
  motivo: string;
}

export interface CancelacionEvidencia {
  solicitud_id: string;
  fecha: string;
}

export interface ResolucionConflictoPublica {
  id: string;
  conflictivo_id: string;
  cliente_id: string;
  supervisor_id: string;
  decision: DecisionConflicto;
  justificacion: string;
  indicadores: Record<string, unknown>;
  fecha: string;
}

export interface DetalleConflictoPublico {
  cliente_id: string;
  estado: EstadoClienteConflictivo;
  indicadores: IndicadoresConflictoPublicos;
  motivos: string[];
  reclamos: ReclamoEvidencia[];
  cancelaciones: CancelacionEvidencia[];
  resoluciones: ResolucionConflictoPublica[];
}

export interface ResumenDeteccion {
  omitido: boolean;
  evaluados: number;
  potenciales: number;
  actualizados: number;
  reabiertos: number;
}

export interface ClienteConflictivoConfiguracion {
  deteccion_activa: boolean;
  periodo_dias: number;
  min_reclamos_rechazados: number;
  min_cancelaciones: number;
  min_reportes: number;
  min_reclamos_totales: number;
  actualizado_en: string;
  actualizado_por: string | null;
}

export interface ResolucionReclamo {
  reclamo: ReclamoPublico;
  suspension: SuspensionRegistrada | null;
}

export interface ConfiguracionPlataforma {
  comision_pct: number;
  pago_inicial_pct: number;
  factor_urgente: number;
  minutos_vigencia_qr: number;
  horas_cancelacion_sin_penalidad: number;
  dias_habiles_devolucion: number;
  horas_cierre_automatico: number;
  dias_caducidad_solicitud: number;
  dias_tope_urgente: number;
  dias_pausa_maxima: number;
  dias_pausa_baja: number;
  dias_aviso_antecedentes: number;
  dias_reclamo: number;
  horas_respuesta_reclamo: number;
  horas_sla_supervisor: number;
}

export interface CambioConfiguracion {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string;
  usuario_id: string;
  fecha: string;
}

export interface ReporteSolicitudes {
  total: number;
  urgentes: number;
  con_trabajador: number;
  sin_trabajador: number;
  por_estado: Partial<Record<EstadoSolicitud, number>>;
}

export interface ReporteComisiones {
  comision_cobrada: number;
  comision_devengada: number;
  pagos_confirmados: number;
  monto_total_acordado: number;
  pago_inicial_total: number;
}

export interface ReporteDevoluciones {
  total: number;
  monto_total: number;
  pendientes: number;
  en_proceso: number;
  completadas: number;
  por_estado: Partial<Record<EstadoDevolucion, number>>;
}

export interface ReporteReclamos {
  total: number;
  abiertos: number;
  vencidos_sla: number;
  por_estado: Partial<Record<EstadoReclamo, number>>;
}

export interface ReporteAdministrativo {
  desde: string | null;
  hasta: string | null;
  solicitudes: ReporteSolicitudes;
  comisiones: ReporteComisiones;
  devoluciones: ReporteDevoluciones;
  reclamos: ReporteReclamos;
}

export interface PausaTrabajador {
  pausado: boolean;
  estado: 'ACTIVA' | 'VENCIDA' | 'BAJA' | null;
  inicio: string | null;
  vence_en: string | null;
  dias_restantes: number | null;
  aviso: boolean;
  baja_en: string | null;
}

export interface PerfilTrabajadorPropio {
  id: string;
  usuario_id: string;
  nombre_completo: string;
  telefono: string;
  especialidades: Especialidad[];
  horarios: string | null;
  precios_estimados: Record<string, number>;
  promedio: number;
  trabajos_completados: number;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  acepto_contrato_digital: boolean;
  zonas: Zona[];
  fotos_trabajos: string[];
  vence_antecedentes: string | null;
  antecedentes_por_vencer: boolean;
  antecedentes_vencidos: boolean;
  puede_ofertar: boolean;
  motivo_bloqueo: string | null;
  pausa: PausaTrabajador;
}

export interface SupervisorCreado {
  supervisor: UsuarioPublico;
  password_temporal: string | null;
  creado: boolean;
}

export interface EliminacionCuentaResponse {
  anonimizado: boolean;
  ya_anonimizado: boolean;
}
