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

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    // ✅ Sử dụng MailService của SendGrid
    private readonly mailService: MailService,

    private dataSource: DataSource,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    super(usersRepository);
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

    // 4. Gửi Email (Đã cập nhật theo hàm mới)
    try {
      await this.mailService.sendMail(
        email, // To
        'Cấp tài khoản Hệ thống Quản lý Đảng viên', // Subject
        `
          <h3>Tài khoản của đồng chí đã sẵn sàng!</h3>
          <p>Tên đăng nhập: <b>${username}</b></p>
          <p>Mật khẩu tạm thời: <b>${tempPassword}</b></p>
        `, // HTML Content
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

  // Hàm bổ trợ để "Bấm gửi lại mail"
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
      // 1. Tìm user kèm theo kiểm tra quyền hạn
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) throw new BadRequestException('Người dùng không tồn tại');
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException('Mật khẩu xác nhận không khớp');
      }
      if (dto.newPassword) {
        const salt = await bcrypt.genSalt();
        try {
          await bcrypt.hash(dto.newPassword, salt);
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
        // Nếu đã có bản ghi thì không cho tạo nữa, cập nhật luôn isFirstLogin cho đồng bộ
        user.isFirstLogin = false;
        await queryRunner.manager.save(user);
        await queryRunner.commitTransaction();
        throw new BadRequestException(
          'Hồ sơ Đảng viên đã tồn tại trong hệ thống',
        );
      }
      // 3. Tạo bản ghi PartyMember (Hồ sơ Đảng viên)
      const member = queryRunner.manager.create(PartyMember, {
        fullName: dto.fullName,
        gender: dto.gender as GenderEnum,
        dob: dto.dateOfBirth,
        hometown: dto.hometown,
        phone: dto.phone,
        partyCellId: '4dc9d414-0e5d-47dc-828a-e0a249b2b888',
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
    // 1. Lấy partyCellId của người yêu cầu
    const requesterProfile = await this.dataSource
      .getRepository(PartyMember)
      .findOne({
        where: { userId: requesterId },
        select: ['partyCellId'],
      });

    if (!requesterProfile) {
      throw new ForbiddenException('Tài khoản không thuộc Chi bộ nào');
    }

    // 2. Khởi tạo QueryBuilder
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
        'member.fullName',
        'member.gender',
        'member.dateOfBirth',
        'member.hometown',
        'member.phone',
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
    // 1. Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.lastForgotPasswordAt = new Date();
    await this.usersRepository.save(user);

    // 2. Gửi mail (Đã cập nhật)
    try {
      await this.mailService.sendMail(
        user.email,
        'Khôi phục mật khẩu - Hệ thống Đảng viên',
        `
          <p>Đồng chí đã yêu cầu khôi phục mật khẩu.</p>
          <p>Mã xác nhận của đồng chí là: <b>${token}</b></p>
          <p>Mã này có hiệu lực trong 15 phút.</p>
        `,
      );
      return { message: 'Mã khôi phục đã được gửi vào Email của đồng chí' };
    } catch (error) {
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
    console.log('Cập nhật hồ sơ với dữ liệu:', dto);
    console.log('Trước khi cập nhật, hồ sơ hiện tại:', member);
    Object.assign(member, dto);
    return await this.dataSource.getRepository(PartyMember).save(member);
  }
}
