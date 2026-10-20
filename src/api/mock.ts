import type { HelpTopic, ListingCard, ListingDetail } from './client';
import { ApiError } from './http';
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

const notFound = (what: string) => new ApiError('NOT_FOUND', `Không tìm thấy ${what}`, 404);

const listings = D.LISTINGS;
let savedIds = D.SAVED_IDS;
let savedSearches: string[] = [];

function toCard(l: ListingDetail): ListingCard {
  const { id, title, price, cover, place, postedAt, boosted, seller, groupName } = l;
  const { id: sellerId, name, verified } = seller;
  return {
    id,
    title,
    price,
    cover,
    place,
    postedAt,
    boosted,
    groupName,
    seller: { id: sellerId, name, verified },
  };
}

const publicListings = () => listings.map(toCard);

export const mockApi = {
  getListing: async (id: string): Promise<ListingDetail> => {
    const l = listings.find((x) => x.id === id);
    if (!l) throw notFound('tin đăng');
    return wait(l);
  },

  getSimilar: async (id: string): Promise<ListingCard[]> => {
    const l = listings.find((x) => x.id === id);
    if (!l) throw notFound('tin đăng');
    return wait(
      publicListings().filter(
        (x) => x.id !== id && listings.find((y) => y.id === x.id)?.category.id === l.category.id,
      ),
    );
  },

  getSavedIds: (): Promise<string[]> => wait(savedIds, 150),

  setSaved: (id: string, saved: boolean): Promise<void> => {
    savedIds = saved ? [...new Set([...savedIds, id])] : savedIds.filter((x) => x !== id);
    return wait(undefined);
  },

  getSavedListings: (): Promise<ListingCard[]> =>
    wait(listings.filter((l) => savedIds.includes(l.id)).map(toCard)),

  getSavedSearches: (): Promise<string[]> => wait(savedSearches, 150),

  saveSearch: (q: string): Promise<void> => {
    savedSearches = [...new Set([...savedSearches, q.trim().toLowerCase()])];
    return wait(undefined);
  },

  getHelpTopics: (): Promise<HelpTopic[]> => wait(D.HELP_TOPICS),
};
