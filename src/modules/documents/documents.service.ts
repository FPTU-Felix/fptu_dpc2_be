import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException, 
  ConflictException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm'; // <--- Quan trọng nhất ở đây
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
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
    // 1. Kiểm tra file đầu vào
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file tài liệu!');
    }

    // 2. Xử lý Slug (Tránh trùng lặp)
    let generatedSlug = dto.slug || slugify(dto.title, { lower: true, strict: true });
    
    try {
      let count = 1;
      const originalSlug = generatedSlug;
      // Vòng lặp kiểm tra slug trong DB (kể cả những bản ghi đã xóa mềm nếu cần)
      while (await this.documentRepo.findOne({ where: { slug: generatedSlug }, withDeleted: true })) {
        generatedSlug = `${originalSlug}-${count}`;
        count++;
      }
    } catch (error) {
      throw new InternalServerErrorException('Lỗi khi kiểm tra đường dẫn tài liệu (slug)');
    }

    // 3. Tải file lên MinIO (Sử dụng try-catch cho dịch vụ bên thứ 3)
    let uploadResult;
    try {
      uploadResult = await this.minioService.uploadFile({
        file: file,
        folder: 'documents',
      });
    } catch (error) {
      console.error('MinIO Upload Error:', error);
      throw new InternalServerErrorException('Không thể tải file lên hệ thống lưu trữ (MinIO)');
    }

    // 4. Lưu thông tin vào Database
    try {
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
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
    } catch (error) {
      // Nếu lưu DB thất bại, ta nên xóa file vừa up lên MinIO để tránh rác (Optional)
      // await this.minioService.deleteFile(uploadResult.objectName);
      
      if (error.code === '23505') { // Mã lỗi trùng lặp (Unique Violation) trong Postgres
        throw new ConflictException('Đường dẫn (slug) hoặc dữ liệu đã tồn tại');
      }
      throw new InternalServerErrorException('Lỗi khi lưu thông tin tài liệu vào database');
    }
  }

  async findAll() {
    try {
      return await this.documentRepo.find({
        where: { status: 'active' },
        relations: ['category'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Lỗi khi lấy danh sách tài liệu');
    }
  }
async update(id: string, dto: UpdateDocumentDto, file?: Express.Multer.File) {
    const document = await this.findOne(id); // Tự động throw NotFound nếu không thấy

    // 1. Xử lý File mới (nếu có)
    if (file) {
      try {
        // Xóa file cũ trên MinIO để tiết kiệm bộ nhớ
        await this.minioService.deleteFile(document.fileUrl);

        // Upload file mới
        const uploadResult = await this.minioService.uploadFile({
          file: file,
          folder: 'documents',
        });

        document.fileName = uploadResult.fileName;
        document.fileUrl = uploadResult.objectName;
        document.fileType = file.originalname.split('.').pop()?.toLowerCase();
      } catch (error) {
        throw new InternalServerErrorException('Lỗi khi thay thế file trên hệ thống MinIO');
      }
    }

    // 2. Xử lý Slug nếu title thay đổi
    if (dto.title && dto.title !== document.title && !dto.slug) {
      let newSlug = slugify(dto.title, { lower: true, strict: true });
      let count = 1;
      const originalSlug = newSlug;
      
      // Kiểm tra trùng slug (trừ chính nó)
      while (await this.documentRepo.findOne({ 
        where: { slug: newSlug, id: Not(id) as any }, // Cần import Not từ typeorm
        withDeleted: true 
      })) {
        newSlug = `${originalSlug}-${count}`;
        count++;
      }
      document.slug = newSlug;
    } else if (dto.slug) {
      document.slug = dto.slug;
    }

    // 3. Cập nhật các trường khác
    Object.assign(document, dto);

    try {
      return await this.documentRepo.save(document);
    } catch (error) {
      if (error.code === '23505') throw new ConflictException('Slug đã tồn tại');
      throw new InternalServerErrorException('Lỗi khi cập nhật tài liệu database');
    }
  }
  async findOne(id: string) {
    let document;
    try {
      document = await this.documentRepo.findOne({
        where: { id, status: 'active' },
        relations: ['category'],
      });
    } catch (error) {
      throw new BadRequestException('Định dạng ID tài liệu không hợp lệ');
    }

    if (!document) {
      throw new NotFoundException('Không tìm thấy tài liệu hoặc tài liệu đã bị xóa');
    }
    return document;
  }

  async remove(id: string) {
    const document = await this.findOne(id);

    try {
      document.status = 'deleted';
      // Nếu muốn giải phóng slug khi xóa để người sau có thể dùng tên cũ:
      // document.slug = `${document.slug}-deleted-${Date.now()}`;

      await this.documentRepo.save(document);

      return {
        message: 'Xóa tài liệu thành công (Soft Delete)',
        id: id
      };
    } catch (error) {
      throw new InternalServerErrorException('Lỗi khi thực hiện xóa tài liệu');
    }
  }
  // Thêm vào trong class DocumentsService

async download(id: string) {
  const document = await this.findOne(id);

  try {
    // 1. Tăng số lượt tải
    document.downloadCount += 1;
    await this.documentRepo.save(document);

    // 2. Lấy stream từ MinIO 
    // Giả định MinioService của bạn có hàm getFileStream
    const fileStream = await this.minioService.getFileStream(document.fileUrl);

    return {
      stream: fileStream,
      fileName: document.fileName,
      fileType: document.fileType
    };
  } catch (error) {
    throw new InternalServerErrorException('Lỗi khi chuẩn bị tệp tin để tải xuống');
  }
}
}