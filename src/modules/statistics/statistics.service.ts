import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { SystemLog } from '../system/entities/system-log.entity';
import {
  ExportAuditLogQueryDto,
  ExportFeeQueryDto,
  ExportFluctuationQueryDto,
  ExportMeetingQueryDto,
  ExportPartyMemberQueryDto,
  ExportReportQueryDto,
  ExportAssessmentQueryDto,
  // Đã import từ file DTO như m yêu cầu
  RawMeetingAttendance,
  RawStatusStat,
  RawGenderStat,
  RawMonthlyFee,
} from './dto/export-audit-logs.dto';
import { PartyMember } from '../party-members/entities/party-member.entity';
import {
  AssessmentStatus,
  AttendeeStatus,
  GenderEnum,
  MemberStatusEnum,
  AssessmentRank,
} from 'src/common/enums';
import { Commendation } from '../commendations/entities/commendation.entity';
import { Discipline } from '../disciplines/entities/discipline.entity';
import { AnnualAssessment } from '../annual-assessments/entities/annual-assessment.entity';
import { PartyFee } from '../party-fees/entities/party-fee.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(SystemLog)
    private logRepo: Repository<SystemLog>,
    @InjectRepository(PartyMember)
    private memberRepo: Repository<PartyMember>,
    @InjectRepository(Commendation)
    private commendationRepo: Repository<Commendation>,
    @InjectRepository(Discipline)
    private disciplineRepo: Repository<Discipline>,
    @InjectRepository(AnnualAssessment)
    private assessmentRepo: Repository<AnnualAssessment>,
    @InjectRepository(PartyFee)
    private feeRepo: Repository<PartyFee>,
  ) {}

  // --- HÀM HELPER (Private) ---

  private mapMemberStatus(status: MemberStatusEnum): string {
    switch (status) {
      case MemberStatusEnum.OFFICIAL:
        return 'Chính thức';
      case MemberStatusEnum.RESERVE:
        return 'Dự bị';
      case MemberStatusEnum.POTENTIAL:
        return 'Cảm tình Đảng';
      case MemberStatusEnum.MASSES:
        return 'Quần chúng';
      default:
        return 'Khác';
    }
  }

  private mapRankToVietnamese(rank: AssessmentRank): string {
    switch (rank) {
      case AssessmentRank.EXCELLENT:
        return 'Hoàn thành xuất sắc nhiệm vụ';
      case AssessmentRank.GOOD:
        return 'Hoàn thành tốt nhiệm vụ';
      case AssessmentRank.AVERAGE:
        return 'Hoàn thành nhiệm vụ';
      case AssessmentRank.POOR:
        return 'Không hoàn thành nhiệm vụ';
      default:
        return 'Chưa xếp loại';
    }
  }

  private getDateRange(year: number, quarter?: number) {
    let start: Date, end: Date;
    if (quarter && quarter >= 1 && quarter <= 4) {
      start = new Date(year, (quarter - 1) * 3, 1);
      end = new Date(year, quarter * 3, 0, 23, 59, 59);
    } else {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59);
    }
    return Between(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
    );
  }

  private async sendExcelResponse(
    res: Response,
    workbook: ExcelJS.Workbook,
    fileName: string,
  ) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${fileName}_${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  // --- CÁC HÀM EXPORT CHI TIẾT ---

  async exportAuditLogs(res: Response, query: ExportAuditLogQueryDto) {
    const { startDate, endDate, actionType } = query;
    const where: FindOptionsWhere<SystemLog> = {};
    if (startDate && endDate) {
      where.createdAt = Between(
        new Date(startDate),
        new Date(new Date(endDate).setHours(23, 59, 59)),
      );
    }
    if (actionType) where.actionType = actionType;

    const logs: SystemLog[] = await this.logRepo.find({
      where,
      relations: ['actor'],
      order: { createdAt: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');
    worksheet.columns = [
      { header: 'STT', key: 'no', width: 10 },
      { header: 'Thời gian', key: 'createdAt', width: 25 },
      { header: 'Người thực hiện', key: 'actor', width: 25 },
      { header: 'Hành động', key: 'action', width: 20 },
      { header: 'Bảng', key: 'entity', width: 20 },
      { header: 'Chi tiết', key: 'details', width: 50 },
      { header: 'IP', key: 'ip', width: 15 },
    ];
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' },
    };

    logs.forEach((log: SystemLog, index) => {
      worksheet.addRow({
        no: index + 1,
        createdAt: log.createdAt.toLocaleString('vi-VN'),
        actor: log.actor?.username || 'Hệ thống',
        action: log.actionType,
        entity: log.entityName,
        details: JSON.stringify(log.details),
        ip: log.ipAddress,
      });
    });
    await this.sendExcelResponse(res, workbook, 'Audit_Logs');
  }

  async exportPartyMembers(res: Response, query: ExportPartyMemberQueryDto) {
    const { partyCellId } = query;
    const where: FindOptionsWhere<PartyMember> = {};
    if (partyCellId) where.partyCellId = partyCellId;

    const members: PartyMember[] = await this.memberRepo.find({
      where,
      relations: ['partyCell'],
      order: { fullName: 'ASC' },
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách Đảng viên');
    worksheet.columns = [
      { header: 'STT', key: 'no', width: 8 },
      { header: 'Họ và Tên', key: 'fullName', width: 25 },
      { header: 'Ngày sinh', key: 'dob', width: 15 },
      { header: 'Giới tính', key: 'gender', width: 10 },
      { header: 'Chi bộ', key: 'partyCell', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ngày vào Đảng', key: 'joinDate', width: 15 },
    ];
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC00000' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    members.forEach((m: PartyMember, index) => {
      worksheet.addRow({
        no: index + 1,
        fullName: m.fullName,
        dob: m.dob ? new Date(m.dob).toLocaleDateString('vi-VN') : '',
        gender:
          m.gender === GenderEnum.MALE
            ? 'Nam'
            : m.gender === GenderEnum.FEMALE
              ? 'Nữ'
              : 'Khác',
        partyCell: m.partyCell?.name || 'Chưa phân chi bộ',
        status: this.mapMemberStatus(m.status),
        joinDate: m.joinDate
          ? new Date(m.joinDate).toLocaleDateString('vi-VN')
          : '',
      });
    });
    await this.sendExcelResponse(res, workbook, 'DS_DangVien');
  }

  async exportAssessments(res: Response, query: ExportAssessmentQueryDto) {
    const targetYear = query.year
      ? parseInt(query.year)
      : new Date().getFullYear();

    const assessments: AnnualAssessment[] = await this.assessmentRepo.find({
      where: { year: targetYear },
      relations: ['member', 'member.partyCell'],
      order: { member: { fullName: 'ASC' } },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Đánh giá ${targetYear}`);
    sheet.columns = [
      { header: 'STT', key: 'no', width: 8 },
      { header: 'Họ và Tên', key: 'name', width: 25 },
      { header: 'Chi bộ', key: 'cell', width: 20 },
      { header: 'Tự xếp loại', key: 'self', width: 30 },
      { header: 'Kết quả', key: 'final', width: 30 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00B050' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    assessments.forEach((item: AnnualAssessment, index) => {
      sheet.addRow({
        no: index + 1,
        name: item.member?.fullName,
        cell: item.member?.partyCell?.name,
        self: this.mapRankToVietnamese(item.selfRank),
        final: this.mapRankToVietnamese(item.finalRank),
        status:
          item.status === AssessmentStatus.APPROVED ? 'Đã duyệt' : 'Chờ duyệt',
      });
    });
    await this.sendExcelResponse(res, workbook, `Xep_Loai_${targetYear}`);
  }

  async exportPartyFees(res: Response, query: ExportFeeQueryDto) {
    const targetYear = query.year
      ? parseInt(query.year)
      : new Date().getFullYear();

    const members: PartyMember[] = await this.memberRepo.find({
      relations: ['partyFees', 'partyCell'],
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Đảng phí ${targetYear}`);
    const columns = [
      { header: 'STT', key: 'no', width: 8 },
      { header: 'Họ Tên', key: 'name', width: 25 },
    ];
    for (let i = 1; i <= 12; i++)
      columns.push({ header: `T${i}`, key: `m${i}`, width: 10 });
    columns.push({ header: 'Tổng', key: 'total', width: 15 });
    sheet.columns = columns;
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD99694' },
    };

    members.forEach((member: PartyMember, index) => {
      const feeRow: Record<string, string | number> = {
        no: index + 1,
        name: member.fullName,
      };
      let rowTotal = 0;
      for (let i = 1; i <= 12; i++) {
        const fee = member.partyFees.find(
          (f) => f.year === targetYear && f.month === i,
        );
        const amount = Number(fee?.amount) || 0;
        feeRow[`m${i}`] = amount > 0 ? amount.toLocaleString() : '-';
        rowTotal += amount;
      }
      feeRow.total = rowTotal.toLocaleString();
      sheet.addRow(feeRow);
    });
    await this.sendExcelResponse(res, workbook, `Dang_Phi_${targetYear}`);
  }

  async exportCommendations(res: Response, query: ExportReportQueryDto) {
    const year = query.year ?? new Date().getFullYear();
    const where: FindOptionsWhere<Commendation> = {
      date: this.getDateRange(year, query.quarter),
    };
    if (query.partyCellId) where.member = { partyCellId: query.partyCellId };

    const data: Commendation[] = await this.commendationRepo.find({
      where,
      relations: ['member', 'member.partyCell'],
      order: { date: 'DESC' },
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Khen thưởng');
    sheet.columns = [
      { header: 'STT', key: 'no', width: 8 },
      { header: 'Họ và Tên', key: 'name', width: 25 },
      { header: 'Chi bộ', key: 'cell', width: 20 },
      { header: 'Danh hiệu', key: 'title', width: 30 },
      { header: 'Số QĐ', key: 'code', width: 15 },
      { header: 'Cấp ký', key: 'authority', width: 20 },
      { header: 'Ngày ký', key: 'date', width: 15 },
    ];
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0070C0' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    data.forEach((item: Commendation, index) => {
      sheet.addRow({
        no: index + 1,
        name: item.member?.fullName,
        cell: item.member?.partyCell?.name,
        title: item.title,
        code: item.decisionNumber,
        authority: item.signingAuthority,
        date: item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '',
      });
    });
    await this.sendExcelResponse(res, workbook, `Khen_Thuong_${year}`);
  }

  async exportDisciplines(res: Response, query: ExportReportQueryDto) {
    const year = query.year ?? new Date().getFullYear();
    const where: FindOptionsWhere<Discipline> = {
      date: this.getDateRange(year, query.quarter),
    };
    if (query.partyCellId) where.member = { partyCellId: query.partyCellId };

    const data: Discipline[] = await this.disciplineRepo.find({
      where,
      relations: ['member', 'member.partyCell'],
      order: { date: 'DESC' },
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Kỷ luật');
    sheet.columns = [
      { header: 'STT', key: 'no', width: 8 },
      { header: 'Họ và Tên', key: 'name', width: 25 },
      { header: 'Chi bộ', key: 'cell', width: 20 },
      { header: 'Hình thức', key: 'form', width: 15 },
      { header: 'Lý do', key: 'reason', width: 30 },
      { header: 'Số QĐ', key: 'code', width: 15 },
      { header: 'Ngày ký', key: 'date', width: 15 },
    ];
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC65911' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    data.forEach((item: Discipline, index) => {
      sheet.addRow({
        no: index + 1,
        name: item.member?.fullName,
        cell: item.member?.partyCell?.name,
        form: item.form,
        reason: item.reason,
        code: item.decisionNumber,
        date: item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '',
      });
    });
    await this.sendExcelResponse(res, workbook, `Ky_Luat_${year}`);
  }

  async exportMeetingAttendance(res: Response, query: ExportMeetingQueryDto) {
    const { startDate, endDate, partyCellId } = query;
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .leftJoin('member.partyCell', 'partyCell')
      .leftJoin('member.attendees', 'attendee')
      .leftJoin(
        'attendee.meeting',
        'meeting',
        'meeting.date BETWEEN :start AND :end',
        { start: startDate ?? '', end: endDate ?? '' },
      )
      .select([
        'member.id AS id',
        'member.fullName AS fullName',
        'partyCell.name AS cellName',
        'COUNT(meeting.id) AS totalMeetings',
        `SUM(CASE WHEN attendee.status = '${AttendeeStatus.PRESENT}' THEN 1 ELSE 0 END) AS presentCount`,
      ])
      .groupBy('member.id')
      .addGroupBy('member.fullName')
      .addGroupBy('partyCell.name');

    if (partyCellId)
      queryBuilder.andWhere('member.partyCellId = :partyCellId', {
        partyCellId,
      });

    const results = await queryBuilder.getRawMany<RawMeetingAttendance>();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Chuyên cần');
    sheet.columns = [
      { header: 'STT', key: 'no', width: 8 },
      { header: 'Họ và Tên', key: 'name', width: 25 },
      { header: 'Chi bộ', key: 'cell', width: 20 },
      { header: 'Tổng buổi', key: 'total', width: 15 },
      { header: 'Có mặt', key: 'present', width: 15 },
      { header: 'Tỷ lệ', key: 'rate', width: 15 },
    ];
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7030A0' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    results.forEach((item: RawMeetingAttendance, index) => {
      const total = Number(item.totalmeetings) || 0;
      const present = Number(item.presentcount) || 0;
      const rate = total > 0 ? (present / total) * 100 : 0;

      sheet.addRow({
        no: index + 1,
        name: item.fullname,
        cell: item.cellname,
        total,
        present,
        rate: `${rate.toFixed(1)}%`,
      });
    });
    await this.sendExcelResponse(res, workbook, 'Chuyen_Can');
  }

  async exportFluctuations(res: Response, query: ExportFluctuationQueryDto) {
    const { startDate, endDate } = query;
    const start = new Date(startDate ?? '');
    const end = new Date(new Date(endDate ?? '').setHours(23, 59, 59));

    const members: PartyMember[] = await this.memberRepo.find({
      where: [
        { joinDate: Between(start, end) },
        { officialDate: Between(start, end) },
        {
          status: In([MemberStatusEnum.DELETED, MemberStatusEnum.TRANSFERRED]),
          updatedAt: Between(start, end),
        },
      ],
      relations: ['partyCell'],
      order: { updatedAt: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Biến động');
    sheet.columns = [
      { header: 'STT', key: 'no', width: 8 },
      { header: 'Họ và Tên', key: 'name', width: 25 },
      { header: 'Chi bộ', key: 'cell', width: 20 },
      { header: 'Biến động', key: 'type', width: 20 },
      { header: 'Ngày ghi nhận', key: 'date', width: 15 },
    ];
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFBFBFBF' },
    };

    members.forEach((m: PartyMember, index) => {
      let type = 'Thay đổi khác';
      if (m.status === MemberStatusEnum.DELETED) type = 'Xóa tên / Khai trừ';
      else if (m.status === MemberStatusEnum.TRANSFERRED)
        type = 'Chuyển sinh hoạt';
      else if (m.joinDate && new Date(m.joinDate) >= start)
        type = 'Kết nạp mới';
      else if (m.officialDate && new Date(m.officialDate) >= start)
        type = 'Chính thức hóa';

      sheet.addRow({
        no: index + 1,
        name: m.fullName,
        cell: m.partyCell?.name,
        type: type,
        date: m.updatedAt.toLocaleDateString('vi-VN'),
      });
    });
    await this.sendExcelResponse(res, workbook, 'Bien_Dong');
  }

  async getDashboardStats(year: number) {
    const statusStats = await this.memberRepo
      .createQueryBuilder('member')
      .select('member.status', 'status')
      .addSelect('COUNT(member.id)', 'value')
      .groupBy('member.status')
      .getRawMany<RawStatusStat>();

    const genderStats = await this.memberRepo
      .createQueryBuilder('member')
      .select('member.gender', 'gender')
      .addSelect('COUNT(member.id)', 'value')
      .groupBy('member.gender')
      .getRawMany<RawGenderStat>();

    const [totalCommendations, totalDisciplines] = await Promise.all([
      this.commendationRepo.count({
        where: { date: Between(`${year}-01-01`, `${year}-12-31`) },
      }),
      this.disciplineRepo.count({
        where: { date: Between(`${year}-01-01`, `${year}-12-31`) },
      }),
    ]);

    const monthlyFees = await this.feeRepo
      .createQueryBuilder('fee')
      .select('fee.month', 'month')
      .addSelect('SUM(fee.amount)', 'total')
      .where('fee.year = :year', { year })
      .groupBy('fee.month')
      .orderBy('fee.month', 'ASC')
      .getRawMany<RawMonthlyFee>();

    const feeChartData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = monthlyFees.find((f) => Number(f.month) === month);
      return {
        month: `Tháng ${month}`,
        amount: found ? Number(found.total) : 0,
      };
    });

    return {
      memberStatus: statusStats.map((s: RawStatusStat) => ({
        type: this.mapMemberStatus(s.status),
        value: Number(s.value),
      })),
      genderDistribution: genderStats.map((g: RawGenderStat) => ({
        type:
          g.gender === GenderEnum.MALE
            ? 'Nam'
            : g.gender === GenderEnum.FEMALE
              ? 'Nữ'
              : 'Khác',
        value: Number(g.value),
      })),
      summary: {
        commendations: totalCommendations,
        disciplines: totalDisciplines,
        year,
      },
      feeAnalysis: feeChartData,
    };
  }
}
