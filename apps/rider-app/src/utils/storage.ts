const memoryStorage = new Map<string, string>();

export const storage = {
  async getItem(key: string) {
    return memoryStorage.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value);
  },
  async removeItem(key: string) {
    memoryStorage.delete(key);
  },
};
