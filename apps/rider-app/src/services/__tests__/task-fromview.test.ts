import { fromView } from '../task';
import { makeTask } from '../__fixtures__/makeTask';
import * as settings from '../settings';

/**
 * 20261116 P/D 空标题修复（A 修）单测：
 * 后端 DeliveryTaskView 无 pickup/dropoff 嵌套对象（扁平结构），fromView 本地构造
 * 嵌套结构时 title 原写死 ''——真实模式任务卡 P/D 行渲染空串（页测实证）。
 * 修复：title 兜底用对应地址；B 修（后端 toView 富化）落地后 view.pickup/dropoff
 * 存在时走 `view.pickup ??` 主路径，兜底保留作断链防御。
 *
 * B 修前端（788f650）补充（审查报告第三批 🟡-1/2）：
 *   - pickupTitleI18n 取值链三态：locale 命中 / en fallback / 地址终底；
 *   - dropoffContactName → dropoff.contactName 映射断言（navigate/sign 页消费，断了会
 *     无声退回「收件人」通用文案，测试网此前抓不住）。
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

describe('fromView B 修富化字段（788f650，审查补测）', () => {
  it('pickupTitleI18n：locale 命中 → 取当前语言值', () => {
    const langSpy = jest.spyOn(settings, 'getCurrentLanguage').mockReturnValue('zh');
    const { pickup, dropoff, ...flat } = makeTask('ASSIGNED', {
      id: 'b1',
      pickupAddress: 'Rua de Colmera, Dili',
    }) as Record<string, unknown>;
    void pickup;
    void dropoff;
    (flat as Record<string, unknown>).pickupTitleI18n = {
      en: 'Dili Warehouse',
      zh: '帝力仓库',
    };

    const task = fromView(flat as never);

    expect(task.pickup.title).toBe('帝力仓库');
    langSpy.mockRestore();
  });

  it('pickupTitleI18n：locale 无对应 key（zh 包缺）→ en fallback', () => {
    const langSpy = jest.spyOn(settings, 'getCurrentLanguage').mockReturnValue('zh');
    const { pickup, dropoff, ...flat } = makeTask('ASSIGNED', {
      id: 'b2',
      pickupAddress: 'Rua de Colmera, Dili',
    }) as Record<string, unknown>;
    void pickup;
    void dropoff;
    // 库数据实况（live API 实证）：tet 等语缺 key
    (flat as Record<string, unknown>).pickupTitleI18n = {
      en: 'Dili Warehouse',
      pt: 'Armazém Dili',
    };

    const task = fromView(flat as never);

    expect(task.pickup.title).toBe('Dili Warehouse');
    langSpy.mockRestore();
  });

  it('pickupTitleI18n：null/undefined（后端断链/旧数据）→ 地址终底', () => {
    const langSpy = jest.spyOn(settings, 'getCurrentLanguage').mockReturnValue('zh');
    const { pickup, dropoff, ...flat } = makeTask('ASSIGNED', {
      id: 'b3',
      pickupAddress: 'Rua de Colmera, Dili',
    }) as Record<string, unknown>;
    void pickup;
    void dropoff;
    (flat as Record<string, unknown>).pickupTitleI18n = null;

    const task = fromView(flat as never);

    expect(task.pickup.title).toBe('Rua de Colmera, Dili');
    langSpy.mockRestore();
  });

  it('dropoffContactName → dropoff.contactName 映射（navigate/sign 页联系人数据源，断链会无声退回通用文案）', () => {
    const { pickup, dropoff, ...flat } = makeTask('ASSIGNED', {
      id: 'b4',
      dropoffAddress: 'Timor Plaza, Unit 4B',
    }) as Record<string, unknown>;
    void pickup;
    void dropoff;
    (flat as Record<string, unknown>).dropoffContactName = 'WWW';

    const task = fromView(flat as never);

    expect(task.dropoff.contactName).toBe('WWW');
  });
});
