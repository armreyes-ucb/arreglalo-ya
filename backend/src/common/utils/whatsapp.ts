export function generarEnlaceWhatsApp(
  telefono: string | null | undefined,
  solicitudId: string,
): string | null {
  const digitos = telefono?.replace(/\D/g, '') ?? '';
  if (!digitos) {
    return null;
  }

  const mensaje = `Hola, coordinemos el trabajo de la solicitud ${solicitudId} en Arréglalo Ya.`;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}
