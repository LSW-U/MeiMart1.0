import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'order_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'pickup_title', type: 'string' },
        { name: 'pickup_address', type: 'string' },
        { name: 'dropoff_title', type: 'string' },
        { name: 'dropoff_address', type: 'string' },
        { name: 'fee', type: 'number' },
        { name: 'distance_km', type: 'number' },
        { name: 'estimated_minutes', type: 'number' },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'order_no', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'completed_at', type: 'number' },
        { name: 'pickup_name', type: 'string' },
        { name: 'pickup_address', type: 'string' },
        { name: 'dropoff_name', type: 'string' },
        { name: 'dropoff_address', type: 'string' },
        { name: 'income', type: 'number' },
        { name: 'distance_km', type: 'number' },
        { name: 'duration_minutes', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'offline_queue',
      columns: [
        { name: 'action', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
      ],
    }),
  ],
});
