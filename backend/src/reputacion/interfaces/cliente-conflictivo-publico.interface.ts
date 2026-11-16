export interface ClienteConflictivoPublico {
  id: string;
  cliente_id: string;
  reportes_acumulados: number;
  motivo: string;
  fecha_registro: Date;
  advertir: boolean;
}
