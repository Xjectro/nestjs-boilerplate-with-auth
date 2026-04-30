import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiErrorCode } from '@/shared/http/response';
import { paginate, type PaginatedResponse } from '@/shared/pagination';
import { CreateTurtleDto } from './dto/create-turtle.dto';
import { UpdateTurtleDto } from './dto/update-turtle.dto';
import { Turtle } from './entities/turtle.schema';
import { TURTLE_EVENTS } from './events/turtle.events';
import { TurtleCacheRepository } from './turtle.cache-repository';
import { TurtleRepository, TurtleWritableFields } from './turtle.repository';

@Injectable()
export class TurtleService {
  constructor(
    private readonly turtleRepository: TurtleRepository,
    private readonly turtleCache: TurtleCacheRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createTurtleDto: CreateTurtleDto) {
    const slug = this.buildSlug(createTurtleDto.slug ?? createTurtleDto.name);
    await this.ensureSlugAvailable(slug);
    const payload: TurtleWritableFields = {
      name: createTurtleDto.name,
      species: createTurtleDto.species,
      age: createTurtleDto.age ?? 0,
      slug,
    };
    const created = await this.turtleRepository.create(payload);
    await this.turtleCache.evictList();
    const cacheId = this.resolveCacheId(created);
    await this.turtleCache.setOne(cacheId, created);
    this.eventEmitter.emit(TURTLE_EVENTS.CREATED, {
      id: cacheId,
      name: payload.name,
      slug: payload.slug,
    });
    return created;
  }

  async findAllPaginated(page: number, limit: number): Promise<PaginatedResponse<Turtle>> {
    const { items, totalItems } = await this.turtleRepository.findPaginated(page, limit);
    return paginate(items, totalItems, page, limit);
  }

  async findAll() {
    const cachedTurtles = await this.turtleCache.getList();
    if (cachedTurtles) {
      return cachedTurtles;
    }
    const currentTurtles = await this.turtleRepository.findAll();
    if (currentTurtles.length === 0) {
      return [];
    }
    await this.turtleCache.setList(currentTurtles);
    return currentTurtles;
  }

  async findOne(id: string) {
    const cachedTurtle = await this.turtleCache.getOne(id);
    if (cachedTurtle) {
      return cachedTurtle;
    }
    const currentTurtle = await this.turtleRepository.findById(id);
    if (!currentTurtle) {
      throw this.createNotFoundError();
    }
    await this.turtleCache.setOne(id, currentTurtle);
    return currentTurtle;
  }

  async update(id: string, updateTurtleDto: UpdateTurtleDto) {
    const payload: Partial<TurtleWritableFields> = {};

    if (typeof updateTurtleDto.name === 'string') {
      payload.name = updateTurtleDto.name;
    }

    if (typeof updateTurtleDto.species === 'string') {
      payload.species = updateTurtleDto.species;
    }

    if (typeof updateTurtleDto.age === 'number') {
      payload.age = updateTurtleDto.age;
    }

    if (typeof updateTurtleDto.slug === 'string') {
      payload.slug = this.buildSlug(updateTurtleDto.slug);
    }

    if (payload.slug) {
      await this.ensureSlugAvailable(payload.slug, id);
    }

    const updatedTurtle = await this.turtleRepository.updateById(id, payload);
    if (!updatedTurtle) {
      throw this.createNotFoundError();
    }

    const cacheId = this.resolveCacheId(updatedTurtle, id);
    await this.turtleCache.setOne(cacheId, updatedTurtle);
    await this.turtleCache.evictList();
    this.eventEmitter.emit(TURTLE_EVENTS.UPDATED, { id: cacheId, changes: payload });
    return updatedTurtle;
  }

  async remove(id: string) {
    await this.turtleCache.evictOne(id);
    await this.turtleCache.evictList();
    const result = await this.turtleRepository.softDeleteById(id);
    if (result) {
      this.eventEmitter.emit(TURTLE_EVENTS.DELETED, { id });
    }
    return result;
  }

  private resolveCacheId(entity: { _id?: unknown; id?: string }, fallback?: string) {
    if (entity.id) {
      return entity.id;
    }

    const rawId = entity._id;
    if (typeof rawId === 'string') {
      return rawId;
    }

    if (rawId && typeof (rawId as { toString?: () => string }).toString === 'function') {
      return (rawId as { toString: () => string }).toString();
    }

    return fallback ?? '';
  }

  private async ensureSlugAvailable(slug: string, ignoreId?: string) {
    const existing = await this.turtleRepository.findBySlug(slug);
    if (!existing) {
      return;
    }

    const existingId = this.resolveCacheId(existing);
    if (ignoreId && existingId === ignoreId) {
      return;
    }

    throw new ConflictException({
      message: 'Slug already exists.',
      errorCode: ApiErrorCode.UNIQUE_SLUG,
    });
  }

  private buildSlug(raw?: string) {
    if (!raw) {
      throw new BadRequestException('Slug or name must be provided');
    }

    const normalized = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    if (!normalized) {
      throw new BadRequestException('Slug cannot be empty');
    }

    return normalized;
  }

  private createNotFoundError() {
    return new NotFoundException({
      message: 'Turtle not found.',
      errorCode: ApiErrorCode.NOT_FOUND,
    });
  }
}
