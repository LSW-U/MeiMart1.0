import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class OfflineQueueEntry extends Model {
  static table = 'offline_queue';

  @field('action') action!: string;
  /** 批1 R-P1-5 拆列：taskId 独立可查（去重/索引），payload JSON 保留完整原始载荷 */
  @field('task_id') taskId!: string;
  @field('payload') payload!: string;
  @readonly @date('created_at') createdAt!: Date;
  @field('attempts') attempts!: number;
  @field('last_error') lastError?: string;
}
