import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class OfflineQueueEntry extends Model {
  static table = 'offline_queue';

  @field('action') action!: string;
  @field('payload') payload!: string;
  @readonly @date('created_at') createdAt!: Date;
  @field('attempts') attempts!: number;
  @field('last_error') lastError?: string;
}
