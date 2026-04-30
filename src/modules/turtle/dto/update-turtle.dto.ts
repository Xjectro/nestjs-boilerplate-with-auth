import { PartialType } from '@nestjs/swagger';
import { CreateTurtleDto } from './create-turtle.dto';

export class UpdateTurtleDto extends PartialType(CreateTurtleDto) {}
