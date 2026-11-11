import type { Routes } from '@angular/router';
import {
  authGuard,
  publicOnlyGuard,
  roleGuard,
} from './core/guards';

export const routes: Routes = [
  {
    path: '',
    title: 'Arréglalo Ya | Técnicos verificados en tu zona',
    loadComponent: () =>
      import('./features/public/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'Ingresar | Arréglalo Ya',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta | Arréglalo Ya',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/auth/registro').then((m) => m.Registro),
  },
  {
    path: 'terminos',
    title: 'Términos y condiciones | Arréglalo Ya',
    loadComponent: () =>
      import('./features/legal/terminos').then((m) => m.Terminos),
  },
  {
    path: 'activar-trabajador',
    title: 'Activar cuenta de trabajador | Arréglalo Ya',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/trabajador/activacion').then(
        (m) => m.ActivacionTrabajador,
      ),
  },
  {
    path: 'sin-acceso',
    title: 'Sin acceso | Arréglalo Ya',
    loadComponent: () =>
      import('./features/public/sin-acceso').then(
        (m) => m.SinAcceso,
      ),
  },
  {
    path: 'cliente',
    canActivate: [roleGuard('CLIENTE')],
    children: [
      {
        path: '',
        title: 'Panel del cliente | Arréglalo Ya',
        loadComponent: () =>
          import('./features/cliente/panel').then(
            (m) => m.PanelCliente,
          ),
      },
      {
        path: 'publicar',
        title: 'Publicar solicitud | Arréglalo Ya',
        loadComponent: () =>
          import('./features/cliente/publicar').then(
            (m) => m.PublicarSolicitud,
          ),
      },
      {
        path: 'mis-solicitudes',
        title: 'Mis solicitudes | Arréglalo Ya',
        loadComponent: () =>
          import('./features/cliente/mis-solicitudes').then(
            (m) => m.MisSolicitudes,
          ),
      },
      {
        path: 'mis-solicitudes/:id',
        title: 'Detalle de solicitud | Arréglalo Ya',
        loadComponent: () =>
          import('./features/cliente/detalle-solicitud').then(
            (m) => m.DetalleSolicitud,
          ),
      },
      {
        path: 'buscar',
        title: 'Buscar técnicos | Arréglalo Ya',
        loadComponent: () =>
          import('./features/cliente/buscar').then(
            (m) => m.BuscarTrabajadores,
          ),
      },
      {
        path: 'trabajadores/:id',
        title: 'Perfil del técnico | Arréglalo Ya',
        loadComponent: () =>
          import('./features/cliente/perfil-publico').then(
            (m) => m.PerfilPublico,
          ),
      },
    ],
  },
  {
    path: 'trabajador',
    canActivate: [roleGuard('TRABAJADOR')],
    children: [
      {
        path: '',
        title: 'Panel del trabajador | Arréglalo Ya',
        loadComponent: () =>
          import('./features/trabajador/panel').then(
            (m) => m.PanelTrabajador,
          ),
      },
      {
        path: 'verificacion',
        title: 'Verificación de identidad | Arréglalo Ya',
        loadComponent: () =>
          import('./features/trabajador/verificacion').then(
            (m) => m.VerificacionTrabajador,
          ),
      },
      {
        path: 'perfil',
        title: 'Mi perfil de trabajador | Arréglalo Ya',
        loadComponent: () =>
          import('./features/trabajador/perfil').then(
            (m) => m.PerfilTrabajador,
          ),
      },
      {
        path: 'trabajos',
        title: 'Trabajos disponibles | Arréglalo Ya',
        loadComponent: () =>
          import('./features/trabajador/trabajos').then(
            (m) => m.TrabajosDisponibles,
          ),
      },
      {
        path: 'mis-ofertas',
        title: 'Mis ofertas | Arréglalo Ya',
        loadComponent: () =>
          import('./features/trabajador/mis-ofertas').then(
            (m) => m.MisOfertas,
          ),
      },
    ],
  },
  {
    path: 'supervisor',
    canActivate: [roleGuard('SUPERVISOR')],
    children: [
      {
        path: '',
        title: 'Panel del supervisor | Arréglalo Ya',
        loadComponent: () =>
          import('./features/supervisor/panel').then(
            (m) => m.PanelSupervisor,
          ),
      },
      {
        path: 'verificaciones',
        title: 'Bandeja de verificaciones | Arréglalo Ya',
        loadComponent: () =>
          import('./features/supervisor/verificaciones').then(
            (m) => m.BandejaVerificaciones,
          ),
      },
      {
        path: 'verificaciones/:id',
        title: 'Revisar verificación | Arréglalo Ya',
        loadComponent: () =>
          import('./features/supervisor/revision').then(
            (m) => m.RevisionVerificacion,
          ),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [roleGuard('SUPERADMIN')],
    children: [
      {
        path: '',
        title: 'Panel de administración | Arréglalo Ya',
        loadComponent: () =>
          import('./features/admin/panel').then(
            (m) => m.PanelAdmin,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
