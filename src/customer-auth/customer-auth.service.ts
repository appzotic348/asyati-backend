import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CustomersService } from '../customers/customers.service';
import { CreateCustomerDto } from '../customers/dto/create-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { customerJwtConfig } from '../config/jwt.config';

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: CreateCustomerDto) {
    const customer = await this.customersService.create(dto);
    const token = this.generateToken(
      (customer as any)._id.toString(),
      customer.mobile,
    );

    return {
      accessToken: token,
      customer: {
        id: (customer as any)._id,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
      },
    };
  }

  async login(dto: LoginCustomerDto) {
    const customer = await this.customersService.findByMobile(dto.mobile);
    if (!customer || customer.isDeleted) {
      throw new UnauthorizedException('Invalid mobile or password');
    }

    const isMatch = await bcrypt.compare(dto.password, customer.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid mobile or password');
    }

    const token = this.generateToken(
      (customer as any)._id.toString(),
      customer.mobile,
    );

    return {
      accessToken: token,
      customer: {
        id: (customer as any)._id,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
      },
    };
  }

  private generateToken(id: string, mobile: string): string {
    return this.jwtService.sign(
      { sub: id, mobile },
      {
        secret: customerJwtConfig.secret,
        expiresIn: customerJwtConfig.expiresIn as any,
      },
    );
  }
}