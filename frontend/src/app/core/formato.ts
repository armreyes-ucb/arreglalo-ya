const FORMATO_MONEDA = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATO_FECHA = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatearBs(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return 'Bs 0,00';
  }
  return `Bs ${FORMATO_MONEDA.format(valor)}`;
}

export function formatearFecha(
  valor: string | Date | null | undefined,
): string {
  if (!valor) {
    return 'Sin fecha';
  }
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return 'Sin fecha';
  }
  return FORMATO_FECHA.format(fecha);
}

export function formatearFechaHora(
  valor: string | Date | null | undefined,
): string {
  if (!valor) {
    return 'Sin fecha';
  }
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return 'Sin fecha';
  }
  return FORMATO_FECHA_HORA.format(fecha);
}

export function valorDatetimeLocal(
  valor: string | Date | null | undefined,
): string {
  if (!valor) {
    return '';
  }
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase)
    .toISOString()
    .slice(0, 16);
}

export function fechaMinimaLocal(): string {
  const ahora = new Date(Date.now() + 60 * 60 * 1000);
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase)
    .toISOString()
    .slice(0, 16);
}

export function formatearDistancia(distancia: number): string {
  if (distancia === 0) {
    return 'En tu zona';
  }
  if (distancia === 1) {
    return 'Zona cercana';
  }
  return 'Zona vecina';
}

export function formatearNivel(nivel: number): string {
  if (nivel >= 2) {
    return 'Verificado';
  }
  if (nivel === 1) {
    return 'Verificación inicial';
  }
  return 'Sin verificar';
}

export function horaDe(valor: string | Date | null | undefined): string {
  if (!valor) {
    return '';
  }
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  return fecha.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
