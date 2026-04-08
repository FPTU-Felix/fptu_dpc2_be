import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  Body,
  BadRequestException,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from "@nestjs/swagger";

import { FileService } from "./file.service";
import { UploadFile } from "src/common/decorators/file.decorator";
import { CreateFileDto } from "./dto/create-file.dto";
import type { Response } from "express";

@Controller("file")
@ApiTags("file")
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @UploadFile()
  @ApiBody({ type: CreateFileDto })
  async upload(
    @Body() dto: CreateFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.fileService.uploadFile({
      file,
      scope: dto.scope,
    });
  }

  @Get("presigned-url")
  @ApiQuery({ name: "objectName", required: true, type: String })
  @ApiQuery({ name: "expiry", required: false, type: Number })
  async getPresignedUrl(
    @Query("objectName") objectName: string,
    @Query("expiry") expiry?: string,
  ) {
    if (!objectName) {
      throw new BadRequestException("objectName is required");
    }

    return {
      objectName,
      url: await this.fileService.getPresignedUrl(
        objectName,
        expiry ? Number(expiry) : 60 * 60,
      ),
    };
  }

  @Get("open")
  @ApiQuery({ name: "objectName", required: true, type: String })
  @ApiQuery({ name: "expiry", required: false, type: Number })
  async open(
    @Query("objectName") objectName: string,
    @Query("expiry") expiry: string | undefined,
    @Res() res: Response,
  ) {
    if (!objectName) {
      throw new BadRequestException("objectName is required");
    }

    const url = await this.fileService.getPresignedUrl(
      objectName,
      expiry ? Number(expiry) : 60 * 60,
    );

    return res.redirect(url);
  }

  @Get("view")
  @ApiQuery({ name: "objectName", required: true, type: String })
  async view(
    @Query("objectName") objectName: string,
    @Res() res: Response,
  ) {
    if (!objectName) {
      throw new BadRequestException("objectName is required");
    }

    const stat = await this.fileService.statFile(objectName);
    const stream = await this.fileService.getFileStream(objectName);

    res.setHeader(
      "Content-Type",
      stat.metaData?.["content-type"] || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(
        objectName.split("/").pop() || "file",
      )}`,
    );

    stream.pipe(res);
  }

  @Delete()
  @ApiQuery({ name: "objectName", required: true, type: String })
  async delete(@Query("objectName") objectName: string) {
    if (!objectName) {
      throw new BadRequestException("objectName is required");
    }

    await this.fileService.deleteFile(objectName);

    return {
      success: true,
      objectName,
    };
  }
}