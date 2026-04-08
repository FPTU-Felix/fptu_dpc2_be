import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { throwError } from "rxjs";
import { ALLOW_MIME_TYPES, compressFile } from "src/modules/file/common/constant";

@Injectable()
export class FileTypeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Express.Request>();

    if (!req.file) {
      return next.handle().pipe(() =>
        throwError(() => new BadRequestException("error-file-not-found"))
      );
    }

    const { buffer, fileType } = await compressFile(req.file.buffer);

    const isAllowedMime =
      fileType?.ext === "cfb" ||
      ALLOW_MIME_TYPES.data.some((m) => m.type === fileType?.mime);

    if (!isAllowedMime) {
      return next.handle().pipe(() =>
        throwError(
          () =>
            new BadRequestException({
              message: "error-file-invalid-mimetype",
              mime: fileType?.mime,
            })
        )
      );
    }

    // Update request file info
    req.file.buffer = buffer;
    req.file.size = buffer.byteLength;
    req.file.mimetype = fileType?.mime || req.file.mimetype;

    return next.handle();
  }
}