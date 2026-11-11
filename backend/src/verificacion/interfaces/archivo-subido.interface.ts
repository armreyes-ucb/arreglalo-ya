export interface ArchivoSubido {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export type ArchivosSubidos = Partial<
  Record<string, ArchivoSubido[]>
>;
