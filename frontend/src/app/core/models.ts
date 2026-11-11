export type Rol =
  | 'CLIENTE'
  | 'TRABAJADOR'
  | 'SUPERVISOR'
  | 'SUPERADMIN';

export type Especialidad =
  | 'PLOMERIA'
  | 'ALBANILERIA'
  | 'ELECTRICIDAD'
  | 'ELECTRODOMESTICOS';

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

export type EstadoOferta =
  | 'ENVIADA'
  | 'ELEGIDA'
  | 'CERRADA'
  | 'RECHAZADA';

export type EstadoTrabajador =
  | 'PENDIENTE'
  | 'ACTIVO'
  | 'PAUSADO'
  | 'SUSPENDIDO'
  | 'BAJA';

export type EstadoRevision =
  | 'PENDIENTE'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'REQUIERE_DATOS';

export type TipoDocumento =
  | 'CARNET_ANVERSO'
  | 'CARNET_REVERSO'
  | 'SELFIE'
  | 'REJAP'
  | 'CERTIFICADO'
  | 'FOTO_TRABAJO';

export type DecisionRevision =
  | 'APROBAR'
  | 'RECHAZAR'
  | 'REQUIERE_DATOS';

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

export interface SolicitudDetalle extends Solicitud {
  total_ofertas: number;
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
  cliente_en_conflictivos: boolean;
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
