import { Test, TestingModule } from '@nestjs/testing';
import { HandbooksService } from './handbooks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Handbook } from './entities/handbook.entity';
import { HandbookLink } from './entities/handbook-link.entity';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';
import * as nestjsTypeormPaginate from 'nestjs-typeorm-paginate';

// Mock module phân trang
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('HandbooksService', () => {
  let service: HandbooksService;
  let handbookRepo: Repository<Handbook>;
  let linkRepo: Repository<HandbookLink>;
  let userRepo: Repository<User>;
  let minioService: MinioService;
  let notificationsService: NotificationsService;

  const mockHandbookId = 'handbook-uuid';
  const mockLinkId = 'link-uuid';

  const mockHandbook = {
    id: mockHandbookId,
    title: 'Cẩm nang Đảng viên',
    isActive: true,
    links: [],
  } as Handbook;

  const mockLink = {
    id: mockLinkId,
    title: 'Tài liệu hướng dẫn',
    url: 'handbooks/file.pdf',
    handbook: mockHandbook,
  } as HandbookLink;

  const mockFile = {
    originalname: 'test.pdf',
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandbooksService,
        {
          provide: getRepositoryToken(Handbook),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...mockHandbook, ...dto })),
            save: jest.fn().mockImplementation((handbook) => Promise.resolve(handbook)),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(HandbookLink),
          useValue: {
            create: jest.fn().mockReturnValue(mockLink),
            save: jest.fn().mockResolvedValue(mockLink),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn().mockResolvedValue([{ id: 'user1', email: 'test@gmail.com' }]),
          },
        },
        {
          provide: MinioService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ objectName: 'uploaded/file.pdf' }),
            deleteFile: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createInternal: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HandbooksService>(HandbooksService);
    handbookRepo = module.get<Repository<Handbook>>(getRepositoryToken(Handbook));
    linkRepo = module.get<Repository<HandbookLink>>(getRepositoryToken(HandbookLink));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    minioService = module.get<MinioService>(MinioService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- FIND ALL ---
  describe('findAll', () => {
    it(' nên gọi paginate với filter isActiveOnly', async () => {
      await service.findAll({ page: 1, limit: 10 }, true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(expect.stringContaining('isActive'), expect.any(Object));
      expect(nestjsTypeormPaginate.paginate).toHaveBeenCalled();
    });
  });

  // --- FIND ONE ---
  describe('findOne', () => {
    it(' tìm thấy cẩm nang', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(mockHandbook);
      const result = await service.findOne(mockHandbookId);
      expect(result).toEqual(mockHandbook);
    });

    it(' ném lỗi NotFoundException nếu không tồn tại', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(mockHandbookId)).rejects.toThrow(NotFoundException);
    });
  });

  // --- CREATE ---
  describe('create', () => {
    it(' tạo cẩm nang và bắn thông báo nếu isActive=true', async () => {
      const dto = { title: 'New HB', isActive: true };
      const notifySpy = jest.spyOn(service as any, 'notifyAllUsers');
      
      await service.create(dto as any);
      
      expect(handbookRepo.save).toHaveBeenCalled();
      expect(notifySpy).toHaveBeenCalledWith(dto.title);
    });
  });

  // --- UPDATE ---
  describe('update', () => {
    it(' bắn thông báo khi chuyển trạng thái từ nháp sang công khai (Published)', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue({ ...mockHandbook, isActive: false });
      const notifySpy = jest.spyOn(service as any, 'notifyAllUsers');

      await service.update(mockHandbookId, { isActive: true });

      expect(notifySpy).toHaveBeenCalled();
    });
  });

  // --- REMOVE ---
  describe('remove', () => {
    it(' xóa cẩm nang và dọn dẹp tất cả file trên MinIO', async () => {
      const handbookWithLinks = {
        ...mockHandbook,
        links: [{ url: 'file1.pdf' }, { url: 'file2.pdf' }]
      };
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(handbookWithLinks);

      await service.remove(mockHandbookId);

      expect(minioService.deleteFile).toHaveBeenCalledTimes(2);
      expect(handbookRepo.remove).toHaveBeenCalled();
    });

    it(' xóa cẩm nang không có link đính kèm', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue({ ...mockHandbook, links: [] });
      await service.remove(mockHandbookId);
      expect(minioService.deleteFile).not.toHaveBeenCalled();
    });
  });

  // --- ADD LINK ---
  describe('addLink', () => {
    it(' tải file lên và tạo link mới cho cẩm nang', async () => {
      (handbookRepo.findOne as jest.Mock).mockResolvedValue(mockHandbook);
      
      const result = await service.addLink(mockHandbookId, { title: 'Link 1' }, mockFile);

      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(linkRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        url: 'uploaded/file.pdf'
      }));
      expect(result).toEqual(mockLink);
    });
  });

  // --- UPDATE LINK ---
  describe('updateLink', () => {
    it(' thay thế file cũ khi upload file mới cho link', async () => {
      (linkRepo.findOne as jest.Mock).mockResolvedValue({ ...mockLink, url: 'old-path.pdf' });

      await service.updateLink(mockLinkId, { title: 'New Title' }, mockFile);

      expect(minioService.deleteFile).toHaveBeenCalledWith('old-path.pdf');
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(linkRepo.save).toHaveBeenCalled();
    });
  });

  // --- REMOVE LINK ---
  describe('removeLink', () => {
    it(' xóa link và xóa file tương ứng trên MinIO', async () => {
      (linkRepo.findOne as jest.Mock).mockResolvedValue(mockLink);

      await service.removeLink(mockLinkId);

      expect(minioService.deleteFile).toHaveBeenCalledWith(mockLink.url);
      expect(linkRepo.remove).toHaveBeenCalled();
    });

    it(' ném lỗi nếu không tìm thấy link để xóa', async () => {
      (linkRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.removeLink(mockLinkId)).rejects.toThrow(NotFoundException);
    });
  });

  // --- NOTIFY USERS (Private) ---
  describe('notifyAllUsers', () => {
    it(' gửi thông báo đến tất cả user thành công', async () => {
      await (service as any).notifyAllUsers('Test HB');
      expect(userRepo.find).toHaveBeenCalled();
      expect(notificationsService.createInternal).toHaveBeenCalled();
    });

    it(' handle lỗi nếu quá trình gửi thông báo thất bại', async () => {
      (userRepo.find as jest.Mock).mockRejectedValue(new Error('DB Error'));
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).notifyAllUsers('Test HB');

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Lỗi khi bắn thông báo'));
    });
  });
});