import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException, 
  ConflictException 
} from '@nestjs/common';
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
}