import { fromView } from '../task';
import { makeTask } from '../__fixtures__/makeTask';

/**
 * 20261116 P/D 空标题修复（A 修）单测：
 * 后端 DeliveryTaskView 无 pickup/dropoff 嵌套对象（扁平结构），fromView 本地构造
 * 嵌套结构时 title 原写死 ''——真实模式任务卡 P/D 行渲染空串（页测实证）。
 * 修复：title 兜底用对应地址；B 修（后端 toView 富化）落地后 view.pickup/dropoff
 * 存在时走 `view.pickup ??` 主路径，兜底保留作断链防御。
 */
describe('fromView title 兜底（P/D 空标题修复 A）', () => {
  it('view 无 pickup/dropoff 嵌套 → title 兜底为 pickupAddress/dropoffAddress', () => {
    // makeTask 默认嵌套对象带 title:''，模拟 real 模式需剥掉并给地址值
    const { pickup, dropoff, ...flat } = makeTask('ASSIGNED', {
      id: 'a1',
      pickupAddress: 'Rua de Colmera, Dili',
      dropoffAddress: 'Timor Plaza, Unit 4B',
      contactPhone: '+670 7733 4072',
    }) as Record<string, unknown>;
    void pickup;
    void dropoff;

    const task = fromView(flat as never);

    expect(task.pickup.title).toBe('Rua de Colmera, Dili');
    expect(task.dropoff.title).toBe('Timor Plaza, Unit 4B');
    // 既有映射不回归：contactPhone 仍映射到 dropoff
    expect(task.dropoff.contactPhone).toBe('+670 7733 4072');
  });

  it('view 嵌套 pickup/dropoff title 为空串（makeTask 默认）→ 不被兜底覆盖（主路径优先）', () => {
    const task = fromView(makeTask('ASSIGNED', { id: 'a2' }));

    expect(task.pickup.title).toBe('');
    expect(task.dropoff.title).toBe('');
  });
});
