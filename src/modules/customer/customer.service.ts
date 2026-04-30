import { Inject, Injectable } from '@nestjs/common';
import { CustomerCacheRepository } from './customer.cache-repository';
import { CustomerRepository } from './customer.repository';
import { Customer } from './entities/customer.schema';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(CustomerRepository) private readonly customerRepository: CustomerRepository,
    @Inject(CustomerCacheRepository)
    private readonly customerCacheRepository: CustomerCacheRepository,
  ) {}

  public async findById(id: string) {
    const cached = await this.customerCacheRepository.findById(id);
    if (cached) {
      return cached;
    }

    const customer = await this.customerRepository.findById(id);
    if (customer) {
      await this.customerCacheRepository.save(customer);
    }

    return customer;
  }

  public async findByEmail(email: string) {
    const cached = await this.customerCacheRepository.findByEmail(email);
    if (cached) {
      return cached;
    }

    const customer = await this.customerRepository.findByEmail(email);
    if (customer) {
      await this.customerCacheRepository.save(customer);
    }

    return customer;
  }

  public async create(payload: Omit<Customer, '_id' | 'id'>) {
    const customer = await this.customerRepository.create(payload);
    await this.customerCacheRepository.save(customer);
    return customer;
  }

  public async update(id: string, payload: Partial<Customer>) {
    const customer = await this.customerRepository.updateById(id, payload);
    if (customer) {
      await this.customerCacheRepository.save(customer);
    }
    return customer;
  }
}
