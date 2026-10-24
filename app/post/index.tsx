import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PickerSheet } from '@/components/PickerSheet';
import { StepHeader, useClosePost } from '@/components/StepHeader';
import { useToast } from '@/components/Toast';
import { PinButton } from '@/components/ui';
import { useCategories } from '@/queries/catalog';
import { useSaveDraft, useUploadPhoto } from '@/queries/posting';
import { MAX_PHOTOS, MAX_TITLE, snapshotDraft, useDraftStore } from '@/stores/draft';
import { C, F, R, S } from '@/theme';

/**
 * Bước 1 — ảnh, tiêu đề, danh mục. Thiết kế có thêm "Tình trạng" và "Gợi ý theo tiêu đề", nhưng server chưa
 * có trường tình trạng hay chỗ nào gợi ý danh mục nên hai phần đó chưa hiện.
 */
export default function PostPhotos() {
  const router = useRouter();
  const toast = useToast();
  const close = useClosePost();
  const params = useLocalSearchParams<{ edit?: string; group?: string; placement?: string }>();
  const [picking, setPicking] = useState(false);

  const photos = useDraftStore((s) => s.photos);
  const title = useDraftStore((s) => s.title);
  const categoryId = useDraftStore((s) => s.categoryId);
  const editingLive = useDraftStore((s) => s.editingLive);
  const patch = useDraftStore((s) => s.patch);
  const addPhotos = useDraftStore((s) => s.addPhotos);
  const setPhoto = useDraftStore((s) => s.setPhoto);
  const removePhoto = useDraftStore((s) => s.removePhoto);

  const categories = useCategories();
  const upload = useUploadPhoto();
  const save = useSaveDraft();

  // Mở từ nút "Đăng tin" trong khi form còn giữ một tin đang hiển thị (bấm Sửa rồi đóng): bắt đầu tin mới,
  // không để người đăng tưởng mình đang đăng tin mới mà thật ra đang sửa tin cũ.
  useEffect(() => {
    if (!params.edit && useDraftStore.getState().editingLive) useDraftStore.getState().reset();
  }, [params.edit]);

  // Mở từ "Đăng tin vào nhóm…": chọn sẵn nhóm đó ở bước 2 — người đăng vẫn đổi được trước khi gửi. Phụ thuộc đúng
  // hai giá trị, không theo cả `params`: màn này còn render lại khi ảnh tải xong, lúc người đăng đã đổi ở bước 2.
  const { group, placement } = params;
  useEffect(() => {
    if (group && (placement === 'group_public' || placement === 'members_only')) {
      useDraftStore.getState().patch({ placement, groupId: group, badgeGroupId: null });
    }
  }, [group, placement]);

  const category = categories.data?.find((c) => c.id === categoryId);
  const ready = photos.some((p) => !p.failed) && title.trim() !== '' && category !== undefined;

  /** Picker trả bản gốc (`quality: 1`): nén một lần duy nhất ở `api.uploadPhoto`, không nén hai lần. */
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 1,
    });
    if (res.canceled) return;
    const picked = res.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
    addPhotos(picked).forEach((key, i) => {
      const photo = picked[i];
      if (photo) upload.mutate({ key, photo });
    });
  };

  const retry = (key: string) => {
    const p = photos.find((x) => x.key === key);
    if (!p) return;
    setPhoto(key, { failed: false });
    upload.mutate({ key, photo: p });
  };

  const saveDraft = () =>
    save.mutate(snapshotDraft(), {
      onSuccess: () => {
        useDraftStore.getState().reset();
        close();
        toast('Đã lưu nháp — làm tiếp ở Cá nhân › Đang đăng');
      },
      onError: (e) => toast(e.message),
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader
        step={1}
        title={editingLive ? 'Sửa tin' : 'Đăng tin mới'}
        caption="Ảnh & thông tin chính"
        onSaveDraft={editingLive ? undefined : saveDraft}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoGrid
          photos={photos.map((p) => ({
            key: p.key,
            uri: p.uri,
            uploaded: p.imageId !== null,
            failed: p.failed,
            rejected: p.rejected,
          }))}
          max={MAX_PHOTOS}
          onAdd={() => void pick().catch((e: Error) => toast(e.message))}
          onRemove={removePhoto}
          onRetry={retry}
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
              {category?.name ?? 'Chọn danh mục'}
            </Text>
            <Feather name="chevron-down" size={18} color={C.ink} />
          </Pressable>
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
        // Đổi danh mục là đổi mẫu thông số: giá trị của mẫu cũ không còn nghĩa.
        onSelect={(id) => patch({ categoryId: id, attributes: {} })}
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
  footer: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
});
