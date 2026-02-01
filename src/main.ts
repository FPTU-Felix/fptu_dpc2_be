import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // Import cái này
import { TransformInterceptor } from './common/transform.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Hệ thống Quản lý Đảng viên API') // Tên dự án của ông
    .setDescription('Danh sách API cho hệ thống quản lý Đảng viên FPTU DPC2')
    .setVersion('1.0')
    .addBearerAuth() // Để dùng được Token trên Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Đường dẫn truy cập: http://localhost:3000/api/docs
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  await app.listen(3000);
  console.log(`Application is running on: http://localhost:3000/api/docs`);
}
bootstrap();
