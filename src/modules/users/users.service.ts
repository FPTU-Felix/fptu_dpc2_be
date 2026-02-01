import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import {
  GenderEnum,
  PartyMember,
} from '../party-members/entities/party-member.entity';
import { Repository, DataSource } from 'typeorm';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly mailerService: MailerService,
    private dataSource: DataSource,
  ) {}
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
      select: ['id', 'username', 'isActive', 'roleId', 'createdAt'], // Chỉ lấy các cột cần thiết
      relations: ['role'], // Lấy luôn thông tin role liên kết
    });
  }
  async createByAdmin(dto: AdminCreateUserDto) {
    const { username, email, roleId } = dto;

    // 1. Kiểm tra tồn tại
    const existing = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existing)
      throw new BadRequestException('Username hoặc Email đã tồn tại');
    const existingRoleUser = await this.usersRepository.findOne({
      where: { roleId },
    });
    if (existingRoleUser && roleId === 'ADMIN')
      throw new BadRequestException(
        'Đã có người dùng với vai trò ADMIN. Chỉ được phép có 1 ADMIN trong hệ thống.',
      );

    // 2. Tạo mật khẩu tạm
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = this.usersRepository.create({
      username,
      email,
      roleId,
      password: hashedPassword,
      isFirstLogin: true,
    });
    const savedUser = await this.usersRepository.save(user);

    // 4. Thử gửi Email
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Cấp tài khoản Hệ thống Quản lý Đảng viên',
        html: `
          <h3>Tài khoản của đồng chí đã sẵn sàng!</h3>
          <p>Tên đăng nhập: <b>${username}</b></p>
          <p>Mật khẩu tạm thời: <b>${tempPassword}</b></p>
        `,
      });

      return {
        success: true,
        message: 'Tạo tài khoản và gửi email thành công!',
        data: { userId: savedUser.id },
      };
    } catch (error) {
      // Nếu lỗi mail, LOG ra lỗi và trả về thông tin để Admin xử lý tay
      console.error('--- LỖI GỬI MAIL ---');
      console.error(error.message);

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
  // Hàm bổ trợ để "Bấm gửi lại mail"
  async resendWelcomeEmail(userId: string, tempPass: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Không tìm thấy người dùng');

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Gửi lại: Thông tin tài khoản Đảng viên',
      html: `<p>Mật khẩu tạm thời của đồng chí là: <b>${tempPass}</b></p>`,
    });

    return { message: 'Đã gửi lại email thành công!' };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Tìm user kèm theo kiểm tra quyền hạn
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) throw new BadRequestException('Người dùng không tồn tại');
      if (!user.isFirstLogin) {
        throw new BadRequestException('Hồ sơ đã được hoàn thiện trước đó');
      }
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException('Mật khẩu xác nhận không khớp');
      }
      if (dto.newPassword) {
        const salt = await bcrypt.genSalt();
        user.password = await bcrypt.hash(dto.newPassword, salt);
      }
      // 3. Tạo bản ghi PartyMember (Hồ sơ Đảng viên)
      const member = queryRunner.manager.create(PartyMember, {
        ...dto,
        gender: dto.gender as GenderEnum, // Ép kiểu để tránh lỗi TS2769
        user: user, // Gán quan hệ trực tiếp thay vì chỉ gán ID
      });
      await queryRunner.manager.save(member);

      // 4. Cập nhật trạng thái User
      user.isFirstLogin = false;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return {
        message: 'Hoàn thiện hồ sơ và cập nhật mật khẩu thành công!',
        status: 'COMPLETED',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      // Log lỗi chi tiết để dễ debug
      console.error('Lỗi Hoàn thiện hồ sơ:', err.message);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
