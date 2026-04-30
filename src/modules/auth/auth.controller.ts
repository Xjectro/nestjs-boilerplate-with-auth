import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CustomerRole } from '../customer/entities/customer-role.enum';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  ForgotPasswordDto,
  LoginDto,
  LoginVerifyDto,
  RegisterDto,
  RegisterVerifyDto,
  ResetPasswordDto,
  ResetPasswordVerifyDto,
} from './dto';
import { AuthGuard } from './guards/auth.guard';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiUnauthorizedResponse({ description: 'Email not found (EMAIL_NOT_FOUND)' })
  @ApiUnauthorizedResponse({ description: 'Invalid password provided (PASSWORD_INVALID)' })
  public async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiConflictResponse({ description: 'Email already in use (EMAIL_ALREADY_IN_USE)' })
  public async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login-verify-otp-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'OTP verified, access token returned' })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired, or used OTP (OTP_INVALID / OTP_EXPIRED / OTP_ALREADY_USED)',
  })
  public async loginVerify(@Body() loginVerifyDto: LoginVerifyDto) {
    return this.authService.loginVerify(loginVerifyDto);
  }

  @Post('register-verify-otp-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'OTP verified, access token returned' })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired, or used OTP (OTP_INVALID / OTP_EXPIRED / OTP_ALREADY_USED)',
  })
  public async registerVerify(@Body() registerVerifyDto: RegisterVerifyDto) {
    return this.authService.registerVerify(registerVerifyDto);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'OTP code sent to email for password reset' })
  @ApiUnauthorizedResponse({ description: 'Email not found (EMAIL_NOT_FOUND)' })
  public async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('forgot-password-verify-otp-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'OTP verified, you can now reset your password' })
  @ApiUnauthorizedResponse({
    description: 'Invalid, expired, or used OTP (OTP_INVALID / OTP_EXPIRED / OTP_ALREADY_USED)',
  })
  public async forgotPasswordVerify(@Body() resetPasswordVerifyDto: ResetPasswordVerifyDto) {
    return this.authService.forgotPasswordVerify(resetPasswordVerifyDto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Password reset successfully' })
  @ApiUnauthorizedResponse({
    description:
      'Email not found or invalid OTP (EMAIL_NOT_FOUND / OTP_INVALID / OTP_EXPIRED / OTP_ALREADY_USED)',
  })
  public async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @Roles(CustomerRole.CUSTOMER, CustomerRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'User profile retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.customer;
  }
}
