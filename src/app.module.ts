import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { CustomersModule } from './customers/customers.module';
import { CustomerAuthModule } from './customer-auth/customer-auth.module';
import { SeedModule } from './seeds/seed.module';
import { RoutesModule } from './routes/routes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AdminAuthModule,
    UsersModule,
    CustomerAuthModule,
    CustomersModule,
    SeedModule,
    RoutesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}