/** Configuración vigente del periodo de alerta, expuesta por la API. */
export interface ConfiguracionAlertaSinOfertas {
  minutos_sin_ofertas: number;
  horas_equivalentes: number;
  actualizada_en: Date | null;
  actualizado_por: string | null;
}
