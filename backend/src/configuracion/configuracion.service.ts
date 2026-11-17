import {
  BadRequestException,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  CLAVES_CONFIGURACION,
  CONFIGURACION_POR_DEFECTO,
  LIMITES_CONFIGURACION,
} from './configuracion.constants.js';
import type { ArchivoConfiguracion, CambioConfiguracion } from './interfaces/cambio-configuracion.interface.js';
import type { ConfiguracionPlataforma } from './interfaces/configuracion-plataforma.interface.js';

const MAX_HISTORIAL = 200;

/**
 * RF34: configuración de la plataforma persistida en un archivo JSON
 * (`storage/configuracion.json` por defecto) porque el DDL está congelado.
 * Se mantiene una copia en memoria para que los servicios y los cron jobs
 * lean los valores sin tocar disco en cada operación.
 */
@Injectable()
export class ConfiguracionService implements OnModuleInit {
  private readonly logger = new Logger(ConfiguracionService.name);
  private readonly rutaArchivo =
    process.env.CONFIGURACION_ARCHIVO ??
    join(process.cwd(), 'storage', 'configuracion.json');

  private valores: ConfiguracionPlataforma = {
    ...CONFIGURACION_POR_DEFECTO,
  };
  private historial: CambioConfiguracion[] = [];
  private cargado = false;

  async onModuleInit(): Promise<void> {
    await this.asegurarCarga();
  }

  /** Devuelve una copia para que nadie mute el caché por accidente. */
  get(): ConfiguracionPlataforma {
    return { ...this.valores };
  }

  async obtenerHistorial(): Promise<CambioConfiguracion[]> {
    await this.asegurarCarga();
    return this.historial.map((cambio) => ({
      ...cambio,
      cambios: { ...cambio.cambios },
      anterior: { ...cambio.anterior },
      nuevo: { ...cambio.nuevo },
    }));
  }

  async actualizar(
    cambios: Partial<ConfiguracionPlataforma>,
    usuarioId: string,
  ): Promise<ConfiguracionPlataforma> {
    await this.asegurarCarga();

    const limpios = this.limpiarCambios(cambios);
    if (Object.keys(limpios).length === 0) {
      throw new BadRequestException(
        'No se enviaron cambios de configuración',
      );
    }

    const anterior = { ...this.valores };
    const nuevo = this.validar({ ...anterior, ...limpios });
    const entrada: CambioConfiguracion = {
      id: randomUUID(),
      fecha: new Date().toISOString(),
      usuario_id: usuarioId,
      cambios: limpios,
      anterior,
      nuevo,
    };
    const historial = [...this.historial, entrada].slice(
      -MAX_HISTORIAL,
    );

    await this.guardar({
      version: 1,
      valores: nuevo,
      historial,
    });

    this.valores = nuevo;
    this.historial = historial;
    this.logger.log(
      `Configuración actualizada por ${usuarioId}: ${Object.keys(
        limpios,
      ).join(', ')}`,
    );
    return { ...nuevo };
  }

  private async asegurarCarga(): Promise<void> {
    if (this.cargado) {
      return;
    }
    this.cargado = true;
    try {
      const contenido = await readFile(this.rutaArchivo, 'utf8');
      const archivo = JSON.parse(contenido) as Partial<ArchivoConfiguracion>;
      this.valores = this.validar({
        ...CONFIGURACION_POR_DEFECTO,
        ...archivo.valores,
      });
      this.historial = Array.isArray(archivo.historial)
        ? archivo.historial
        : [];
      this.logger.log(`Configuración cargada desde ${this.rutaArchivo}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.log(
          'No existe archivo de configuración; se usan los valores por defecto',
        );
        return;
      }
      this.logger.warn(
        `No se pudo leer ${this.rutaArchivo}; se usan los valores por defecto`,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  private limpiarCambios(
    cambios: Partial<ConfiguracionPlataforma>,
  ): Partial<ConfiguracionPlataforma> {
    const limpios: Partial<ConfiguracionPlataforma> = {};
    for (const [clave, valor] of Object.entries(cambios)) {
      const claveTipada = clave as keyof ConfiguracionPlataforma;
      if (!CLAVES_CONFIGURACION.includes(claveTipada)) {
        throw new BadRequestException(
          `Parámetro de configuración desconocido: ${clave}`,
        );
      }
      if (typeof valor === 'number') {
        limpios[claveTipada] = valor;
      }
    }
    return limpios;
  }

  private validar(
    valores: ConfiguracionPlataforma,
  ): ConfiguracionPlataforma {
    const resultado = { ...valores };

    for (const clave of CLAVES_CONFIGURACION) {
      const valor = resultado[clave];
      const limite = LIMITES_CONFIGURACION[clave];
      if (typeof valor !== 'number' || !Number.isFinite(valor)) {
        throw new BadRequestException(
          `El parámetro ${clave} debe ser un número`,
        );
      }
      if (limite.entero && !Number.isInteger(valor)) {
        throw new BadRequestException(
          `El parámetro ${clave} debe ser un entero`,
        );
      }
      if (valor < limite.minimo || valor > limite.maximo) {
        throw new BadRequestException(
          `El parámetro ${clave} debe estar entre ${limite.minimo} y ${limite.maximo}`,
        );
      }
    }

    if (resultado.comision_pct > resultado.pago_inicial_pct) {
      throw new BadRequestException(
        'La comisión no puede superar el porcentaje del pago inicial',
      );
    }
    if (resultado.dias_tope_urgente > resultado.dias_caducidad_solicitud) {
      throw new BadRequestException(
        'El plazo en el tope de urgentes no puede superar la caducidad de la solicitud',
      );
    }
    if (resultado.dias_pausa_baja < resultado.dias_pausa_maxima) {
      throw new BadRequestException(
        'La baja automática no puede ocurrir antes de la pausa máxima',
      );
    }

    return resultado;
  }

  private async guardar(archivo: ArchivoConfiguracion): Promise<void> {
    const directorio = dirname(this.rutaArchivo);
    await mkdir(directorio, { recursive: true });
    const temporal = `${this.rutaArchivo}.${randomUUID()}.tmp`;
    await writeFile(
      temporal,
      `${JSON.stringify(archivo, null, 2)}\n`,
      'utf8',
    );
    await rename(temporal, this.rutaArchivo);
  }
}
