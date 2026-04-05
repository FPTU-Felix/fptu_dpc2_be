import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { MinioService } from '../minio/minio.service';
import slugify from 'slugify';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly minioService: MinioService,
  ) {}

  async create(dto: CreateDocumentDto, file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file tài liệu!');
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    const generatedSlug = dto.slug || slugify(dto.title, { lower: true, strict: true });

    const uploadResult = await this.minioService.uploadFile({
      file: file,
      folder: 'documents',
    });

    const newDocument = this.documentRepo.create({
      ...dto,
      slug: generatedSlug,
      fileName: uploadResult.fileName,
      fileUrl: uploadResult.objectName,
      fileType: fileExtension,
      uploadedBy: dto.uploadedBy || 'Chi ủy',
      status: 'active',
      downloadCount: 0,
    });

    return await this.documentRepo.save(newDocument);
  }

  async findAll() {
    return await this.documentRepo.find({
      where: { status: 'active' },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const document = await this.documentRepo.findOne({
      where: { 
        id, 
        status: 'active' // Chỉ tìm những tài liệu đang hoạt động
      },
      relations: ['category'],
    });

    if (!document) {
      throw new NotFoundException('Không tìm thấy tài liệu hoặc tài liệu đã bị xóa');
    }
    return document;
  }

  async remove(id: string) {
    // 1. Tìm tài liệu xem có tồn tại không
    const document = await this.findOne(id);

    // 2. Cập nhật trạng thái thành 'deleted'
    document.status = 'deleted';
    
    // Lưu ý: Nếu bạn xóa mềm, thường người ta SẼ KHÔNG xóa file trên MinIO ngay 
    // để có thể khôi phục (Restore). Nếu bạn xóa file MinIO ở đây, 
    // bản ghi 'deleted' trong DB sẽ bị mất file đính kèm.
    /*
    try {
      await this.minioService.deleteFile(document.fileUrl);
    } catch (error) {
      console.error('Lỗi khi xóa file MinIO:', error.message);
    }
    */

    // 3. Lưu lại thay đổi
    await this.documentRepo.save(document);

    return {
      message: 'Xóa tài liệu thành công (Soft Delete)',
      id: id
    };
  }
}