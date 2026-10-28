import { unwrap } from './client';
import {
  getApiV1ListingsByIdPromotions,
  postApiV1ListingsByIdPromotions,
} from './generated/sdk.gen';
import type { GetApiV1ListingsByIdPromotionsResponses } from './generated/types.gen';

/*
 * Gói đẩy tin trả Xu của người đăng (ghim-server add-promotions): xem gói cho một tin của mình kèm lý do chưa mua được,
 * mua — trừ Xu và áp hiệu ứng trong một lượt. Kiểu wire không rò khỏi file này.
 */

type WireListingPromotions = GetApiV1ListingsByIdPromotionsResponses[200]['data'];
type WireProduct = WireListingPromotions['products'][number];
type WirePurchase = NonNullable<WireListingPromotions['running']>;

export type PromotionEffect = WireProduct['effect'];

export const PROMOTION_EFFECT_LABEL: Record<PromotionEffect, string> = {
  rank_to_top: 'Đẩy lên đầu',
  featured: 'Nổi bật',
};

export type OwnerProduct = {
  code: string;
  name: string;
  description: string | null;
  effect: PromotionEffect;
  durationDays: number | null;
  price: number;
  minTier: string;
  purchasable: boolean;
  /** Vì sao chưa mua được; null = mua được. Server không ẩn gói (TK 4 nguyên tắc 8). */
  reason: string | null;
  retryAt: string | null;
};

export type Purchase = {
  id: string;
  productCode: string;
  effect: PromotionEffect;
  price: number;
  appliedAt: string;
  expiresAt: string | null;
  status: 'applied' | 'refunded';
};

export type ListingPromotions = {
  products: OwnerProduct[];
  /** Gói nổi bật đang chạy của tin, hay null. */
  running: Purchase | null;
  balance: number;
};

const toPurchase = (w: WirePurchase): Purchase => ({
  id: w.id,
  productCode: w.productCode,
  effect: w.effect,
  price: w.price,
  appliedAt: w.appliedAt,
  expiresAt: w.expiresAt,
  status: w.status,
});

export const promotionApi = {
  forListing: async (listingId: string): Promise<ListingPromotions> => {
    const w = await unwrap(getApiV1ListingsByIdPromotions({ path: { id: listingId } }));
    return {
      products: w.products.map((p) => ({
        code: p.code,
        name: p.name,
        description: p.description,
        effect: p.effect,
        durationDays: p.durationDays,
        price: p.price,
        minTier: p.minTier,
        purchasable: p.purchasable,
        reason: p.reason,
        retryAt: p.retryAt,
      })),
      running: w.running ? toPurchase(w.running) : null,
      balance: w.balance,
    };
  },

  /** Khoá chống lặp sinh một lần mỗi lần mở bảng: bấm lại khi mạng chậm trả cùng lượt mua. */
  buy: async (input: {
    listingId: string;
    productCode: string;
    idempotencyKey: string;
  }): Promise<Purchase> =>
    toPurchase(
      await unwrap(
        postApiV1ListingsByIdPromotions({
          path: { id: input.listingId },
          body: { productCode: input.productCode, idempotencyKey: input.idempotencyKey },
        }),
      ),
    ),
};
