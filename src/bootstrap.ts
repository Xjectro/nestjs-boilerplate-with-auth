import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { ConsoleSeqLogger, SeqLogger } from '@jasonsoft/nestjs-seq';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from '@/app.module';
import { LoggingInterceptor } from '@/integrations/logger/logging.interceptor';
import type { EnvConfig } from '@/shared/config';
import { GlobalExceptionFilter } from '@/shared/filters/global-exception.filter';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';

export async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  /** Security */
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  /** Validation */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /** Swagger */
  const config = app.get(ConfigService<EnvConfig, true>);
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.get('APP_NAME'))
    .setDescription(config.get('APP_DESCRIPTION'))
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  const scalarHandler = apiReference({
    withFastify: true,
    content: document,
    pageTitle: `${config.get('APP_NAME')} - API Reference`,
  });

  app
    .getHttpAdapter()
    .getInstance()
    .get('/docs', (req, reply) => scalarHandler(req, reply.raw));

  /** Error Handling */
  const seqLogger = app.get(SeqLogger);
  app.useGlobalFilters(new GlobalExceptionFilter(seqLogger));

  /** Logging */
  app.useLogger(app.get(ConsoleSeqLogger));

  /** Interceptors */
  app.useGlobalInterceptors(app.get(LoggingInterceptor), app.get(ResponseInterceptor));

  /** Graceful Shutdown */
  app.enableShutdownHooks();

  /** Start */
  const port = config.get('PORT');
  await app.listen(port, '0.0.0.0');
}
