import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Handbook } from './handbook.entity';

@Entity('handbook_links')
export class HandbookLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'handbook_id' })
  handbookId: string;

  @ManyToOne(() => Handbook, (hb) => hb.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'handbook_id' })
  handbook: Handbook;

  @Column()
  title: string;

  @Column()
  url: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
