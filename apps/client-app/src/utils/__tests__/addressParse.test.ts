import { parseAddressText } from '@/utils/addressParse';

describe('parseAddressText（P16 决策 9 智能识别 MVP：电话+姓名可靠，地址整体填充）', () => {
  it('标准格式：姓名 + 东帝汶号码 + 地址', () => {
    const r = parseAddressText('Maria Silva, 7712 3456, Rua de Lecidere, Dili');
    expect(r.name).toBe('Maria Silva');
    expect(r.phone).toBe('77123456');
    expect(r.detail).toBe('Rua de Lecidere, Dili');
  });

  it('带 +670 前缀号码（前缀与号码间的空格一并去掉）', () => {
    const r = parseAddressText('+670 7712 3456\nJoão Pereira\nBeco Lar, Vera Cruz');
    expect(r.phone).toBe('+67077123456');
    expect(r.name).toBe('João Pereira');
    expect(r.detail).toBe('Beco Lar, Vera Cruz');
  });

  it('中文：张三 + 手机号 + 地址', () => {
    const r = parseAddressText('张三，13800138000，北京市朝阳区幸福路1号');
    expect(r.name).toBe('张三');
    expect(r.phone).toBe('13800138000');
    expect(r.detail).toBe('北京市朝阳区幸福路1号');
  });

  it('只有电话（无姓名）——电话可靠、姓名空、剩余全进地址', () => {
    const r = parseAddressText('77123456 Rua de Mercado');
    expect(r.name).toBe('');
    expect(r.phone).toBe('77123456');
    expect(r.detail).toBe('Rua de Mercado');
  });

  it('纯数字段不像人名（门牌优先归地址）', () => {
    const r = parseAddressText('Ana Costa, 77123456, Rua 12 de Novembro No. 45');
    expect(r.name).toBe('Ana Costa');
    expect(r.detail).toBe('Rua 12 de Novembro No. 45');
  });

  it('空文本返回全空', () => {
    expect(parseAddressText('  ')).toEqual({ name: '', phone: '', detail: '' });
  });
});
