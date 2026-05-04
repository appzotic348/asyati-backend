import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { customerJwtConfig } from '../../config/jwt.config';

export interface CustomerJwtPayload {
  sub: string;
  mobile: string;
}

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: customerJwtConfig.secret,
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<CustomerDocument> {
    const customer = await this.customerModel.findOne({
      _id: payload.sub,
      isDeleted: false,
    });
    if (!customer) throw new UnauthorizedException('Invalid or expired token');
    return customer;
  }
}