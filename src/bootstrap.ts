import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { ConsoleSeqLogger, SeqLogger } from '@jasonsoft/nestjs-seq';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import type { EnvConfig } from '@/shared/config';
import { GlobalExceptionFilter } from '@/shared/filters/global-exception.filter';
import { LoggingInterceptor } from '@/shared/interceptors/logging.interceptor';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';

type FastifyRegisterPlugin = Parameters<NestFastifyApplication['register']>[0];

export async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  /** Security */
  await app.register(helmet as FastifyRegisterPlugin, { contentSecurityPolicy: false });
  await app.register(multipart as FastifyRegisterPlugin, {
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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Maharet Mantı Bodrum API')
    .setDescription('Maharet Mantı Bodrum backend API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, documentFactory);

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
  const config = app.get(ConfigService<EnvConfig, true>);
  const port = config.get('PORT');
  await app.listen(port, '0.0.0.0');
}
