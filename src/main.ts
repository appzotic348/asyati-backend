import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { TransformInterceptor } from './common/response/transform.interceptor';
import { configureCloudinary } from './common/cloudinary/cloudinary.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureCloudinary();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('E-Commerce Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'customer-access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT) || 8000;
  await app.listen(port);
  const base = `http://127.0.0.1:${port}`;
  Logger.log(`API     → ${base}`);
  Logger.log(`Swagger → ${base}/docs`);
}
bootstrap();