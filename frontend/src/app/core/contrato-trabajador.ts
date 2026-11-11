export interface SeccionContrato {
  titulo: string;
  parrafos: string[];
  puntos?: string[];
}

export const CONTRATO_TRABAJADOR: SeccionContrato[] = [
  {
    titulo: '1. Objeto del contrato',
    parrafos: [
      'Este contrato regula tu participación como trabajador independiente en Arréglalo Ya. La plataforma conecta clientes con técnicos y no ejecuta directamente los trabajos.',
      'Al aceptar, declaras que los datos de tu perfil son verdaderos y que realizarás los servicios con responsabilidad y respeto.',
    ],
  },
  {
    titulo: '2. Verificación obligatoria',
    parrafos: [
      'Para ofertar debes completar la verificación de identidad y antecedentes. Un supervisor revisará tu carnet, selfie, certificado REJAP y certificado de especialidad.',
      'Mientras tu expediente no esté aprobado, tu perfil permanecerá pendiente y no podrás enviar ofertas. Si tus antecedentes vencen, la plataforma bloqueará nuevas ofertas.',
    ],
  },
  {
    titulo: '3. Especialidades, zonas y disponibilidad',
    parrafos: [
      'Tú eliges las especialidades y zonas en las que deseas trabajar. También puedes actualizar tus horarios y precios estimados desde tu perfil.',
    ],
    puntos: [
      'Mantén actualizada tu disponibilidad para evitar ofertas que no puedas cumplir.',
      'No compartas datos de contacto ni acuerdes trabajos fuera de la plataforma antes de la confirmación.',
    ],
  },
  {
    titulo: '4. Precios, comisión y pagos',
    parrafos: [
      'El cliente paga un adelanto del 25% mediante código QR para confirmar el trabajo. El saldo restante se cancela en persona al concluir el servicio.',
      'La comisión de la plataforma es del 5% sobre el pago inicial y se descuenta de la parte que te corresponde. Todos los montos se redondean a Bs 0,50.',
    ],
    puntos: [
      'Parte del trabajador = pago inicial menos comisión de la plataforma.',
      'Saldo en persona = total acordado menos pago inicial.',
    ],
  },
  {
    titulo: '5. Cancelaciones, devoluciones y suspensiones',
    parrafos: [
      'Las cancelaciones con dos horas o más de anticipación no generan penalidad. Las devoluciones se procesan en un máximo de tres días hábiles al medio de pago original.',
      'Los incumplimientos pueden generar suspensiones según la serie de Fibonacci: 1, 2, 3, 5, 8, 13 y 21 días.',
    ],
  },
  {
    titulo: '6. Datos personales y conducta',
    parrafos: [
      'Tus documentos se guardan en un repositorio privado y solo pueden consultarlos las personas autorizadas para la verificación. La cuenta bancaria se usa exclusivamente para los pagos del servicio.',
      'Debes tratar con respeto a los clientes, cumplir los horarios acordados y no usar la información de la plataforma para fines distintos al trabajo contratado.',
    ],
  },
];
