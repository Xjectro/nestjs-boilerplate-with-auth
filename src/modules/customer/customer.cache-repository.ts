import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { CustomerDocument } from './entities/customer.schema';

@Injectable()
export class CustomerCacheRepository {
  private readonly BY_ID_CACHE_KEY: string = 'customer_{id}';
  private readonly EMAIL_CACHE_KEY: string = 'customer_email_{email}';

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  public async findById(id: string): Promise<CustomerDocument | undefined> {
    return await this.cacheManager.get<CustomerDocument>(this.BY_ID_CACHE_KEY.replace('{id}', id));
  }

  public async findByEmail(email: string): Promise<CustomerDocument | undefined> {
    return await this.cacheManager.get<CustomerDocument>(
      this.EMAIL_CACHE_KEY.replace('{email}', email),
    );
  }

  public async save(customer: CustomerDocument): Promise<void> {
    await this.cacheManager.set(this.BY_ID_CACHE_KEY.replace('{id}', customer.id), customer);
    await this.cacheManager.set(this.EMAIL_CACHE_KEY.replace('{email}', customer.email), customer);
  }

  public async clear(): Promise<void> {
    await this.cacheManager.clear();
  }
}
