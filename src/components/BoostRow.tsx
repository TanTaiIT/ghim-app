import { useState } from 'react';
import { BOOST_ROLE_LABEL, boostOptions, type BoostAction } from '@/api/boost';
import { useApplyBoost, useBoostState } from '@/queries/boost';
import { formatDate, formatMoment } from '@/utils/format';
import { ManageRow } from './ListingInfo';
import { PickerSheet } from './PickerSheet';
import { useToast } from './Toast';

const doneOf = (action: BoostAction): string =>
  action === 'top'
    ? 'Đã đẩy tin lên đầu'
    : action === 'unfeature'
      ? 'Đã bỏ nổi bật'
      : 'Đã đặt tin nổi bật';

/**
 * Hàng "Đẩy tin" trên chi tiết tin cho người quản trị trong phạm vi (add-admin-boost). `enabled` = người xem có thể có
 * vai (master / staff, hay quản trị nhóm của tin); server trả 403 thì không có vai — không vẽ gì. Tin không đẩy được và
 * không đang nổi bật thì nói vì sao, không có nút.
 */
export function BoostRow({
  listingId,
  groupId,
  enabled,
}: {
  listingId: string;
  groupId: string | null;
  enabled: boolean;
}) {
  const toast = useToast();
  const state = useBoostState(listingId, enabled);
  const apply = useApplyBoost(listingId, groupId);
  const [open, setOpen] = useState(false);

  const s = state.data;
  if (!enabled || !s) return null;
  const options = boostOptions(s, formatMoment);
  const role = BOOST_ROLE_LABEL[s.role];
  const text = s.featuredUntil
    ? `Tin đang nổi bật tới ${formatDate(s.featuredUntil)} — bạn là ${role}.`
    : s.blocked
      ? `${s.blocked} — chưa đẩy được.`
      : `Bạn đẩy được tin này (${role}).`;

  const choose = (action: BoostAction) =>
    apply.mutate(action, {
      onSuccess: () => toast(doneOf(action)),
      onError: (e) => toast(e.message),
    });

  return (
    <>
      <ManageRow
        text={text}
        actionLabel="Đẩy tin"
        onPress={() =>
          options.length > 0 ? setOpen(true) : toast(s.blocked ?? 'Tin này chưa đẩy được')
        }
      />
      <PickerSheet
        visible={open}
        title="Đẩy tin — miễn phí"
        options={options}
        value={null}
        onSelect={choose}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
