import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";
import { AdmissionStepCode } from "../enum/admission-step-code.enum";
import { AdmissionStepStatus } from "../enum/admission-step-status.enum";

@Entity("party_admission_step_submissions")
@Index("idx_party_admission_step_submissions_application_id", ["applicationId"])
@Index("idx_party_admission_step_submissions_step_id", ["stepId"])
export class PartyAdmissionStepSubmissionEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    applicationId: string;

    @Column({ type: "uuid" })
    stepId: string;

    @Column({
        type: "enum",
        enum: AdmissionStepCode,
    })
    stepCode: AdmissionStepCode;

    @Column({ type: "int", default: 1 })
    version: number;

    @Column({
        type: "enum",
        enum: AdmissionStepStatus,
        default: AdmissionStepStatus.DRAFT,
    })
    status: AdmissionStepStatus;

    @Column({ type: "jsonb", nullable: true })
    formData?: Record<string, any>;

    @Column({ type: "text", nullable: true })
    note?: string;

    @Column({ type: "uuid", nullable: true })
    submittedById?: string;

    @Column({ type: "timestamp", nullable: true })
    submittedAt?: Date;

    @Column({ type: "boolean", default: true })
    isLatest: boolean;

    @CreateDateColumn()
    createdAt: Date;
}