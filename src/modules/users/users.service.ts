import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MailService } from '../mail/mail.service';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { BaseService } from 'src/common/base.service';
import { Role } from '../roles/entities/role.entity';
import { GenderEnum } from 'src/common/enums';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PartyCell } from '../party-cells/entities/party-cell.entity';

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private readonly mailService: MailService,

    private dataSource: DataSource,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    super(usersRepository);
  }

  private validatePassword(password: string) {
    const regex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!regex.test(password)) {
      throw new BadRequestException(
        'Mật khẩu phải có ít nhất 6 ký tự, bao gồm cả chữ cái và số.',
      );
    }
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { username },
      relations: ['role'],
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async findOneByEmailOrUsername(identifier: string) {
    return await this.usersRepository.findOne({
      where: [{ username: identifier }, { email: identifier }],
      relations: ['role'],
    });
  }

  async updateRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      hashedRefreshToken: hashedRefreshToken,
    });
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find({
      select: ['id', 'username', 'isActive', 'roleId', 'createdAt'],
      relations: ['role'],
    });
  }

  async createByAdmin(dto: AdminCreateUserDto) {
    const { username, email, roleName } = dto;

    // 1. Kiểm tra tồn tại
    const existing = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });

    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new BadRequestException(
        `Vai trò "${roleName}" chưa được cấu hình trong hệ thống`,
      );
    }

    if (existing)
      throw new BadRequestException('Username hoặc Email đã tồn tại');

    const existingRoleUser = await this.usersRepository.findOne({
      where: { roleId: role.id },
    });

    if (existingRoleUser && role.name === 'ADMIN')
      throw new BadRequestException(
        'Đã có người dùng với vai trò ADMIN. Chỉ được phép có 1 ADMIN trong hệ thống.',
      );

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = this.usersRepository.create({
      username,
      email,
      roleId: role.id,
      password: hashedPassword,
      isFirstLogin: true,
    });
    const savedUser = await this.usersRepository.save(user);

    // 4. Gửi Email
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #ce0000; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase;">Thông báo cấp tài khoản</h2>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333;">Kính gửi đồng chí,</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Ban Quản trị xin thông báo tài khoản của đồng chí trên <strong>Hệ thống Quản lý Đảng viên</strong> đã được khởi tạo thành công.
            </p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #ce0000; padding: 20px; margin: 25px 0;">
              <p style="margin: 5px 0; font-size: 15px;">
                <strong>Tên đăng nhập:</strong> 
                <span style="color: #333;">${username}</span>
              </p>
              <p style="margin: 15px 0 5px 0; font-size: 15px;">
                <strong>Mật khẩu tạm thời:</strong> 
                <span style="font-size: 18px; color: #ce0000; font-weight: bold; letter-spacing: 1px; background: #fff; padding: 2px 8px; border: 1px dashed #ce0000; border-radius: 4px;">${tempPassword}</span>
              </p>
            </div>

            <p style="font-size: 14px; color: #666; font-style: italic;">
              * Lưu ý: Để bảo mật thông tin, vui lòng đăng nhập và đổi mật khẩu ngay trong lần truy cập đầu tiên.
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="#" style="background-color: #ce0000; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Truy cập Hệ thống</a>
            </div>
          </div>

          <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #888;">
            <p style="margin: 0;">Hệ thống Quản lý Đảng viên - Đại học FPT</p>
            <p style="margin: 5px 0 0 0;">Đây là email tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      `;

      await this.mailService.sendMail(
        email,
        'Thông báo cấp tài khoản - Hệ thống Quản lý Đảng viên',
        htmlContent,
      );

      return {
        success: true,
        message: 'Tạo tài khoản và gửi email thành công!',
        data: { userId: savedUser.id },
      };
    } catch (error) {
      console.error('--- LỖI GỬI MAIL ---');
      console.error(error);

      return {
        success: false,
        message: 'Tài khoản đã được tạo nhưng KHÔNG gửi được email thông báo.',
        instruction:
          'Đồng chí có thể gửi mật khẩu thủ công hoặc bấm nút "Gửi lại mail".',
        data: {
          username: username,
          tempPassword: tempPassword,
          error: error.message,
        },
      };
    }
  }

  async resendWelcomeEmail(userId: string, tempPass: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Không tìm thấy người dùng');

    await this.mailService.sendMail(
      user.email,
      'Gửi lại: Thông tin tài khoản Đảng viên',
      `<p>Mật khẩu tạm thời của đồng chí là: <b>${tempPass}</b></p>`,
    );

    return { message: 'Đã gửi lại email thành công!' };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) throw new BadRequestException('Người dùng không tồn tại');

      if (!user.isFirstLogin) {
        throw new BadRequestException(
          'Hồ sơ đã được hoàn thiện trước đó, không thể chỉnh sửa tại đây',
        );
      }

      if (user.id !== userId) {
        throw new ForbiddenException(
          'Không có quyền chỉnh sửa hồ sơ của người khác',
        );
      }
      if (dto.newPassword) {
        this.validatePassword(dto.newPassword);

        if (dto.newPassword !== dto.confirmPassword) {
          throw new BadRequestException('Mật khẩu xác nhận không khớp');
        }

        const salt = await bcrypt.genSalt();
        try {
          user.password = await bcrypt.hash(dto.newPassword, salt);
        } catch (err) {
          console.error('Lỗi băm mật khẩu:', err);
          throw new BadRequestException('Lỗi xử lý mật khẩu mới');
        }
      }

      const existingMember = await queryRunner.manager.findOne(PartyMember, {
        where: { userId: userId },
      });
      if (existingMember) {
        user.isFirstLogin = false;
        await queryRunner.manager.save(user);
        await queryRunner.commitTransaction();
        throw new BadRequestException(
          'Hồ sơ Đảng viên đã tồn tại trong hệ thống',
        );
      }
      const partyCellExists = await queryRunner.manager.findOne(PartyCell, {
        where: { id: dto.partyCellId },
      });
      if (!partyCellExists) {
        throw new BadRequestException('Chi bộ không tồn tại trong hệ thống');
      }
      const member = queryRunner.manager.create(PartyMember, {
        fullName: dto.fullName,
        gender: dto.gender as GenderEnum,
        dob: dto.dateOfBirth,
        hometown: dto.hometown,
        phone: dto.phone,
        ethnicity: dto.ethnicity,
        religion: dto.religion,
        targetGroup: dto.targetGroup,
        academicLevel: dto.academicLevel,
        politicalTheoryLevel: dto.politicalTheoryLevel,
        partyCellId: dto.partyCellId,
        user: user,
      });
      await queryRunner.manager.save(member);

      user.isFirstLogin = false;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return {
        message: 'Hoàn thiện hồ sơ và cập nhật mật khẩu thành công!',
        status: 'COMPLETED',
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      console.error('Lỗi Hoàn thiện hồ sơ:', err.message);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async paginateMembersByCell(
    requesterId: string,
    options: IPaginationOptions,
  ) {
    const requesterProfile = await this.dataSource
      .getRepository(PartyMember)
      .findOne({
        where: { userId: requesterId },
        select: ['partyCellId'],
      });

    if (!requesterProfile) {
      throw new ForbiddenException('Tài khoản không thuộc Chi bộ nào');
    }

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .innerJoin('user.member', 'member')
      .leftJoin('user.role', 'role')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.isActive',
        'user.createdAt',
        'member.id',
        'member.fullName',
        'member.gender',
        'member.dateOfBirth',
        'member.hometown',
        'member.phone',
        'role.id',
        'role.name',
      ])
      .where('member.partyCellId = :cellId', {
        cellId: requesterProfile.partyCellId,
      })
      .orderBy('user.createdAt', 'DESC');

    return paginate<User>(queryBuilder, options);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (!user)
      throw new BadRequestException('Email không tồn tại trong hệ thống');

    if (user.lastForgotPasswordAt) {
      const secondsPassed = Math.floor(
        (Date.now() - user.lastForgotPasswordAt.getTime()) / 1000,
      );
      if (secondsPassed < 60) {
        throw new BadRequestException(
          `Vui lòng đợi ${60 - secondsPassed} giây nữa để yêu cầu mã mới`,
        );
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.lastForgotPasswordAt = new Date();
    await this.usersRepository.save(user);

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #ce0000; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase;">Yêu cầu khôi phục mật khẩu</h2>
          </div>
          
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333;">Kính gửi đồng chí,</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Hệ thống đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của đồng chí.
            </p>
            <p style="font-size: 15px; color: #555;">Dưới đây là Mã xác nhận (Token) để thực hiện đổi mật khẩu:</p>
            
            <div style="background-color: #f0f0f0; border: 2px dashed #ce0000; padding: 15px; text-align: center; margin: 25px 0; border-radius: 5px;">
              <span style="font-size: 24px; color: #ce0000; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${token}</span>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 5px; font-size: 14px;">
              <strong>⚠️ Lưu ý quan trọng:</strong>
              <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                <li>Mã này có hiệu lực trong vòng <strong>15 phút</strong>.</li>
                <li>Tuyệt đối không chia sẻ mã này cho bất kỳ ai (kể cả quản trị viên).</li>
              </ul>
            </div>
          </div>

          <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #888;">
            <p style="margin: 0;">Ban Quản Trị Hệ thống - Đại học FPT</p>
            <p style="margin: 5px 0 0 0;">Nếu đồng chí không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
        </div>
      `;

      await this.mailService.sendMail(
        user.email,
        'Khôi phục mật khẩu - Hệ thống Đảng viên',
        htmlContent,
      );

      return { message: 'Mã khôi phục đã được gửi vào Email của đồng chí' };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Lỗi gửi mail, vui lòng thử lại sau',
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersRepository.findOne({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user)
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    this.validatePassword(dto.newPassword);
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(dto.newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.usersRepository.save(user);
    return { message: 'Đổi mật khẩu thành công!' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const member = await this.dataSource.getRepository(PartyMember).findOne({
      where: { userId: userId },
    });

    if (!member) {
      throw new NotFoundException(
        'Không tìm thấy thông tin hồ sơ của đồng chí',
      );
    }
    Object.assign(member, dto);
    return await this.dataSource.getRepository(PartyMember).save(member);
  }

  async banUser(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(
        'Không tìm thấy người dùng này trong hệ thống',
      );
    }

    if (user.role?.name === 'ADMIN') {
      throw new BadRequestException(
        'Không thể khóa tài khoản Quản trị viên cấp cao',
      );
    }

    if (!user.isActive) {
      throw new BadRequestException('Tài khoản này đã bị khóa từ trước rồi');
    }

    user.isActive = false;
    await this.usersRepository.save(user);

    return {
      success: true,
      message: `Đã KHÓA tài khoản của đồng chí ${user.username} thành công!`,
    };
  }

  async unbanUser(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        'Không tìm thấy người dùng này trong hệ thống',
      );
    }

    if (user.isActive) {
      throw new BadRequestException(
        'Tài khoản này hiện vẫn đang hoạt động bình thường',
      );
    }

    user.isActive = true;
    await this.usersRepository.save(user);

    return {
      success: true,
      message: `Đã MỞ KHÓA tài khoản của đồng chí ${user.username} thành công!`,
    };
  }

  async getProfile(userId: string) {
    const member = await this.dataSource.getRepository(PartyMember).findOne({
      where: { userId: userId },
      relations: ['user', 'partyCell', 'positions'],
    });

    if (!member) {
      throw new NotFoundException(
        'Không tìm thấy thông tin hồ sơ của đồng chí',
      );
    }

    const currentPosRecord = member.positions?.find(
      (p) => p.isCurrent === true,
    );

    const currentPosition = currentPosRecord
      ? currentPosRecord.positionId
      : 'PARTY_MEMBER';

    return {
      id: member.id,
      userId: member.userId,

      employeeCode: member.user?.username || null,
      email: member.user?.email || null,
      position: currentPosition,
      fullName: member.fullName,
      dob: member.dob,
      gender: member.gender,
      phone: member.phone,
      hometown: member.hometown,
      permanentAddress: member.permanentAddress,
      joinDate: member.joinDate,
      officialDate: member.officialDate,
      partyCardId: member.partyCardId,
      status: member.status,

      ethnicity: member.ethnicity,
      religion: member.religion,
      targetGroup: member.targetGroup,
      academicLevel: member.academicLevel,
      politicalTheoryLevel: member.politicalTheoryLevel,

      partyCell: member.partyCell
        ? {
            id: member.partyCell.id,
            name: member.partyCell.name,
          }
        : null,
    };
  }
}
