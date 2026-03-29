import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";
import { AdmissionDocumentType } from "../enum/admission-document-type.enum";

@Entity("party_admission_documents")
@Index("idx_party_admission_documents_application_id", ["applicationId"])
@Index("idx_party_admission_documents_step_id", ["stepId"])
@Index("idx_party_admission_documents_submission_id", ["submissionId"])
export class PartyAdmissionDocumentEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    applicationId: string;

    @Column({ type: "uuid", nullable: true })
    stepId?: string;

    @Column({ type: "uuid", nullable: true })
    submissionId?: string;

    @Column({
        type: "enum",
        enum: AdmissionDocumentType,
    })
    documentType: AdmissionDocumentType;

    @Column({ type: "varchar", length: 255 })
    originalFileName: string;

    @Column({ type: "varchar", length: 255 })
    storedFileName: string;

    @Column({ type: "varchar", length: 500 })
    objectKey: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    mimeType?: string;

    @Column({ type: "bigint", nullable: true })
    size?: number;

    @Column({ type: "int", default: 1 })
    version: number;

    @Column({ type: "boolean", default: true })
    isLatest: boolean;

    @Column({ type: "uuid", nullable: true })
    uploadedById?: string;

    @Column({ type: "timestamp", nullable: true })
    uploadedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;
}