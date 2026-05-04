// src/admin-auth/strategies/admin-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';  // ← add Types
import { User, UserDocument } from '../../users/schemas/user.schema';
import { adminJwtConfig } from '../../config/jwt.config';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: adminJwtConfig.secret,
    });
  }

  async validate(payload: AdminJwtPayload): Promise<UserDocument> {
    // ✅ Fix: explicitly cast sub to ObjectId to avoid silent match failure
    let objectId: Types.ObjectId;
    try {
      objectId = new Types.ObjectId(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userModel.findOne({
      _id: objectId,
      isDeleted: false,
    });

    if (!user) throw new UnauthorizedException('Invalid or expired token');
    return user;
  }
}