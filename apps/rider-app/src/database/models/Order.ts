import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

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
