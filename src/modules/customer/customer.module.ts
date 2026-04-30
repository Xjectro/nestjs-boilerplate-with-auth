import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerCacheRepository } from './customer.cache-repository';
import { CustomerRepository } from './customer.repository';
import { CustomerService } from './customer.service';
import { Customer, CustomerSchema } from './entities/customer.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }])],
  providers: [CustomerService, CustomerRepository, CustomerCacheRepository],
  exports: [CustomerService],
})
export class CustomerModule {}
