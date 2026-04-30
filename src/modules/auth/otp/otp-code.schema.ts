import * as crypto from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Customer } from '@/modules/customer/entities/customer.schema';
import { OtpCodePurpose } from './otp-code-purpose.enum';

export { OtpCodePurpose } from './otp-code-purpose.enum';

@Schema({ timestamps: true, id: false })
export class OtpCode {
  _id!: string;

  @Prop({ type: String, unique: true, default: crypto.randomUUID })
  id!: string;

  @Prop({ required: true, type: String, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, type: String, ref: Customer.name })
  customer!: string;

  @Prop({ required: true, type: String })
  code!: string;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;

  @Prop({ required: true, type: Boolean, default: false })
  used!: boolean;

  @Prop({ required: true, type: String, enum: OtpCodePurpose })
  purpose!: OtpCodePurpose;
}

export type OtpCodeDocument = HydratedDocument<OtpCode>;
export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode);
