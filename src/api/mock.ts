import type { HelpTopic } from './client';
import * as D from './mock-data';

/*
 * API giả cho giai đoạn chưa có backend: cùng chữ ký mà `api` trong `./client` sẽ có. Đổi sang backend
 * thật = thay `mockApi.x` bằng `api.x` trong `src/queries/**`; màn hình không phải sửa.
 *
 * Trạng thái nằm trong bộ nhớ của module (mất khi reload app) và mọi hàm ghi đều thay object mới chứ
 * không sửa tại chỗ — TanStack giữ tham chiếu tới dữ liệu cũ trong cache, sửa tại chỗ là đổi lén dữ
 * liệu mà cache tưởng chưa đổi.
 */

/** Đủ để thấy trạng thái loading và để optimistic update có ý nghĩa, không đủ để thấy chậm. */
const LATENCY_MS = 350;

const wait = <T>(value: T, ms = LATENCY_MS) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

let savedSearches: string[] = [];

export const mockApi = {
  getSavedSearches: (): Promise<string[]> => wait(savedSearches, 150),

  saveSearch: (q: string): Promise<void> => {
    savedSearches = [...new Set([...savedSearches, q.trim().toLowerCase()])];
    return wait(undefined);
  },

  getHelpTopics: (): Promise<HelpTopic[]> => wait(D.HELP_TOPICS),
};
