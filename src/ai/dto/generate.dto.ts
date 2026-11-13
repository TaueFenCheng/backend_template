import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateDto {
  @ApiProperty({ example: 'Explain dependency injection in NestJS.' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  prompt: string;

  @ApiPropertyOptional({
    example: 'Answer clearly for a backend developer.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}
