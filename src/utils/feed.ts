import type { ListingCard } from '@/api/client';

/** Một ô feed: tin thường, hay slot tài trợ (tin trả phí "Nổi bật") được chèn vào. */
export interface FeedCell {
  item: ListingCard;
  sponsored: boolean;
}

const FIRST_SLOT = 2;
const SLOT_GAP = 6;

/**
 * Chèn tin nổi bật (trả phí) vào feed một cột: slot đầu ở vị trí thứ 3, rồi mỗi 6 tin thường một slot.
 * Tin nổi bật vẫn xuất hiện ở dải cover riêng (phơi hai chỗ là cố ý), nên ở đây chỉ bỏ bản organic TRÙNG
 * trong chính feed — một tin không hiện hai lần trong cùng dòng cuộn. Thừa tin nổi bật mà feed quá ngắn thì
 * để dành, không dồn xuống cuối.
 */
export function interleaveFeatured(
  organic: readonly ListingCard[],
  featured: readonly ListingCard[] | undefined,
  opts?: { start?: number; gap?: number },
): FeedCell[] {
  const feat = featured ?? [];
  if (feat.length === 0) return organic.map((item) => ({ item, sponsored: false }));

  const start = opts?.start ?? FIRST_SLOT;
  const gap = opts?.gap ?? SLOT_GAP;
  const featIds = new Set(feat.map((f) => f.id));
  const base = organic.filter((item) => !featIds.has(item.id));

  const out: FeedCell[] = [];
  let next = 0;
  for (let i = 0; i < base.length; i++) {
    const pick = feat[next];
    if (pick && i >= start && (i - start) % gap === 0) {
      out.push({ item: pick, sponsored: true });
      next++;
    }
    const item = base[i];
    if (item) out.push({ item, sponsored: false });
  }
  return out;
}
