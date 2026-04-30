import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Turtle, TurtleDocument } from './entities/turtle.schema';

const SEED_TURTLES = [
  { name: 'Leonardo', species: 'Green Sea Turtle', slug: 'leonardo', age: 15 },
  { name: 'Donatello', species: 'Hawksbill Turtle', slug: 'donatello', age: 15 },
  { name: 'Raphael', species: 'Loggerhead Turtle', slug: 'raphael', age: 15 },
  { name: 'Michelangelo', species: 'Leatherback Turtle', slug: 'michelangelo', age: 13 },
];

@Injectable()
export class TurtleSeeder {
  private readonly logger = new Logger(TurtleSeeder.name);

  constructor(
    @InjectModel(Turtle.name)
    private readonly turtleModel: Model<TurtleDocument>,
  ) {}

  async run() {
    const count = await this.turtleModel.countDocuments();
    if (count > 0) {
      this.logger.log(`Skipping turtle seed — ${count} records already exist.`);
      return;
    }

    await this.turtleModel.insertMany(SEED_TURTLES);
    this.logger.log(`Seeded ${SEED_TURTLES.length} turtles.`);
  }
}
