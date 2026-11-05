export function normalizarTelefono(telefono: string): string {
  return telefono.replace(/[\s-]/g, '').trim();
}
