import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTurtleDto {
  @ApiProperty({ example: 'Leonardo' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Green Sea Turtle' })
  @IsString()
  species!: string;

  @ApiPropertyOptional({ example: 'leonardo' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 15, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}
