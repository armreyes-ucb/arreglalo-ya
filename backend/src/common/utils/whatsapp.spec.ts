import { describe, expect, it } from 'vitest';
import { generarEnlaceWhatsApp } from './whatsapp.js';

const SOLICITUD_ID = '44444444-4444-4444-8444-444444444444';

describe('generarEnlaceWhatsApp', () => {
  it('genera un enlace con el teléfono limpio y el ID de la solicitud', () => {
    const enlace = generarEnlaceWhatsApp(
      '+591 700-00001',
      SOLICITUD_ID,
    );

    expect(enlace).toContain('https://wa.me/59170000001?text=');
    expect(decodeURIComponent(enlace ?? '')).toContain(SOLICITUD_ID);
  });

  it('devuelve null si no hay teléfono', () => {
    expect(generarEnlaceWhatsApp(null, SOLICITUD_ID)).toBeNull();
    expect(generarEnlaceWhatsApp('', SOLICITUD_ID)).toBeNull();
  });
});
