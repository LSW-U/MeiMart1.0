import { dedupeById } from '../dedupeById';

describe('dedupeById', () => {
  it('重复 id 只保留首次出现，顺序不变', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }, { id: 'b' }];
    expect(dedupeById(items)).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('无重复时原样返回（顺序与引用保持）', () => {
    const items = [{ id: 'x' }, { id: 'y' }];
    expect(dedupeById(items)).toEqual(items);
  });

  it('空数组返回空数组', () => {
    expect(dedupeById([])).toEqual([]);
  });
});
