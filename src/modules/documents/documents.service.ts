import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { MinioService } from '../minio/minio.service'; // Giả định bạn đã có MinioService

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly minioService: MinioService,
  ) {}

  async create(dto: CreateDocumentDto, file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file tài liệu để tải lên!');
    }

    // 1. Upload file lên MinIO
    const uploadResult = await this.minioService.uploadFile({
      file: file,
      folder: 'documents',
    });

    // 2. Xác định người đăng (uploadedBy)
    // Ưu tiên 1: Giá trị từ DTO gửi lên
    // Ưu tiên 2: Tên của User (nếu bạn có logic lấy tên từ userId)
    // Ưu tiên 3: Mặc định là 'Chi ủy'
    const creator = dto.uploadedBy || 'Chi ủy'; 

    // 3. Lưu vào Database
    const newDocument = this.documentRepo.create({
      ...dto,
      fileName: uploadResult.fileName,
      fileUrl: uploadResult.objectName,
      uploadedBy: creator,
      // Nếu entity có thêm trường creatorId thì gán: creatorId: userId
    });

    return await this.documentRepo.save(newDocument);
  }

  async findAll() {
    return await this.documentRepo.find({
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const document = await this.documentRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu');
    return document;
  }

  async remove(id: string) {
    const document = await this.findOne(id);
    
    // Xóa file trên MinIO để tránh rác server
    try {
      await this.minioService.deleteFile(document.fileUrl);
    } catch (error) {
      console.error('Lỗi khi xóa file trên MinIO:', error.message);
    }

    return await this.documentRepo.remove(document);
  }
}