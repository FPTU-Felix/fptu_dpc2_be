import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdmissionApplicationService } from './admission-application.service';
import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from '../entities/party-admission-step-submission.entity';
import { PartyAdmissionStepReviewEntity } from '../entities/party-admission-step-review.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { DataSource } from 'typeorm';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionDocumentType } from '../enum/admission-document-type.enum';

describe('AdmissionApplicationService (Utils & Private Methods)', () => {
  let service: AdmissionApplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionApplicationService,
        {
          provide: getRepositoryToken(PartyAdmissionApplicationEntity),
          useValue: {},
        },
        { provide: getRepositoryToken(PartyAdmissionStepEntity), useValue: {} },
        {
          provide: getRepositoryToken(PartyAdmissionStepSubmissionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepReviewEntity),
          useValue: {},
        },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Role), useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<AdmissionApplicationService>(
      AdmissionApplicationService,
    );
  });

  // --- Test Group: generateApplicationCode ---
  describe('generateApplicationCode', () => {
    it(' Mã hồ sơ phải đúng định dạng PADM-YYYYMMDD-SUFFIX', () => {
      const code = (service as any).generateApplicationCode();
      const today = new Date();
      const datePart = today.getFullYear().toString(); // Kiểm tra năm

      expect(code).toMatch(/^PADM-\d{8}-[A-Z0-9]{8}$/);
      expect(code).toContain(datePart);
    });
  });

  // --- Test Group: getRoleName ---
  describe('getRoleName', () => {
    it(' Phải lấy được roleName từ nhiều cấu trúc User khác nhau', () => {
      const userWithDirectRole = { sub: '1', roleName: 'QCUT' };
      const userWithObjectRole = { sub: '2', role: { name: 'ADMIN' } };
      const userWithStringRole = { sub: '3', role: 'USER' };

      expect((service as any).getRoleName(userWithDirectRole)).toBe('QCUT');
      expect((service as any).getRoleName(userWithObjectRole)).toBe('ADMIN');
      expect((service as any).getRoleName(userWithStringRole)).toBe('USER');
    });

    it(' Trả về undefined nếu không có thông tin role', () => {
      expect((service as any).getRoleName({ sub: '4' })).toBeUndefined();
    });
  });

  // --- Test Group: getRequiredDocumentTypesForStep ---
  describe('getRequiredDocumentTypesForStep', () => {
    it(' Trả về đúng danh sách giấy tờ cho bước APPLICATION', () => {
      const docs = (service as any).getRequiredDocumentTypesForStep(
        AdmissionWorkflowStep.APPLICATION,
      );
      expect(docs).toContain(AdmissionDocumentType.DON_XIN_VAO_DANG);
      expect(docs).toContain(AdmissionDocumentType.LY_LICH_NGUOI_XIN_VAO_DANG);
      expect(docs.length).toBe(4);
    });

    it(' Bước không yêu cầu giấy tờ phải trả về mảng rỗng', () => {
      const docs = (service as any).getRequiredDocumentTypesForStep(
        AdmissionWorkflowStep.CHI_UY_REVIEW,
      );
      expect(docs).toEqual([]);
    });
  });

  // --- Test Group: validateRequiredDocumentsFromFormData ---
  describe('validateRequiredDocumentsFromFormData', () => {
    it(' Throw BadRequestException nếu thiếu giấy tờ bắt buộc', () => {
      const incompleteFormData = {
        [AdmissionDocumentType.DON_XIN_VAO_DANG]: 'file_url',
        // Thiếu Ly lich, Giay gioi thieu...
      };

      expect(() =>
        (service as any).validateRequiredDocumentsFromFormData(
          AdmissionWorkflowStep.APPLICATION,
          incompleteFormData,
        ),
      ).toThrow(BadRequestException);
    });

    it(' Không throw lỗi nếu đã cung cấp đủ giấy tờ', () => {
      const fullFormData = {
        [AdmissionDocumentType.DON_XIN_VAO_DANG]: 'url',
        [AdmissionDocumentType.LY_LICH_NGUOI_XIN_VAO_DANG]: 'url',
        [AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_1]: 'url',
        [AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_2]: 'url',
      };

      expect(() =>
        (service as any).validateRequiredDocumentsFromFormData(
          AdmissionWorkflowStep.APPLICATION,
          fullFormData,
        ),
      ).not.toThrow();
    });
  });

  // --- Test Group: Mapping Methods ---
  describe('Mapping Methods', () => {
    it(' mapUserSummary nên ẩn các thông tin nhạy cảm và giữ lại các field cần thiết', () => {
      const rawUser = {
        id: 'u1',
        username: 'anhvu',
        password: 'secret_password', // Field này không nên có trong DTO
        email: 'vu@example.com',
        role: { id: 'r1', name: 'QCUT' },
      };

      const result = (service as any).mapUserSummary(rawUser);

      expect(result.id).toBe('u1');
      expect(result.username).toBe('anhvu');
      expect(result).not.toHaveProperty('password');
      expect(result.role.name).toBe('QCUT');
    });
  });

  // --- Test Group: Role Validations ---
  describe('Role Validations', () => {
    it(' validateQcutRole nên throw ForbiddenException nếu sai role', () => {
      const user = { sub: 'u1', roleName: 'SECRETARY' };
      expect(() => (service as any).validateQcutRole(user)).toThrow(
        ForbiddenException,
      );
    });

    it(' validateQcutRole không throw lỗi nếu là QCUT hoặc OUTSTANDING_INDIVIDUAL', () => {
      const user = { sub: 'u1', roleName: 'OUTSTANDING_INDIVIDUAL' };
      expect(() => (service as any).validateQcutRole(user)).not.toThrow();
    });
  });
});
