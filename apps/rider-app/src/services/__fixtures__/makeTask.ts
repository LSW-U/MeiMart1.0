import type { DeliveryTask, TaskStatus } from '@/src/types/task';

/**
 * 构造完整 DeliveryTask 测试夹具，只暴露 status + overrides 给用例覆盖。
 *
 * 用 helper 而非类型断言（CLAUDE.md 规则 30 禁止用断言逃逸 strict 检查）：
 * 未来 DeliveryTask 加必填字段时，编译器会强制本 helper 补默认值，
 * 所有引用它的测试一并受保护，不会出现「新字段在某测试里 undefined」。
 *
 * 默认值刻意填空值（空串/0/null）—— 测试只应断言自己关心的字段，
 * 不被无关字段的默认值干扰。
 */
export function makeTask(status: TaskStatus, overrides: Partial<DeliveryTask> = {}): DeliveryTask {
  return {
    id: 'test',
    orderId: 'order-1',
    riderId: null,
    warehouseId: 'wh-1',
    status,
    taskType: 'delivery',
    refundId: null,
    pickupAddress: '',
    pickupLat: 0,
    pickupLng: 0,
    dropoffAddress: '',
    dropoffLat: 0,
    dropoffLng: 0,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    note: null,
    createdAt: '',
    updatedAt: '',
    pickup: { title: '', address: '' },
    dropoff: { title: '', address: '' },
    fee: 0,
    distanceKm: 0,
    estimatedMinutes: 0,
    items: [],
    ...overrides,
  };
}
