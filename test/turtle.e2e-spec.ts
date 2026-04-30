import helmet from '@fastify/helmet';
import { ConsoleSeqLogger, SeqLogger } from '@jasonsoft/nestjs-seq';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '@/app.module';
import { GlobalExceptionFilter } from '@/shared/filters/global-exception.filter';
import { LoggingInterceptor } from '@/shared/interceptors/logging.interceptor';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';
import { assertErrorPayload, assertSuccessPayload } from './utils/api-assertions';

type TurtleResponse = {
  id: string;
  _id?: string;
  name: string;
  species: string;
  age: number;
  slug: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTurtleResponse = (payload: unknown): payload is TurtleResponse =>
  isPlainObject(payload) &&
  typeof payload.id === 'string' &&
  typeof payload.name === 'string' &&
  typeof payload.species === 'string' &&
  typeof payload.age === 'number' &&
  typeof payload.slug === 'string';

const assertTurtleResponse = (payload: unknown): TurtleResponse => {
  if (!isTurtleResponse(payload)) {
    throw new Error('Turtle payload has an unexpected shape.');
  }
  return payload;
};

const assertTurtleResponseList = (payload: unknown): TurtleResponse[] => {
  if (!Array.isArray(payload) || !payload.every(isTurtleResponse)) {
    throw new Error('Turtle list payload has an unexpected shape.');
  }
  return payload;
};

describe('TurtleController (e2e)', () => {
  let app: NestFastifyApplication;

  const nextIdempotencyKey = (() => {
    let counter = 0;
    return () => `test-idem-${++counter}`;
  })();

  const createTurtle = async (
    overrides: Partial<{ name: string; species: string; age: number; slug: string }> = {},
  ): Promise<TurtleResponse> => {
    const payload = {
      name: 'Leonardo',
      species: 'Green Sea Turtle',
      age: 15,
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post('/turtle')
      .set('sign', nextIdempotencyKey())
      .send(payload)
      .expect(201);

    const envelope = assertSuccessPayload<TurtleResponse>(response.body as unknown);
    return assertTurtleResponse(envelope.data);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.register(helmet, { contentSecurityPolicy: false });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const swaggerConfig = new DocumentBuilder()
      .setTitle('NestJS Boilerplate')
      .setDescription('The NestJS Boilerplate API description')
      .setVersion('1.0')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, documentFactory);

    const seqLogger = app.get(SeqLogger);
    app.useGlobalFilters(new GlobalExceptionFilter(seqLogger));
    app.useLogger(app.get(ConsoleSeqLogger));
    app.useGlobalInterceptors(app.get(LoggingInterceptor), app.get(ResponseInterceptor));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects turtle creation without an idempotency key', async () => {
    await request(app.getHttpServer())
      .post('/turtle')
      .send({ name: 'Raph', species: 'Loggerhead', age: 12 })
      .expect(400)
      .expect((res: Response) => {
        const body = assertErrorPayload(res.body as unknown);
        expect(body.message).toBe('Idempotency key missing');
        expect(body.errorCode).toBe('BAD_REQUEST');
      });
  });

  it('creates a turtle when idempotency key is provided', async () => {
    const payload = { name: 'Mikey', species: 'Box Turtle', age: 13 };

    const response = await request(app.getHttpServer())
      .post('/turtle')
      .set('sign', nextIdempotencyKey())
      .send(payload)
      .expect(201);

    const envelope = assertSuccessPayload<TurtleResponse>(response.body as unknown);
    const turtle = assertTurtleResponse(envelope.data);

    expect(turtle).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: payload.name,
        species: payload.species,
        age: payload.age,
        slug: expect.any(String),
      }),
    );
  });

  it('returns turtles when requesting the list endpoint', async () => {
    await createTurtle({ name: 'Donnie' });
    await createTurtle({ name: 'Raph' });

    const response = await request(app.getHttpServer()).get('/turtle').expect(200);
    const envelope = assertSuccessPayload<TurtleResponse[]>(response.body as unknown);
    const turtles = assertTurtleResponseList(envelope.data);

    expect(turtles.length > 0).toBe(true);
  });

  it('fetches a turtle by id', async () => {
    const turtle = await createTurtle({ name: 'April' });

    const response = await request(app.getHttpServer()).get(`/turtle/${turtle.id}`).expect(200);
    const envelope = assertSuccessPayload<TurtleResponse | null>(response.body as unknown);
    const fetchedTurtle = envelope.data ? assertTurtleResponse(envelope.data) : null;

    expect(fetchedTurtle).toEqual(
      expect.objectContaining({
        id: turtle.id,
        name: 'April',
        species: turtle.species,
        age: turtle.age,
        slug: expect.any(String),
      }),
    );
  });

  it('updates a turtle and returns the fresh entity', async () => {
    const turtle = await createTurtle({ name: 'Casey', species: 'Snapping' });

    const response = await request(app.getHttpServer())
      .patch(`/turtle/${turtle.id}`)
      .send({ name: 'Casey Jones', age: 21 })
      .expect(200);
    const envelope = assertSuccessPayload<TurtleResponse>(response.body as unknown);
    const updatedTurtle = assertTurtleResponse(envelope.data);

    expect(updatedTurtle).toEqual(
      expect.objectContaining({
        id: turtle.id,
        name: 'Casey Jones',
        age: 21,
        slug: expect.any(String),
      }),
    );
  });

  it('rejects duplicate slugs with a clear error code', async () => {
    const slug = 'unique-turtle';
    await createTurtle({ name: 'Alpha', slug });

    await request(app.getHttpServer())
      .post('/turtle')
      .set('sign', nextIdempotencyKey())
      .send({ name: 'Bravo', species: 'Test Species', age: 2, slug })
      .expect(409)
      .expect((res: Response) => {
        const payload = assertErrorPayload(res.body as unknown);
        expect(payload.errorCode).toBe('UNIQUE_SLUG');
        expect(payload.message).toBe('Slug already exists.');
      });
  });

  it('removes a turtle and confirms deletion', async () => {
    const turtle = await createTurtle({ name: 'Slash' });

    await request(app.getHttpServer())
      .delete(`/turtle/${turtle.id}`)
      .expect(200)
      .expect((res: Response) => {
        const envelope = assertSuccessPayload<boolean>(res.body as unknown);
        expect(envelope.data).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/turtle/${turtle.id}`)
      .expect(404)
      .expect((res: Response) => {
        const error = assertErrorPayload(res.body as unknown);
        expect(error.errorCode).toBe('NOT_FOUND');
        expect(error.message).toBe('Turtle not found.');
      });
  });
});
