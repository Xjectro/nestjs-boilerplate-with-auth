import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './entities/customer.schema';

@Injectable()
export class CustomerRepository {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
  ) {}

  public async create(payload: Omit<Customer, '_id' | 'id'>) {
    return await this.customerModel.create(payload);
  }

  public async findAll() {
    return await this.customerModel.find().exec();
  }

  public async findById(id: string) {
    return await this.customerModel.findOne({ id }).exec();
  }

  public async findByEmail(email: string) {
    return await this.customerModel.findOne({ email }).exec();
  }

  public async updateById(id: string, payload: Partial<Customer>) {
    return await this.customerModel.findOneAndUpdate({ id }, payload, { new: true }).exec();
  }
}
