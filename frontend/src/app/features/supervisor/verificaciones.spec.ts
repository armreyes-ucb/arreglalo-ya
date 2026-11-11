import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { ExpedienteVerificacion } from '../../core/models';
import { VerificacionService } from '../../core/verificacion.service';
import { BandejaVerificaciones } from './verificaciones';

const EXPEDIENTE_VIEJO: ExpedienteVerificacion = {
  trabajador_id: 'perfil-viejo',
  usuario_id: 'usuario-viejo',
  nombre_completo: 'Trabajador Antiguo',
  telefono: '+59170000001',
  nivel_verificacion: 2,
  estado: 'PENDIENTE',
  vence_antecedentes: null,
  mas_de_48_horas: true,
  horas_en_espera: 60,
  cuenta_bancaria: null,
  documentos: [],
};

const EXPEDIENTE_NUEVO: ExpedienteVerificacion = {
  trabajador_id: 'perfil-nuevo',
  usuario_id: 'usuario-nuevo',
  nombre_completo: 'Trabajador Reciente',
  telefono: '+59170000002',
  nivel_verificacion: 1,
  estado: 'PENDIENTE',
  vence_antecedentes: null,
  mas_de_48_horas: false,
  horas_en_espera: 2,
  cuenta_bancaria: null,
  documentos: [],
};

describe('BandejaVerificaciones', () => {
  async function crearComponente() {
    const verificacion = {
      bandeja: vi
        .fn()
        .mockResolvedValue([
          EXPEDIENTE_VIEJO,
          EXPEDIENTE_NUEVO,
        ]),
    };

    await TestBed.configureTestingModule({
      imports: [BandejaVerificaciones],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: VerificacionService, useValue: verificacion },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(
      BandejaVerificaciones,
    );
    await fixture.whenStable();
    const componente = fixture.componentInstance as any;
    componente.expedientes.set([
      EXPEDIENTE_VIEJO,
      EXPEDIENTE_NUEVO,
    ]);
    componente.cargando.set(false);
    fixture.detectChanges();
    return { componente, fixture };
  }

  it('muestra el expediente prioritario y los datos de espera', async () => {
    const { fixture } = await crearComponente();
    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Trabajador Antiguo');
    expect(texto).toContain('+48 h');
    expect(texto).toContain('60 h en espera');
    expect(texto).toContain('Trabajador Reciente');
  });
});
