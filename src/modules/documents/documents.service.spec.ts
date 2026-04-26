import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { Repository } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Readable } from 'stream';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repo: Repository<Document>;
  let minioService: MinioService;

  const mockId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = 'user-uuid';

  const mockDocument = {
    id: mockId,
    title: 'Tài liệu hướng dẫn',
    slug: 'tai-lieu-huong-dan',
    fileUrl: 'documents/file.pdf',
    fileName: 'file.pdf',
    status: 'active',
    downloadCount: 0,
    categoryId: 'old-cat-uuid',
    category: { id: 'old-cat-uuid', name: 'Old Category' },
  } as any;

  const mockFile = {
    originalname: 'test.pdf',
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            create: jest.fn().mockReturnValue(mockDocument),
            save: jest.fn().mockImplementation((doc) => Promise.resolve(doc)),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({
              objectName: 'documents/uploaded.pdf',
              fileName: 'uploaded.pdf',
            }),
            deleteFile: jest.fn().mockResolvedValue(true),
            getFileStream: jest.fn().mockResolvedValue(new Readable()),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    repo = module.get<Repository<Document>>(getRepositoryToken(Document));
    minioService = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- FIND ALL ---
  describe('findAll', () => {
    it(' nên trả về danh sách tài liệu active kèm category', async () => {
      const mockList = [mockDocument];
      (repo.find as jest.Mock).mockResolvedValue(mockList);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: { status: 'active' },
        relations: ['category'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockList);
    });

    it(' nên trả về mảng rỗng nếu không có tài liệu nào', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it(' nên ném lỗi InternalServerErrorException nếu DB query thất bại', async () => {
      (repo.find as jest.Mock).mockRejectedValue(
        new Error('DB connection error'),
      );
      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // --- CREATE ---
  describe('create', () => {
    const createDto = { title: 'Tài liệu hướng dẫn', categoryId: 'cat-uuid' };

    it(' nên tạo tài liệu thành công', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.create(
        createDto as any,
        mockFile,
        mockUserId,
      );

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it(' nên ném lỗi BadRequest nếu không có file', async () => {
      await expect(
        service.create(createDto as any, null, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it(' xử lý trùng slug (loop logic)', async () => {
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce({ id: '2' })
        .mockResolvedValueOnce(null);

      await service.create(createDto as any, mockFile, mockUserId);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'tai-lieu-huong-dan-2',
        }),
      );
    });

    it(' nên ném lỗi nếu MinIO upload thất bại', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      (minioService.uploadFile as jest.Mock).mockRejectedValue(
        new Error('MinIO Down'),
      );

      await expect(
        service.create(createDto as any, mockFile, mockUserId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // --- FIND ONE ---
  describe('findOne', () => {
    it(' tìm thấy tài liệu đang hoạt động', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockDocument);
      const result = await service.findOne(mockId);
      expect(result).toEqual(mockDocument);
    });

    it(' ném lỗi NotFound nếu tài liệu bị xóa hoặc không tồn tại', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(mockId)).rejects.toThrow(NotFoundException);
    });

    it(' ném lỗi BadRequest nếu định dạng ID sai', async () => {
      (repo.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // --- UPDATE ---
  describe('update', () => {
    const updateDto = { title: 'Tiêu đề mới', categoryId: 'new-cat-uuid' };

    it(' cập nhật tài liệu kèm file mới (xóa file cũ)', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });

      await service.update(mockId, updateDto, mockFile);

      expect(minioService.deleteFile).toHaveBeenCalledWith(
        mockDocument.fileUrl,
      );
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it(' nên ngắt kết nối relation cũ khi đổi categoryId', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });

      await service.update(mockId, { categoryId: 'new-cat-uuid' }, null);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'new-cat-uuid',
          category: null,
        }),
      );
    });

    it(' cập nhật thông tin nhưng không thay đổi file', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });

      await service.update(mockId, updateDto, null);

      expect(minioService.uploadFile).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'new-cat-uuid',
        }),
      );
    });
  });

  // --- REMOVE (Soft Delete) ---
  describe('remove', () => {
    it(' chuyển status sang deleted', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });

      const result = await service.remove(mockId);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'deleted',
        }),
      );
      expect(result.message).toContain('Xóa tài liệu thành công');
    });
  });

  // --- DOWNLOAD ---
  describe('download', () => {
    it(' tăng downloadCount và trả về stream', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });

      const result = await service.download(mockId);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadCount: 1,
        }),
      );
      expect(minioService.getFileStream).toHaveBeenCalled();
      expect(result).toHaveProperty('stream');
      expect(result.fileName).toBe(mockDocument.fileName);
    });

    it(' ném lỗi nếu MinIO không thể cung cấp stream', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });
      (minioService.getFileStream as jest.Mock).mockRejectedValue(
        new Error('Stream Error'),
      );

      await expect(service.download(mockId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
