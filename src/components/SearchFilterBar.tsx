import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PickerSheet } from './PickerSheet';
import { Chip } from './Chip';
import { filterableFields, TemplateFilterSheet } from './TemplateFilterSheet';
import { NO_FILTERS, type SearchFilters } from '@/api/client';
import { useCategories, useCategoryTemplate, useProvinces } from '@/queries/catalog';
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

const ANYWHERE = 'all';

type Sheet = 'province' | 'price' | 'category' | 'attrs' | null;

/**
 * Hàng chip lọc của màn tìm kiếm cùng các bảng chọn của nó. Chip đầu tối màu đếm số bộ lọc đang bật;
 * bấm vào thì xoá hết — thiết kế chưa có màn bộ lọc đầy đủ, mỗi chip sau đã là một bộ lọc riêng. Chip "Thông tin"
 * chỉ có khi đã chọn danh mục và mẫu của nó có mục lọc được (TK 11); đổi danh mục thì bộ lọc đó bỏ theo.
 * Thiết kế có thêm chip "Tình trạng", nhưng `GET /listings` chưa lọc được theo đó nên chưa hiện.
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
  const provinces = useProvinces();
  const template = useCategoryTemplate(filters.categoryId);
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch });
  const close = () => setSheet(null);

  const price = PRICES.find((p) => p.min === filters.minPrice && p.max === filters.maxPrice);
  const priceOn = filters.minPrice !== null || filters.maxPrice !== null;
  const category = categories.data?.find((c) => c.id === filters.categoryId);
  const province = provinces.data?.find((p) => p.code === filters.provinceCode);
  const attrFields = filterableFields(template.data ?? []);
  const attrsOn = Object.keys(filters.attrs).length;
  const active = [filters.provinceCode, filters.categoryId].filter((v) => v !== null).length;
  const count = active + (priceOn ? 1 : 0) + attrsOn;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          <Chip
            dark
            icon="sliders"
            label={count > 0 ? `Bộ lọc · ${count}` : 'Bộ lọc'}
            onPress={() => onChange({ ...NO_FILTERS, q: filters.q })}
          />
          {category && (
            <Chip selected chevron label={category.name} onPress={() => setSheet('category')} />
          )}
          {category && attrFields.length > 0 && (
            <Chip
              chevron
              selected={attrsOn > 0}
              label={attrsOn > 0 ? `Thông tin · ${attrsOn}` : 'Thông tin'}
              onPress={() => setSheet('attrs')}
            />
          )}
          <Chip
            chevron
            selected={province !== undefined}
            label={province?.name ?? 'Toàn quốc'}
            onPress={() => setSheet('province')}
          />
          <Chip
            chevron
            selected={priceOn}
            label={priceOn ? (price?.label ?? 'Giá') : 'Giá'}
            onPress={() => setSheet('price')}
          />
        </View>
      </ScrollView>

      <PickerSheet
        visible={sheet === 'province'}
        title="Khu vực"
        options={[
          { value: ANYWHERE, label: 'Toàn quốc' },
          ...(provinces.data ?? []).map((p) => ({ value: String(p.code), label: p.name })),
        ]}
        value={filters.provinceCode === null ? ANYWHERE : String(filters.provinceCode)}
        onSelect={(code) => set({ provinceCode: code === ANYWHERE ? null : Number(code) })}
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
      <PickerSheet
        visible={sheet === 'category'}
        title="Danh mục"
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={filters.categoryId}
        onSelect={(id) =>
          set(id === filters.categoryId ? { categoryId: id } : { categoryId: id, attrs: {} })
        }
        onClose={close}
      />
      <TemplateFilterSheet
        visible={sheet === 'attrs'}
        fields={attrFields}
        value={filters.attrs}
        onApply={(attrs) => set({ attrs })}
        onClose={close}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: S.sm },
});
