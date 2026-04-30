import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import type { EnvConfig } from '@/shared/config';
import { TurtleSeeder } from '@/modules/turtle/turtle.seeder';

async function seed() {
  const logger = new Logger('Seeder');

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: ['log', 'error', 'warn'],
  });

  const config = app.get(ConfigService<EnvConfig, true>);
  logger.log(`Seeding database: ${config.get('MONGODB_URI')}`);

  const turtleSeeder = app.get(TurtleSeeder);
  await turtleSeeder.run();

  logger.log('Seeding completed.');
  await app.close();
}

void seed();
