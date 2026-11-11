export function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

export function hoyISO(fecha: Date = new Date()): string {
  return fecha.toISOString().slice(0, 10);
}

export function sumarAniosISO(fecha: Date, anios: number): string {
  const resultado = new Date(fecha);
  resultado.setFullYear(resultado.getFullYear() + anios);
  return hoyISO(resultado);
}

export function diferenciaDias(fechaISO: string, hoy = hoyISO()): number {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const [hoyAnio, hoyMes, hoyDia] = hoy.split('-').map(Number);
  const fecha = Date.UTC(anio, mes - 1, dia);
  const referencia = Date.UTC(hoyAnio, hoyMes - 1, hoyDia);
  return Math.ceil((fecha - referencia) / (24 * 60 * 60 * 1000));
}

export interface EstadoAntecedentes {
  registrado: boolean;
  vencido: boolean;
  por_vencer: boolean;
  dias_restantes: number | null;
}

export function calcularEstadoAntecedentes(
  venceAntecedentes: string | null,
  hoy = hoyISO(),
): EstadoAntecedentes {
  const registrado = Boolean(venceAntecedentes);
  const diasRestantes = venceAntecedentes
    ? diferenciaDias(venceAntecedentes, hoy)
    : null;
  const vencido =
    !venceAntecedentes || venceAntecedentes <= hoy;
  return {
    registrado,
    vencido,
    por_vencer:
      !vencido &&
      diasRestantes !== null &&
      diasRestantes <= 15,
    dias_restantes: diasRestantes,
  };
}
