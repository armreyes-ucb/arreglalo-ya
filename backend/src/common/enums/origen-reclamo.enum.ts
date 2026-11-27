/**
 * RF30/RF32: quién originó el reclamo. Permite distinguir los reclamos del
 * cliente de los reportes del trabajador generados desde el módulo de pagos.
 */
export enum OrigenReclamo {
  CLIENTE = 'CLIENTE',
  TRABAJADOR = 'TRABAJADOR',
}
