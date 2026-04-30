import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { ApiErrorCode } from '@/shared/http';
import { CustomerService } from '../../customer/customer.service';
import { CustomerRole } from '../../customer/entities/customer-role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(CustomerService) private readonly customerService: CustomerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<CustomerRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        message: 'Authorization token not provided',
        errorCode: ApiErrorCode.TOKEN_INVALID,
      });
    }

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid or expired token provided',
        errorCode: ApiErrorCode.TOKEN_EXPIRED,
      });
    }

    const customer = await this.customerService.findById(payload.sub);
    if (!customer) {
      throw new UnauthorizedException({
        message: 'Customer not found',
        errorCode: ApiErrorCode.CUSTOMER_NOT_FOUND,
      });
    }
    if (!customer.isEmailVerified) {
      throw new UnauthorizedException({
        message: 'Email not verified',
        errorCode: ApiErrorCode.EMAIL_NOT_VERIFIED,
      });
    }

    if (requiredRoles?.length) {
      const hasRequiredRole = requiredRoles.some((role) => customer.roles?.includes(role));
      if (!hasRequiredRole) {
        throw new ForbiddenException({
          message: 'Insufficient permissions',
          errorCode: ApiErrorCode.FORBIDDEN,
        });
      }
    }

    request['customer'] = customer;
    return true;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
