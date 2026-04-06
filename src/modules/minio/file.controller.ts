import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { MinioService } from "./minio.service";
import { UploadPartyDocumentDto } from "./dto/upload-party-document.dto";

@Controller("files")
export class FileController {
  constructor(private readonly minioService: MinioService) { }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadPartyDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException("File không được để trống");
    }

    return this.minioService.uploadFile({
      file,
      folder: body.folder,
      fileName: body.fileName,
      metadata: {
        documentType: body.documentType,

      },
    });
  }
}