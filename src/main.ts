import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { TransformInterceptor } from './common/transform.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';
// 👇 1. Import cái này vào
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👇 2. CẤU HÌNH VALIDATION (QUAN TRỌNG NHẤT)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động xóa các trường thừa không có trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu gửi trường thừa (Optional)
      transform: true, // Tự động convert data (vd: string '1' -> number 1)
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('FPTU-DPC2-SwaagerAPILists')
    .setDescription('Danh sách API cho hệ thống quản lý Đảng viên FPTU DPC2')
    .setVersion('1.0')
    .addBearerAuth() // Để dùng được Token trên Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors(); // Bật CORS để Frontend gọi được API

  await app.listen(3000);
}
bootstrap();
