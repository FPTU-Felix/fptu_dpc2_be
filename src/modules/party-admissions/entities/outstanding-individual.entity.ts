import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { OutstandingIndividualStatus } from '../enums/admission-status.enum';
import { AdmissionApplication } from './admission-application.entity';
  
  @Entity('outstanding_individuals')
  export class OutstandingIndividual {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'full_name', type: 'varchar', length: 255 })
    fullName: string;
  
    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth?: string;
  
    @Column({ name: 'gender', type: 'varchar', length: 20, nullable: true })
    gender?: string;
  
    @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
    email?: string;
  
    @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
    phone?: string;
  
    @Column({ name: 'organization_unit_id', type: 'uuid', nullable: true })
    organizationUnitId?: string;
  
    @Column({
      name: 'status',
      type: 'varchar',
      length: 50,
      default: OutstandingIndividualStatus.IN_PROGRESS,
    })
    status: OutstandingIndividualStatus;
  
    @OneToMany(() => AdmissionApplication, (application) => application.outstandingIndividual)
    applications: AdmissionApplication[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt?: Date;
  }