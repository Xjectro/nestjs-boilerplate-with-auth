import * as crypto from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { softDeletePlugin } from '@/shared/database';
import { CustomerRole } from './customer-role.enum';

@Schema({ timestamps: true, id: false })
export class Customer {
  _id!: string;

  @Prop({ type: String, unique: true, default: crypto.randomUUID })
  id!: string;

  @Prop({ required: true, type: String, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, type: String })
  firstName!: string;

  @Prop({ required: true, type: String })
  lastName!: string;

  @Prop({ required: true, type: String })
  passwordHash!: string;

  @Prop({ required: true, type: Boolean, default: false })
  isEmailVerified!: boolean;

  @Prop({ required: true, type: [String], enum: CustomerRole, default: [CustomerRole.CUSTOMER] })
  roles!: CustomerRole[];
}

export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.plugin(softDeletePlugin);
