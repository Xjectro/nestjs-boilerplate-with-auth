import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomerCacheRepository } from '../customer.cache-repository';
import { CustomerRepository } from '../customer.repository';
import { CustomerService } from '../customer.service';
import { CustomerRole } from '../entities/customer-role.enum';

type TestCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  roles: CustomerRole[];
  isEmailVerified: boolean;
};

const mockCustomer: TestCustomer = {
  id: 'customer-id-1',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  passwordHash: '$2b$10$hashedpassword',
  roles: [CustomerRole.CUSTOMER],
  isEmailVerified: true,
};

const mockCustomerRepository = {
  findById: jest.fn<any>(),
  findByEmail: jest.fn<any>(),
  create: jest.fn<any>(),
  updateById: jest.fn<any>(),
};

const mockCustomerCacheRepository = {
  findById: jest.fn<any>().mockResolvedValue(undefined),
  findByEmail: jest.fn<any>().mockResolvedValue(undefined),
  save: jest.fn<any>().mockResolvedValue(undefined),
};

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: CustomerRepository, useValue: mockCustomerRepository },
        { provide: CustomerCacheRepository, useValue: mockCustomerCacheRepository },
      ],
    }).compile();

    service = module.get(CustomerService);
  });

  describe('findById', () => {
    it('returns cached customer when available', async () => {
      mockCustomerCacheRepository.findById.mockResolvedValueOnce(mockCustomer);

      const result = await service.findById(mockCustomer.id);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepository.findById).not.toHaveBeenCalled();
    });

    it('fetches from repository and caches when not in cache', async () => {
      mockCustomerCacheRepository.findById.mockResolvedValueOnce(undefined);
      mockCustomerRepository.findById.mockResolvedValueOnce(mockCustomer);

      const result = await service.findById(mockCustomer.id);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepository.findById).toHaveBeenCalledWith(mockCustomer.id);
      expect(mockCustomerCacheRepository.save).toHaveBeenCalledWith(mockCustomer);
    });

    it('returns null when customer does not exist', async () => {
      mockCustomerCacheRepository.findById.mockResolvedValueOnce(undefined);
      mockCustomerRepository.findById.mockResolvedValueOnce(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
      expect(mockCustomerCacheRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('returns cached customer when available', async () => {
      mockCustomerCacheRepository.findByEmail.mockResolvedValueOnce(mockCustomer);

      const result = await service.findByEmail(mockCustomer.email);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('fetches from repository and caches when not in cache', async () => {
      mockCustomerCacheRepository.findByEmail.mockResolvedValueOnce(undefined);
      mockCustomerRepository.findByEmail.mockResolvedValueOnce(mockCustomer);

      const result = await service.findByEmail(mockCustomer.email);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepository.findByEmail).toHaveBeenCalledWith(mockCustomer.email);
      expect(mockCustomerCacheRepository.save).toHaveBeenCalledWith(mockCustomer);
    });
  });

  describe('create', () => {
    it('creates a customer and caches it', async () => {
      const payload = {
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        passwordHash: 'hashed',
        roles: [CustomerRole.CUSTOMER],
        isEmailVerified: false,
      };
      mockCustomerRepository.create.mockResolvedValueOnce({ id: 'new-id', ...payload });

      const result = await service.create(payload);

      expect(mockCustomerRepository.create).toHaveBeenCalledWith(payload);
      expect(mockCustomerCacheRepository.save).toHaveBeenCalledWith({ id: 'new-id', ...payload });
      expect(result).toMatchObject({ id: 'new-id' });
    });
  });

  describe('update', () => {
    it('updates a customer and refreshes cache', async () => {
      const updated = { ...mockCustomer, firstName: 'Updated' };
      mockCustomerRepository.updateById.mockResolvedValueOnce(updated);

      const result = await service.update(mockCustomer.id, { firstName: 'Updated' });

      expect(mockCustomerRepository.updateById).toHaveBeenCalledWith(mockCustomer.id, {
        firstName: 'Updated',
      });
      expect(mockCustomerCacheRepository.save).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updated);
    });
  });
});
