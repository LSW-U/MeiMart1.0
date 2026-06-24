// RN 的 FormData 在 append 时支持 { uri, type, name } 形式（用于本地文件上传），
// 但 RN package.json types 字段为空，导致 globals.d.ts 的扩展签名不自动加载。
// 这里通过 interface 合并补上 lib.dom.d.ts 缺失的重载。
declare global {
  interface FormData {
    append(name: string, value: string | Blob | { uri: string; type?: string; name?: string }, fileName?: string): void;
  }
}

export {};
