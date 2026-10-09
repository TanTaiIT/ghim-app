import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { PickerSheet } from '@/components/PickerSheet';
import { StepHeader, useClosePost } from '@/components/StepHeader';
import { useToast } from '@/components/Toast';
import { Avatar } from '@/components/Avatar';
import { Check } from '@/components/Chip';
import { PinButton } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useMyGroups } from '@/queries/groups';
import { useCategories, useDistricts, usePriceHint } from '@/queries/selling';
import { DEFAULT_CITY, toCategoryId } from '@/api/client';
import { useDraftStore } from '@/stores/draft';
import { C, F, R, S } from '@/theme';
import { formatMillionRange, groupThousands, parseDigits } from '@/utils/format';

/** Bước 2 — giá, thông số, mô tả, khu vực, nơi hiển thị. */
export default function PostDetails() {
  const router = useRouter();
  const toast = useToast();
  const close = useClosePost();
  const [picking, setPicking] = useState(false);

  const d = useDraftStore();
  const me = useMe();
  const groups = useMyGroups();
  const categories = useCategories();
  const districts = useDistricts();
  const hint = usePriceHint(toCategoryId(d.categoryId));

  const specKeys = categories.data?.find((c) => c.id === d.categoryId)?.specKeys ?? [];
  const place = d.place ?? me.data?.place;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader
        step={2}
        caption="Giá, mô tả & nơi hiển thị"
        onSaveDraft={() => {
          close();
          toast('Đã lưu nháp — mở lại Đăng tin để làm tiếp');
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.h2}>Giá bán</Text>
          <View style={styles.price}>
            <TextInput
              accessibilityLabel="Giá bán"
              value={d.price > 0 ? groupThousands(d.price) : ''}
              onChangeText={(t) => d.patch({ price: parseDigits(t) })}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.muted}
              style={styles.priceInput}
            />
            <Text style={styles.unit}>đ</Text>
          </View>
          {hint.data && (
            <Text style={styles.small}>
              Tin tương tự gần bạn đang được rao quanh{' '}
              <Text style={styles.strong}>{formatMillionRange(hint.data.min, hint.data.max)}</Text>.
            </Text>
          )}
          <Check
            label="Cho phép người mua trả giá"
            checked={d.allowOffers}
            onPress={() => d.patch({ allowOffers: !d.allowOffers })}
          />
        </View>

        {specKeys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>Thông số</Text>
            <View style={styles.specs}>
              {specKeys.map((key) => (
                <View key={key} style={styles.spec}>
                  <Field
                    label={key}
                    value={d.specs[key] ?? ''}
                    onChangeText={(v) => d.patch({ specs: { ...d.specs, [key]: v } })}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <Field
          label="Mô tả chi tiết"
          multiline
          value={d.description}
          onChangeText={(t) => d.patch({ description: t })}
          placeholder="Tình trạng, phụ kiện kèm theo, bảo hành, nơi xem hàng…"
        />

        <View style={styles.section}>
          <Text style={styles.h2}>Khu vực</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicking(true)}
            style={styles.select}
          >
            <Feather name="map-pin" size={18} color={C.brand} />
            <Text style={styles.selectText}>
              {place ? `${place.district}, ${place.city}` : 'Chọn khu vực'}
            </Text>
            <Feather name="chevron-down" size={18} color={C.ink} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Hiển thị tin ở đâu?</Text>
          <View style={[styles.where, styles.whereFixed]}>
            <Feather name="globe" size={20} color={C.brand} />
            <View style={styles.flex}>
              <Text style={styles.whereTitle}>Toàn sàn</Text>
              <Text style={styles.small}>Mọi người đều tìm thấy tin của bạn</Text>
            </View>
            <Feather name="check-circle" size={22} color={C.brand} accessibilityLabel="Luôn bật" />
          </View>
          {groups.data?.map((g) => {
            const on = d.groupIds.includes(g.id);
            return (
              <Pressable
                key={g.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => d.toggleGroup(g.id)}
                style={[styles.where, on && styles.whereOn]}
              >
                <Avatar name={g.initials} size={36} tone="brand" />
                <View style={styles.flex}>
                  <Text style={styles.whereTitle}>{g.name}</Text>
                  <Text style={styles.small}>
                    {g.visibility === 'public'
                      ? 'Nhóm công khai · tin hiện cả khi tìm kiếm'
                      : 'Nhóm kín · chỉ thành viên nhìn thấy'}
                  </Text>
                </View>
                <Check checked={on} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PinButton
          label="Tiếp theo: Xem trước"
          icon="chevron-right"
          iconRight
          disabled={d.price <= 0}
          onPress={() => router.push('/post/preview')}
        />
      </View>

      <PickerSheet
        visible={picking}
        title="Khu vực"
        options={(districts.data ?? []).map((x) => ({ value: x, label: `${x}, ${DEFAULT_CITY}` }))}
        value={place?.district ?? null}
        onSelect={(district) => d.patch({ place: { district, city: DEFAULT_CITY } })}
        onClose={() => setPicking(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  flex: { flex: 1 },
  content: { padding: S.lg, paddingTop: 18, gap: 22 },
  section: { gap: S.sm },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  strong: { fontFamily: F.uiBold, color: C.ink },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.brandBright,
  },
  priceInput: { flex: 1, fontFamily: F.uiBlack, fontSize: 17, color: C.price, paddingVertical: 0 },
  unit: { fontFamily: F.uiBold, fontSize: 15, color: C.inkSoft },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  spec: { flexGrow: 1, flexBasis: '40%' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
  },
  selectText: { flex: 1, fontFamily: F.ui, fontSize: 15, color: C.ink },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
  },
  whereFixed: { borderWidth: 0, backgroundColor: C.sand },
  whereOn: { borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.brandWash },
  whereTitle: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  footer: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
});
