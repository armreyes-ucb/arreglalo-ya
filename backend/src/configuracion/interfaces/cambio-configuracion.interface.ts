import type { ConfiguracionPlataforma } from './configuracion-plataforma.interface.js';

/** RF34: registro de auditoría de cada cambio de configuración. */
export interface CambioConfiguracion {
  id: string;
  fecha: string;
  usuario_id: string;
  cambios: Partial<ConfiguracionPlataforma>;
  anterior: ConfiguracionPlataforma;
  nuevo: ConfiguracionPlataforma;
}

export interface ArchivoConfiguracion {
  version: 1;
  valores: ConfiguracionPlataforma;
  historial: CambioConfiguracion[];
}
