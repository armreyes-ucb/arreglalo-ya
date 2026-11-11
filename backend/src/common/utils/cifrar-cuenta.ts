import {
  createCipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

function obtenerClave(): Buffer {
  const secreto =
    process.env.CUENTA_BANCARIA_KEY ??
    process.env.JWT_SECRET ??
    'arreglalo-ya-desarrollo';
  return createHash('sha256').update(secreto).digest();
}

export function cifrarNumeroCuenta(numeroCuenta: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', obtenerClave(), iv);
  const cifrado = Buffer.concat([
    cipher.update(numeroCuenta, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${cifrado.toString('base64')}`;
}
