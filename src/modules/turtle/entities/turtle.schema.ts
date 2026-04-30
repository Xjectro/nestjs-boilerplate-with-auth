import * as crypto from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { softDeletePlugin, type SoftDeleteDocument } from '@/shared/database';

@Schema({ timestamps: true, id: false })
export class Turtle {
  _id!: string;

  @Prop({ type: String, unique: true, default: crypto.randomUUID })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  species!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ default: 0 })
  age!: number;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  createdAt?: Date;

  updatedAt?: Date;
}

export type TurtleDocument = HydratedDocument<Turtle & SoftDeleteDocument>;
export const TurtleSchema = SchemaFactory.createForClass(Turtle);
TurtleSchema.plugin(softDeletePlugin);
