import { unwrap } from './client';
import {
  deleteApiV1ListingsByIdFeatured,
  getApiV1ListingsByIdBoost,
  postApiV1ListingsByIdBoost,
} from './generated/sdk.gen';
import type { GetApiV1ListingsByIdBoostResponses } from './generated/types.gen';

/*
 * Đẩy tin của người quản trị (ghim-server add-admin-boost): master mọi tin, staff tin sàn chung của danh mục được giao,
 * chủ nhóm / điều hành viên tin của nhóm — miễn phí. Kiểu wire không rò khỏi file này.
 */

type WireBoost = GetApiV1ListingsByIdBoostResponses[200]['data'];

export type BoostRole = WireBoost['role'];

export const BOOST_ROLE_LABEL: Record<BoostRole, string> = {
  master: 'master',
  staff: 'staff của danh mục',
  group_owner: 'chủ nhóm',
  group_moderator: 'điều hành viên',
};

export type BoostState = {
  role: BoostRole;
  /** Vì sao không đẩy lên đầu / đặt nổi bật được; null = đẩy được. Bỏ nổi bật không vướng câu này. */
  blocked: string | null;
  /** Mốc đẩy lên đầu lại được; null = đẩy được ngay. */
  bumpRetryAt: string | null;
  featuredUntil: string | null;
  featuredMaxDays: number;
};

export type BoostAction = 'top' | 'unfeature' | `featured:${number}`;

const toState = (w: WireBoost): BoostState => ({
  role: w.role,
  blocked: w.blocked,
  bumpRetryAt: w.bumpRetryAt,
  featuredUntil: w.featuredUntil,
  featuredMaxDays: w.featuredMaxDays,
});

/** Số ngày nổi bật đưa ra chọn — cắt theo trần `promotion.featuredMaxDays` của server. */
const FEATURE_DAYS = [1, 3, 7, 14, 30];

/**
 * Lựa chọn trong bảng "Đẩy tin": đẩy lên đầu và nổi bật chỉ khi tin đẩy được; bỏ nổi bật khi tin đang nổi bật, ở mọi
 * trạng thái. Đang trong thời gian chờ thì vẫn hiện "Đẩy lên đầu" kèm mốc — bấm thì server trả câu 429.
 */
export function boostOptions(
  state: BoostState,
  format: (iso: string) => string,
): { value: BoostAction; label: string; note?: string }[] {
  const options: { value: BoostAction; label: string; note?: string }[] = [];
  if (state.blocked === null) {
    options.push({
      value: 'top',
      label: 'Đẩy lên đầu',
      note: state.bumpRetryAt
        ? `Đẩy lại được từ ${format(state.bumpRetryAt)}`
        : 'Tin đứng như vừa lên bảng rồi trôi dần theo tin mới',
    });
    for (const days of FEATURE_DAYS.filter((d) => d <= state.featuredMaxDays)) {
      options.push({
        value: `featured:${days}`,
        label: `Nổi bật ${days} ngày`,
        ...(state.featuredUntil && { note: 'Thay hạn nổi bật hiện tại' }),
      });
    }
  }
  if (state.featuredUntil) {
    options.push({
      value: 'unfeature',
      label: 'Bỏ nổi bật',
      note: 'Tin rời dải "Tin nổi bật" ngay',
    });
  }
  return options;
}

export const boostApi = {
  state: async (id: string): Promise<BoostState> =>
    toState(await unwrap(getApiV1ListingsByIdBoost({ path: { id } }))),

  apply: async (id: string, action: BoostAction): Promise<BoostState> => {
    if (action === 'unfeature') {
      return toState(await unwrap(deleteApiV1ListingsByIdFeatured({ path: { id } })));
    }
    const body =
      action === 'top'
        ? { effect: 'rank_to_top' as const }
        : { effect: 'featured' as const, days: Number(action.slice('featured:'.length)) };
    return toState(await unwrap(postApiV1ListingsByIdBoost({ path: { id }, body })));
  },
};
