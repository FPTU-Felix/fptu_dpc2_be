import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
} from "typeorm";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { FileScope, FileStorageType } from "../common/constant";

@Entity({ name: "files" })
export class File extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @IsString()
  @Column({ type: "varchar", nullable: false })
  name: string;

  @IsString()
  @Column({ type: "varchar", nullable: false })
  author: string;

  @IsString()
  @Column({ type: "varchar", nullable: false })
  authorName: string;

  @IsString()
  @Column({ type: "varchar", nullable: false })
  mimetype: string;

  @IsNumber()
  @Column({ type: "int", nullable: false })
  size: number;

  // Nếu cần thêm trường boolean public:
  // @Column({ type: "boolean", default: true })
  // isPublic: boolean;

  @IsEnum(FileScope)
  @IsOptional()
  @Column({ type: "enum", enum: FileScope, default: FileScope.PUBLIC })
  scope: FileScope;

  @IsEnum(FileStorageType)
  @Column({ type: "enum", enum: FileStorageType, nullable: false })
  storageType: FileStorageType;

  @IsString()
  @Column({ type: "text", nullable: false })
  data: string;

  @Column({ type: "varchar", nullable: true })
  uploadId?: string;

  toJSON() {
    const { data, ...rest } = this;
    return rest;
  }
}