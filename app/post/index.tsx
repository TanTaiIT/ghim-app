import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PickerSheet } from '@/components/PickerSheet';
import { StepHeader, useClosePost } from '@/components/StepHeader';
import { useToast } from '@/components/Toast';
import { Choice } from '@/components/Chip';
import { PinButton } from '@/components/ui';
import { useCategories, useCategorySuggestion, useSamplePhotos } from '@/queries/selling';
import { CONDITIONS, CONDITION_LABEL } from '@/api/client';
import { MAX_PHOTOS, MAX_TITLE, useDraftStore } from '@/stores/draft';
import { C, F, R, S } from '@/theme';

const label = (name: string, brand: string | null) => (brand ? `${name} › ${brand}` : name);

/** Bước 1 — ảnh, tiêu đề, danh mục, tình trạng. */
export default function PostPhotos() {
  const router = useRouter();
  const toast = useToast();
  const close = useClosePost();
  const [picking, setPicking] = useState(false);

  const photos = useDraftStore((s) => s.photos);
  const title = useDraftStore((s) => s.title);
  const categoryId = useDraftStore((s) => s.categoryId);
  const brand = useDraftStore((s) => s.brand);
  const condition = useDraftStore((s) => s.condition);
  const patch = useDraftStore((s) => s.patch);
  const addPhoto = useDraftStore((s) => s.addPhoto);
  const removePhoto = useDraftStore((s) => s.removePhoto);

  const categories = useCategories();
  const suggestion = useCategorySuggestion(title);
  const samples = useSamplePhotos();

  const category = categories.data?.find((c) => c.id === categoryId);
  const hint = suggestion.data;
  const showHint = hint && (hint.category.id !== categoryId || hint.brand !== brand);
  const ready = photos.length > 0 && title.trim() !== '' && category && condition;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader
        step={1}
        caption="Ảnh & thông tin chính"
        onSaveDraft={() => {
          close();
          toast('Đã lưu nháp — mở lại Đăng tin để làm tiếp');
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoGrid
          photos={photos}
          max={MAX_PHOTOS}
          onRemove={removePhoto}
          onAdd={() => {
            const pool = samples.data ?? [];
            const next = pool[photos.length % Math.max(pool.length, 1)];
            if (next) addPhoto(next);
          }}
        />

        <Field
          label="Tiêu đề tin"
          value={title}
          onChangeText={(t) => patch({ title: t })}
          maxLength={MAX_TITLE}
          placeholder="Ví dụ: MacBook Air M1 2020 8GB/256GB"
          hint={`${title.length} / ${MAX_TITLE}`}
        />

        <View style={styles.section}>
          <Text style={styles.h2}>Danh mục</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicking(true)}
            style={styles.select}
          >
            <Text style={[styles.selectText, !category && styles.placeholder]}>
              {category ? label(category.name, brand) : 'Chọn danh mục'}
            </Text>
            <Feather name="chevron-down" size={18} color={C.ink} />
          </Pressable>
          {showHint && (
            <View style={styles.hint}>
              <Feather name="sun" size={18} color={C.brand} />
              <Text style={styles.hintText}>
                Gợi ý theo tiêu đề:{' '}
                <Text style={styles.bold}>{label(hint.category.name, hint.brand)}</Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => patch({ categoryId: hint.category.id, brand: hint.brand })}
                style={styles.apply}
              >
                <Text style={styles.applyText}>Áp dụng</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Tình trạng</Text>
          <View style={styles.choices}>
            {CONDITIONS.map((c) => (
              <Choice
                key={c}
                label={CONDITION_LABEL[c]}
                selected={condition === c}
                onPress={() => patch({ condition: c })}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PinButton
          label="Tiếp theo: Giá & mô tả"
          icon="chevron-right"
          iconRight
          disabled={!ready}
          onPress={() => router.push('/post/details')}
        />
      </View>

      <PickerSheet
        visible={picking}
        title="Chọn danh mục"
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={category?.id ?? null}
        onSelect={(id) => patch({ categoryId: id, brand: null, specs: {} })}
        onClose={() => setPicking(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  content: { padding: S.lg, paddingTop: 18, gap: 22 },
  section: { gap: S.sm },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
  },
  selectText: { fontFamily: F.ui, fontSize: 15, color: C.ink },
  placeholder: { color: C.muted },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.brandLine,
    backgroundColor: C.brandWash,
  },
  hintText: { flex: 1, fontFamily: F.ui, fontSize: 13, color: C.brandDark },
  bold: { fontFamily: F.uiBold },
  apply: {
    height: 32,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.brand,
    justifyContent: 'center',
  },
  applyText: { fontFamily: F.uiBold, fontSize: 12, color: C.paperWarm },
  choices: { flexDirection: 'row', gap: S.sm },
  footer: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
});
