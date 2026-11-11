import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CargarDocumentosDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  banco: string;

  @IsString()
  @Matches(/^\d{6,20}$/)
  numero_cuenta: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titular: string;

  @IsOptional()
  @IsDateString()
  vence_antecedentes?: string;
}
