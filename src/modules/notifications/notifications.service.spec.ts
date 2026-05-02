import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { MailService } from '../mail/mail.service';
import { Repository } from 'typeorm';
import { NotificationType } from 'src/common/enums';
import { NotFoundException, Logger } from '@nestjs/common';
import * as paginateModule from 'nestjs-typeorm-paginate';

// Mock thư viện phân trang
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: Repository<Notification>;
  let mailService: MailService;

  const mockNotification = {
    id: 'noti-uuid',
    recipientId: 'user-uuid',
    title: 'Test Title',
    content: 'Test Content',
    type: NotificationType.MEETING,
    isRead: false,
  };

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    })),
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepo,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    mailService = module.get<MailService>(MailService);

    // Xóa các vết gọi hàm cũ
    jest.clearAllMocks();
  });

  describe('createInternal', () => {
    it(' Tạo thông báo thành công và KHÔNG gửi mail nếu không có email', async () => {
      mockRepo.create.mockReturnValue(mockNotification);
      mockRepo.save.mockResolvedValue(mockNotification);

      const result = await service.createInternal(
        'user-uuid',
        'Title',
        'Content',
        NotificationType.MEETING,
      );

      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it(' Tạo thông báo và gửi mail thành công', async () => {
      mockRepo.create.mockReturnValue(mockNotification);
      mockRepo.save.mockResolvedValue(mockNotification);

      await service.createInternal(
        'user-uuid',
        'Title',
        'Content',
        NotificationType.MEETING,
        'user@example.com',
      );

      expect(mailService.sendMail).toHaveBeenCalled();
    });

    it(' MailService lỗi không làm crash luồng chính', async () => {
      mockRepo.create.mockReturnValue(mockNotification);
      mockRepo.save.mockResolvedValue(mockNotification);
      // Giả lập gửi mail lỗi
      mailService.sendMail.mockReturnValue(Promise.reject('SMTP Error'));

      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      const result = await service.createInternal(
        'user-uuid',
        'Title',
        'Content',
        NotificationType.MEETING,
        'user@example.com',
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(result).toBeDefined();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it(' Trả về danh sách phân trang (không lọc isRead)', async () => {
      const options = { page: 1, limit: 10 };
      const expectedResult = { items: [mockNotification], meta: {} };
      (paginateModule.paginate as jest.Mock).mockResolvedValue(expectedResult);

      const result = await service.getUserNotifications('user-uuid', options);

      expect(result).toEqual(expectedResult);
      expect(mockRepo.createQueryBuilder().andWhere).not.toHaveBeenCalled();
    });

    it(' Có áp dụng lọc isRead khi truyền vào', async () => {
      const options = { page: 1, limit: 10 };
      await service.getUserNotifications('user-uuid', options, false);

      const qb = (mockRepo.createQueryBuilder as jest.Mock).mock.results[0]
        .value;
      expect(qb.andWhere).toHaveBeenCalledWith('noti.is_read = :isRead', {
        isRead: false,
      });
    });
  });

  describe('findOne', () => {
    it(' Tìm thấy thông báo và tự động đánh dấu ĐÃ ĐỌC', async () => {
      const unreadNoti = { ...mockNotification, isRead: false };
      mockRepo.findOne.mockResolvedValue(unreadNoti);

      const result = await service.findOne('noti-uuid', 'user-uuid');

      expect(unreadNoti.isRead).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(unreadNoti);
      expect(result.isRead).toBe(true);
    });

    it(' Nếu đã đọc rồi thì không gọi hàm save lại', async () => {
      const readNoti = { ...mockNotification, isRead: true };
      mockRepo.findOne.mockResolvedValue(readNoti);

      await service.findOne('noti-uuid', 'user-uuid');

      expect(repo.save).not.toHaveBeenCalled();
    });

    it(' Ném lỗi NotFoundException khi không tìm thấy', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('wrong-id', 'user-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
