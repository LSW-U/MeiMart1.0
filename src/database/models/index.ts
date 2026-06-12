import { Model, Q } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Task extends Model {
  static table = 'tasks';

  @field('order_id') orderId!: string;
  @field('status') status!: string;
  @field('pickup_title') pickupTitle!: string;
  @field('pickup_address') pickupAddress!: string;
  @field('dropoff_title') dropoffTitle!: string;
  @field('dropoff_address') dropoffAddress!: string;
  @field('fee') fee!: number;
  @field('distance_km') distanceKm!: number;
  @field('estimated_minutes') estimatedMinutes!: number;
  @field('note') note?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export class Order extends Model {
  static table = 'orders';

  @field('order_no') orderNo!: string;
  @field('status') status!: string;
  @field('completed_at') completedAt!: number;
  @field('pickup_name') pickupName!: string;
  @field('pickup_address') pickupAddress!: string;
  @field('dropoff_name') dropoffName!: string;
  @field('dropoff_address') dropoffAddress!: string;
  @field('income') income!: number;
  @field('distance_km') distanceKm!: number;
  @field('duration_minutes') durationMinutes!: number;
}

export class OfflineQueueEntry extends Model {
  static table = 'offline_queue';

  @field('action') action!: string;
  @field('payload') payload!: string;
  @readonly @date('created_at') createdAt!: Date;
  @field('attempts') attempts!: number;
  @field('last_error') lastError?: string;
}
