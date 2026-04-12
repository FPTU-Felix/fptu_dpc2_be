import { applyDecorators, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileTypeInterceptor } from "../interceptor/file-type.interceptor";

export const UploadFile = () =>
    applyDecorators(
        UseInterceptors(FileInterceptor("file")),
        UseInterceptors(FileTypeInterceptor),
    );
