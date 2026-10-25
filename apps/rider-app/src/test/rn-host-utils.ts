/**
 * RN host 壳测试工具（web project / jsdom 用）
 *
 * getBasePressables：Modal 基座的前两个 Pressable（backdrop / sheet 捕获层）——
 * 把「基座结构顺序」这一隐式契约封装成具名访问（审查 20261025 建议⑦：
 * 三个迁移测试各自复制 querySelectorAll 下标写法，抽共享 helper 收编）。
 */
export function getBasePressables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-rn-host="Pressable"]')) as HTMLElement[];
}
