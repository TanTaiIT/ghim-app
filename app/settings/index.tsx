import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { MenuList } from '@/components/MenuList';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import {
  EmptyState,
  GhostButton,
  Loading,
  OutlineButton,
  PinButton,
  ScreenHeader,
} from '@/components/ui';
import { useMe } from '@/queries/account';
import { useDeleteAccount, useSetAvatar } from '@/queries/settings';
import { C, S } from '@/theme';

/** Cài đặt tài khoản: ảnh đại diện, lối vào mật khẩu / thiết bị / người đã chặn, xoá tài khoản. */
export default function Settings() {
  const router = useRouter();
  const toast = useToast();
  const me = useMe();
  const avatar = useSetAvatar();
  const removeAccount = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);

  /** Khung vuông vì ảnh hiện trong vòng tròn; picker trả bản gốc, nén một lần duy nhất ở `api.setAvatar`. */
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    const asset = res.canceled ? undefined : res.assets[0];
    if (!asset) return;
    avatar.mutate(
      { uri: asset.uri, width: asset.width, height: asset.height },
      { onSuccess: () => toast('Đã đổi ảnh đại diện'), onError: (e) => toast(e.message) },
    );
  };

  if (me.isPending) return <Loading />;
  if (me.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Cài đặt" />
        <EmptyState icon="wifi-off" text={me.error.message} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Cài đặt" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarRow}>
          <Avatar name={me.data.name} size={72} tone="solid" uri={me.data.avatarUrl} />
          <View style={styles.avatarActions}>
            <PinButton
              compact
              label="Đổi ảnh đại diện"
              loading={avatar.isPending}
              onPress={() => void pick()}
            />
            {me.data.avatarUrl && (
              <OutlineButton
                compact
                label="Bỏ ảnh"
                onPress={() =>
                  avatar.mutate(null, {
                    onSuccess: () => toast('Đã bỏ ảnh đại diện'),
                    onError: (e) => toast(e.message),
                  })
                }
              />
            )}
          </View>
        </View>

        <MenuList
          items={[
            {
              icon: 'lock',
              label: 'Đổi mật khẩu',
              onPress: () => router.push('/settings/password'),
            },
            {
              icon: 'smartphone',
              label: 'Thiết bị đăng nhập',
              onPress: () => router.push('/settings/sessions'),
            },
            {
              icon: 'slash',
              label: 'Người đã chặn',
              onPress: () => router.push('/settings/blocks'),
            },
          ]}
        />
        <GhostButton label="Xoá tài khoản" onPress={() => setConfirming(true)} />
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        title="Xoá tài khoản?"
        confirmLabel="Xoá tài khoản"
        note="Mọi thiết bị bị đăng xuất; hồ sơ và tin đăng của bạn không còn hiện với ai"
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          removeAccount.mutate(undefined, {
            onSuccess: () => toast('Đã xoá tài khoản'),
            onError: (e) => toast(e.message),
          })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.lg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  avatarActions: { flex: 1, gap: S.sm },
});
