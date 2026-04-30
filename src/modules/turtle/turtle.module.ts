import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Turtle, TurtleSchema } from './entities/turtle.schema';
import { TurtleEventListeners } from './events/turtle.listeners';
import { TurtleCacheRepository } from './turtle.cache-repository';
import { TurtleController } from './turtle.controller';
import { TurtleRepository } from './turtle.repository';
import { TurtleSeeder } from './turtle.seeder';
import { TurtleService } from './turtle.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Turtle.name, schema: TurtleSchema }])],
  controllers: [TurtleController],
  providers: [
    TurtleService,
    TurtleRepository,
    TurtleCacheRepository,
    TurtleEventListeners,
    TurtleSeeder,
  ],
  exports: [TurtleSeeder],
})
export class TurtleModule {}
