import { SetMetadata } from '@nestjs/common';
import { CustomerRole } from '../../customer/entities/customer-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: CustomerRole[]) => SetMetadata(ROLES_KEY, roles);
