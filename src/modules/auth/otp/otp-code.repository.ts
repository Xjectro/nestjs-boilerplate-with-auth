import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OtpCode, OtpCodeDocument } from './otp-code.schema';

@Injectable()
export class OtpCodeRepository {
  constructor(@InjectModel(OtpCode.name) private readonly otpCodeModel: Model<OtpCodeDocument>) {}

  public async create(payload: Omit<OtpCode, '_id' | 'id'>) {
    return await this.otpCodeModel.create(payload);
  }

  public async findAll() {
    return await this.otpCodeModel.find().exec();
  }

  public async findById(id: string) {
    return await this.otpCodeModel.findOne({ id }).exec();
  }

  public async findByEmail(email: string) {
    return await this.otpCodeModel.findOne({ email }).exec();
  }

  public async updateById(id: string, payload: Partial<OtpCode>) {
    return await this.otpCodeModel.findOneAndUpdate({ id }, payload, { new: true }).exec();
  }
}
