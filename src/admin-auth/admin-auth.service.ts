import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginAdminDto } from './dto/login-admin.dto';
import { adminJwtConfig } from '../config/jwt.config';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginAdminDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: (user as any)._id.toString(),
      email: user.email,
      role: user.role,
    };

    // Fix: cast expiresIn to satisfy StringValue type constraint
    const token = this.jwtService.sign(payload, {
      secret: adminJwtConfig.secret,
      expiresIn: adminJwtConfig.expiresIn as any,
    });

    return {
      accessToken: token,
      user: {
        id: (user as any)._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}