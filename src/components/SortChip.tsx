import { useState } from 'react';
import { Chip } from './Chip';
import { PickerSheet } from './PickerSheet';
import { FEED_SORT_LABEL, FEED_SORTS, type FeedSort } from '@/api/client';

const OPTIONS = FEED_SORTS.map((value) => ({ value, label: FEED_SORT_LABEL[value] }));

/** Nút sắp xếp kết quả: tô đậm khi đang khác mặc định, để người xem biết danh sách không còn theo tin mới nhất. */
export function SortChip({
  value,
  onChange,
}: {
  value: FeedSort;
  onChange: (sort: FeedSort) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Chip
        label={FEED_SORT_LABEL[value]}
        icon="bar-chart-2"
        chevron
        selected={value !== 'newest'}
        onPress={() => setOpen(true)}
      />
      <PickerSheet
        visible={open}
        title="Sắp xếp"
        options={OPTIONS}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
