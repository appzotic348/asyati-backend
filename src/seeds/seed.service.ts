import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, SUPER_ADMIN_ROLE } from '../users/schemas/user.schema';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin(): Promise<void> {
    const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.SEED_ADMIN_PASSWORD;
    const username = (process.env.SEED_ADMIN_USERNAME ?? 'superadmin').toLowerCase().trim();

    if (!email || !password) {
      this.logger.warn(
        'SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set — skipping super admin seed',
      );
      return;
    }

    const existing = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existing) {
      this.logger.log(`Super admin already exists (${existing.email}) — seed skipped`);
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const created = await this.userModel.create({
      username,
      email,
      password: hashed,
      role: SUPER_ADMIN_ROLE,  
      mobileNumber: null,
      isDeleted: false,
    });

    this.logger.log(`✅ Super admin seeded → ${created.email} (id: ${created._id})`);
  }
}