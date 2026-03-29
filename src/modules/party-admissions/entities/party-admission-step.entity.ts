import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from "typeorm";
import { AdmissionStepCode } from "../enum/admission-step-code.enum";
import { AdmissionStepStatus } from "../enum/admission-step-status.enum";

@Entity("party_admission_steps")
@Unique("uq_party_admission_steps_application_step_code", ["applicationId", "stepCode"])
@Index("idx_party_admission_steps_application_id", ["applicationId"])
@Index("idx_party_admission_steps_status", ["status"])
export class PartyAdmissionStepEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    applicationId: string;

    @Column({
        type: "enum",
        enum: AdmissionStepCode,
    })
    stepCode: AdmissionStepCode;

    @Column({ type: "varchar", length: 100 })
    stepName: string;

    @Column({ type: "int" })
    stepOrder: number;

    @Column({
        type: "enum",
        enum: AdmissionStepStatus,
        default: AdmissionStepStatus.LOCKED,
    })
    status: AdmissionStepStatus;

    @Column({ type: "boolean", default: false })
    isLocked: boolean;

    @Column({ type: "boolean", default: false })
    isCurrent: boolean;

    @Column({ type: "boolean", default: false })
    isCompleted: boolean;

    @Column({ type: "timestamp", nullable: true })
    openedAt?: Date;

    @Column({ type: "timestamp", nullable: true })
    submittedAt?: Date;

    @Column({ type: "timestamp", nullable: true })
    approvedAt?: Date;

    @Column({ type: "timestamp", nullable: true })
    returnedAt?: Date;

    @Column({ type: "timestamp", nullable: true })
    rejectedAt?: Date;

    @Column({ type: "text", nullable: true })
    returnReason?: string;

    @Column({ type: "uuid", nullable: true })
    approvedById?: string;

    @Column({ type: "uuid", nullable: true })
    returnedById?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}