import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PickerSheet } from './PickerSheet';
import { Chip } from './Chip';
import { CONDITIONS, CONDITION_LABEL, type Condition, type SearchFilters } from '@/api/client';
import { useCategories } from '@/queries/selling';
import { S } from '@/theme';
import { formatMillionRange } from '@/utils/format';

const MILLION = 1_000_000;

/** Mức giá gợi sẵn — người mua ít khi gõ số chính xác. `any` = bỏ lọc giá. */
const PRICES = [
  { value: 'lt5', min: null, max: 5 * MILLION, label: 'Dưới 5 triệu' },
  { value: '5-10', min: 5 * MILLION, max: 10 * MILLION, label: formatMillionRange(5e6, 10e6) },
  { value: '10-20', min: 10 * MILLION, max: 20 * MILLION, label: formatMillionRange(10e6, 20e6) },
  { value: 'gt20', min: 20 * MILLION, max: null, label: 'Trên 20 triệu' },
  { value: 'any', min: null, max: null, label: 'Mọi mức giá' },
] as const;

type PriceKey = (typeof PRICES)[number]['value'];

const CITIES = ['TP.HCM', 'Hà Nội', 'Đà Nẵng'];
const ANYWHERE = 'Toàn quốc';

type Sheet = 'city' | 'price' | 'condition' | 'category' | null;

/**
 * Hàng chip lọc của màn tìm kiếm cùng các bảng chọn của nó. Chip đầu tối màu đếm số bộ lọc đang bật;
 * bấm vào thì xoá hết — thiết kế chưa có màn bộ lọc đầy đủ, mỗi chip sau đã là một bộ lọc riêng.
 */
export function SearchFilterBar({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const categories = useCategories();
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch });
  const close = () => setSheet(null);

  const price = PRICES.find((p) => p.min === filters.minPrice && p.max === filters.maxPrice);
  const priceOn = filters.minPrice !== null || filters.maxPrice !== null;
  const category = categories.data?.find((c) => c.id === filters.categoryId);
  const active = [filters.city, filters.condition, filters.categoryId].filter(Boolean).length;
  const count = active + (priceOn ? 1 : 0);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          <Chip
            dark
            icon="sliders"
            label={count > 0 ? `Bộ lọc · ${count}` : 'Bộ lọc'}
            onPress={() =>
              set({ city: null, minPrice: null, maxPrice: null, condition: null, categoryId: null })
            }
          />
          {category && (
            <Chip selected chevron label={category.name} onPress={() => setSheet('category')} />
          )}
          <Chip
            chevron
            selected={filters.city !== null}
            label={filters.city ?? ANYWHERE}
            onPress={() => setSheet('city')}
          />
          <Chip
            chevron
            selected={priceOn}
            label={priceOn ? (price?.label ?? 'Giá') : 'Giá'}
            onPress={() => setSheet('price')}
          />
          <Chip
            chevron
            selected={filters.condition !== null}
            label={filters.condition ? CONDITION_LABEL[filters.condition] : 'Tình trạng'}
            onPress={() => setSheet('condition')}
          />
        </View>
      </ScrollView>

      <PickerSheet
        visible={sheet === 'city'}
        title="Khu vực"
        options={[...CITIES, ANYWHERE].map((c) => ({ value: c, label: c }))}
        value={filters.city ?? ANYWHERE}
        onSelect={(c) => set({ city: c === ANYWHERE ? null : c })}
        onClose={close}
      />
      <PickerSheet<PriceKey>
        visible={sheet === 'price'}
        title="Mức giá"
        options={PRICES.map((p) => ({ value: p.value, label: p.label }))}
        value={price?.value ?? null}
        onSelect={(key) => {
          const p = PRICES.find((x) => x.value === key);
          if (p) set({ minPrice: p.min, maxPrice: p.max });
        }}
        onClose={close}
      />
      <PickerSheet<Condition | 'any'>
        visible={sheet === 'condition'}
        title="Tình trạng"
        options={[
          ...CONDITIONS.map((c) => ({ value: c, label: CONDITION_LABEL[c] })),
          { value: 'any', label: 'Mọi tình trạng' },
        ]}
        value={filters.condition ?? 'any'}
        onSelect={(c) => set({ condition: c === 'any' ? null : c })}
        onClose={close}
      />
      <PickerSheet
        visible={sheet === 'category'}
        title="Danh mục"
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={filters.categoryId}
        onSelect={(id) => set({ categoryId: id })}
        onClose={close}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.sm },
});
