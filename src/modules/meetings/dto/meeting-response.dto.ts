import { Exclude, Expose } from 'class-transformer';
@Exclude()
export class MeetingResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  time: Date;

  @Expose()
  location: string;

  @Expose()
  isCheckinActive: boolean;

  @Expose()
  createdAt: Date;
}
