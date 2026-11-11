import { Pipe, type PipeTransform } from '@angular/core';
import { resolverImagen } from '../core/api';
import {
  formatearBs,
  formatearFecha,
  formatearFechaHora,
} from '../core/formato';

@Pipe({ name: 'imagenUrl' })
export class ImagenUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return resolverImagen(url);
  }
}

@Pipe({ name: 'moneda' })
export class MonedaPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatearBs(valor);
  }
}

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined): string {
    return formatearFecha(valor);
  }
}

@Pipe({ name: 'fechaHora' })
export class FechaHoraPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined): string {
    return formatearFechaHora(valor);
  }
}
