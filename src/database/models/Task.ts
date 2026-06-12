import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

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
