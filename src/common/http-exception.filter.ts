import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 1. Xác định Status Code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 2. Lấy nội dung lỗi (Message)
    const exceptionResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Xử lý trường hợp message là array (do class-validator trả về) hoặc string
    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse.message
        : exceptionResponse;

    // 3. Trả về format chuẩn (Giống hệt Interceptor)
    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message, // Lấy message đầu tiên nếu là mảng
      data: null, // Lỗi thì data là null
    });
  }
}
