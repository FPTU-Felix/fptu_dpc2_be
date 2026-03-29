import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from "typeorm";

@Entity("party_admission_workflow_logs")
@Index("idx_party_admission_workflow_logs_application_id", ["applicationId"])
@Index("idx_party_admission_workflow_logs_step_id", ["stepId"])
export class PartyAdmissionWorkflowLogEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    applicationId: string;

    @Column({ type: "uuid", nullable: true })
    stepId?: string;

    @Column({ type: "varchar", length: 100 })
    action: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    fromStatus?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    toStatus?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    fromStepCode?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    toStepCode?: string;

    @Column({ type: "text", nullable: true })
    message?: string;

    @Column({ type: "jsonb", nullable: true })
    metadata?: Record<string, any>;

    @Column({ type: "uuid", nullable: true })
    actorId?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    actorRole?: string;

    @CreateDateColumn()
    createdAt: Date;
}