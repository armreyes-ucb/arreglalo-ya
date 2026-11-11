import type {
  DecisionRevision,
  Especialidad,
  EstadoOferta,
  EstadoRevision,
  EstadoSolicitud,
  EstadoTrabajador,
  Rol,
  TipoDocumento,
} from './models';

export interface CatalogoEspecialidad {
  valor: Especialidad;
  etiqueta: string;
  descripcion: string;
  monograma: string;
}

export const ESPECIALIDADES: CatalogoEspecialidad[] = [
  {
    valor: 'PLOMERIA',
    etiqueta: 'Plomería',
    descripcion: 'Fugas, tuberías, grifería e instalaciones de agua.',
    monograma: 'PL',
  },
  {
    valor: 'ALBANILERIA',
    etiqueta: 'Albañilería',
    descripcion: 'Muros, pisos, revoques y trabajos de construcción.',
    monograma: 'AL',
  },
  {
    valor: 'ELECTRICIDAD',
    etiqueta: 'Electricidad',
    descripcion: 'Cortocircuitos, tomacorrientes y cableado.',
    monograma: 'EL',
  },
  {
    valor: 'ELECTRODOMESTICOS',
    etiqueta: 'Electrodomésticos',
    descripcion: 'Refrigeradores, lavadoras, microondas y más.',
    monograma: 'ED',
  },
];

export const ETIQUETAS_ROL: Record<Rol, string> = {
  CLIENTE: 'Cliente',
  TRABAJADOR: 'Trabajador',
  SUPERVISOR: 'Supervisor',
  SUPERADMIN: 'Administrador',
};

export const ETIQUETAS_ESPECIALIDAD: Record<Especialidad, string> = {
  PLOMERIA: 'Plomería',
  ALBANILERIA: 'Albañilería',
  ELECTRICIDAD: 'Electricidad',
  ELECTRODOMESTICOS: 'Electrodomésticos',
};

export const ETIQUETAS_ESTADO_SOLICITUD: Record<
  EstadoSolicitud,
  string
> = {
  PUBLICADA: 'Publicada',
  CON_OFERTAS: 'Con ofertas',
  PENDIENTE_PAGO: 'Pendiente de pago',
  CONFIRMADA: 'Confirmada',
  EN_PROGRESO: 'En progreso',
  TERMINADA_TRABAJADOR: 'Terminada por el trabajador',
  FINALIZADA: 'Finalizada',
  ANULADA: 'Anulada',
  CANCELADA: 'Cancelada',
};

export const ETIQUETAS_ESTADO_OFERTA: Record<EstadoOferta, string> = {
  ENVIADA: 'Enviada',
  ELEGIDA: 'Elegida',
  CERRADA: 'Cerrada',
  RECHAZADA: 'Rechazada',
};

export const ETIQUETAS_ESTADO_TRABAJADOR: Record<
  EstadoTrabajador,
  string
> = {
  PENDIENTE: 'Pendiente de verificación',
  ACTIVO: 'Activo',
  PAUSADO: 'Pausado',
  SUSPENDIDO: 'Suspendido',
  BAJA: 'Dado de baja',
};

export const ETIQUETAS_ESTADO_REVISION: Record<
  EstadoRevision,
  string
> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  REQUIERE_DATOS: 'Requiere datos',
};

export const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
  CARNET_ANVERSO: 'Carnet de identidad (anverso)',
  CARNET_REVERSO: 'Carnet de identidad (reverso)',
  SELFIE: 'Selfie de verificación',
  REJAP: 'Certificado REJAP',
  CERTIFICADO: 'Certificado de especialidad',
  FOTO_TRABAJO: 'Foto de trabajo',
};

export const ETIQUETAS_DECISION: Record<DecisionRevision, string> = {
  APROBAR: 'Aprobar verificación',
  RECHAZAR: 'Rechazar expediente',
  REQUIERE_DATOS: 'Solicitar datos adicionales',
};

export const TIPOS_DOCUMENTO_REQUERIDOS: TipoDocumento[] = [
  'CARNET_ANVERSO',
  'CARNET_REVERSO',
  'SELFIE',
  'REJAP',
  'CERTIFICADO',
];

export const MONOGRAMAS_ESPECIALIDAD: Record<Especialidad, string> = {
  PLOMERIA: 'PL',
  ALBANILERIA: 'AL',
  ELECTRICIDAD: 'EL',
  ELECTRODOMESTICOS: 'ED',
};

export function etiquetaEspecialidad(
  especialidad: Especialidad | string,
): string {
  return (
    ETIQUETAS_ESPECIALIDAD[especialidad as Especialidad] ??
    especialidad
  );
}

export function etiquetaEstadoSolicitud(
  estado: EstadoSolicitud | string,
): string {
  return (
    ETIQUETAS_ESTADO_SOLICITUD[estado as EstadoSolicitud] ?? estado
  );
}

export function etiquetaEstadoOferta(
  estado: EstadoOferta | string,
): string {
  return ETIQUETAS_ESTADO_OFERTA[estado as EstadoOferta] ?? estado;
}

export function etiquetaEstadoTrabajador(
  estado: EstadoTrabajador | string,
): string {
  return (
    ETIQUETAS_ESTADO_TRABAJADOR[estado as EstadoTrabajador] ??
    estado
  );
}

export function etiquetaEstadoRevision(
  estado: EstadoRevision | string,
): string {
  return (
    ETIQUETAS_ESTADO_REVISION[estado as EstadoRevision] ?? estado
  );
}

export function etiquetaDocumento(tipo: TipoDocumento | string): string {
  return ETIQUETAS_DOCUMENTO[tipo as TipoDocumento] ?? tipo;
}

export function claseTonoSolicitud(
  estado: EstadoSolicitud | string,
): string {
  switch (estado) {
    case 'CON_OFERTAS':
    case 'PENDIENTE_PAGO':
      return 'insignia--ambar';
    case 'CONFIRMADA':
    case 'FINALIZADA':
      return 'insignia--verde';
    case 'EN_PROGRESO':
    case 'TERMINADA_TRABAJADOR':
      return 'insignia--azul';
    case 'ANULADA':
    case 'CANCELADA':
      return 'insignia--rojo';
    default:
      return 'insignia--neutro';
  }
}

export function claseTonoOferta(estado: EstadoOferta | string): string {
  switch (estado) {
    case 'ELEGIDA':
      return 'insignia--verde';
    case 'RECHAZADA':
      return 'insignia--rojo';
    case 'CERRADA':
      return 'insignia--neutro';
    default:
      return 'insignia--azul';
  }
}

export function claseTonoRevision(estado: EstadoRevision | string): string {
  switch (estado) {
    case 'APROBADO':
      return 'insignia--verde';
    case 'RECHAZADO':
      return 'insignia--rojo';
    case 'REQUIERE_DATOS':
      return 'insignia--ambar';
    default:
      return 'insignia--neutro';
  }
}

export function claseTonoTrabajador(
  estado: EstadoTrabajador | string,
): string {
  switch (estado) {
    case 'ACTIVO':
      return 'insignia--verde';
    case 'PENDIENTE':
      return 'insignia--ambar';
    case 'PAUSADO':
      return 'insignia--neutro';
    case 'SUSPENDIDO':
    case 'BAJA':
      return 'insignia--rojo';
    default:
      return 'insignia--neutro';
  }
}

export function nombreCorto(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).join(' ');
}

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

export function panelDeRol(rol: Rol): string {
  switch (rol) {
    case 'TRABAJADOR':
      return '/trabajador';
    case 'SUPERVISOR':
      return '/supervisor';
    case 'SUPERADMIN':
      return '/admin';
    default:
      return '/cliente';
  }
}
