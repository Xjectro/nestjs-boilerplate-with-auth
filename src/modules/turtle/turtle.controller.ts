import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdempotencyInterceptor } from '@/shared/interceptors/idempotency.interceptor';
import { PaginationQueryDto } from '@/shared/pagination';
import { CreateTurtleDto } from './dto/create-turtle.dto';
import { UpdateTurtleDto } from './dto/update-turtle.dto';
import { TurtleService } from './turtle.service';

@ApiTags('turtles')
@Controller('turtle')
export class TurtleController {
  constructor(private readonly turtleService: TurtleService) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Create a new turtle' })
  @ApiBody({ type: CreateTurtleDto })
  @ApiResponse({ status: 201, description: 'Turtle created successfully.' })
  createTurtle(@Body() dto: CreateTurtleDto) {
    return this.turtleService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all turtles (paginated)' })
  @ApiResponse({ status: 200, description: 'Fetched turtles successfully.' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.turtleService.findAllPaginated(query.page ?? 1, query.limit ?? 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get turtle by id' })
  @ApiParam({ name: 'id', description: 'Turtle UUID' })
  @ApiResponse({ status: 200, description: 'Turtle retrieved successfully.' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.turtleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update turtle by id' })
  @ApiParam({ name: 'id', description: 'Turtle UUID' })
  @ApiBody({ type: UpdateTurtleDto })
  @ApiResponse({ status: 200, description: 'Turtle updated successfully.' })
  updateTurtle(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTurtleDto,
  ) {
    return this.turtleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete turtle by id' })
  @ApiParam({ name: 'id', description: 'Turtle UUID' })
  @ApiResponse({ status: 200, description: 'Turtle deleted successfully.' })
  async removeTurtle(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const removed = await this.turtleService.remove(id);
    return Boolean(removed);
  }
}
