import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { useSetPushEnabled } from '@/queries/push';
import { useNotificationPrefs, useSetNotificationPref } from '@/queries/settings';
import { ALWAYS_ON_NOTIFICATIONS, NOTIFICATION_CATEGORY_LABEL } from '@/api/client';
import { PUSH_SUPPORTED } from '@/api/push';
import { usePushOff } from '@/stores/auth';
import { C, F, R, S } from '@/theme';

/**
 * Bật tắt từng nhóm thông báo (spec notification/preferences). Tắt chỉ thôi nhắc — thông báo vẫn vào mục Thông báo.
 * "Tài khoản" luôn bật: công tắc hiện nhưng khoá, để người dùng biết vì sao không tắt được. Tắt tiếng từng nhóm (cộng
 * đồng) nằm ở trang nhóm đó. Công tắc đầu trang là của máy này (thông báo đẩy), không phải của tài khoản.
 */
export default function NotificationSettings() {
  const toast = useToast();
  const prefs = useNotificationPrefs();
  const set = useSetNotificationPref();
  const pushOff = usePushOff();
  const push = useSetPushEnabled();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Thông báo" />
      {prefs.isPending ? (
        <Loading />
      ) : prefs.isError ? (
        <EmptyState icon="bell-off" text={prefs.error.message} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {PUSH_SUPPORTED && (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.body}>
                  <Text style={styles.label}>Thông báo trên máy này</Text>
                  <Text style={styles.meta}>
                    Tắt thì máy này thôi nhắc; mọi thông báo vẫn vào mục Thông báo
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Thông báo trên máy này"
                  value={!pushOff}
                  disabled={push.isPending}
                  trackColor={{ true: C.brand, false: C.lineStrong }}
                  thumbColor={C.paperWarm}
                  onValueChange={(enabled) =>
                    push.mutate(enabled, {
                      onSuccess: (ok) => {
                        if (!ok)
                          toast(
                            'Máy chưa cho Ghim gửi thông báo — bật trong cài đặt của điện thoại',
                          );
                      },
                      onError: (e) => toast(e.message),
                    })
                  }
                />
              </View>
            </View>
          )}
          <Text style={styles.note}>
            Tắt một nhóm thì thông báo của nhóm đó vẫn vào mục Thông báo, chỉ không nhắc. Muốn tắt
            tiếng riêng một nhóm cộng đồng, vào trang nhóm đó.
          </Text>
          <View style={styles.card}>
            {prefs.data.map((p, i) => {
              const locked = ALWAYS_ON_NOTIFICATIONS.has(p.category);
              return (
                <View key={p.category} style={[styles.row, i > 0 && styles.line]}>
                  <View style={styles.body}>
                    <Text style={styles.label}>{NOTIFICATION_CATEGORY_LABEL[p.category]}</Text>
                    {locked && <Text style={styles.meta}>Luôn bật — tin về bảo mật tài khoản</Text>}
                  </View>
                  <Switch
                    accessibilityLabel={NOTIFICATION_CATEGORY_LABEL[p.category]}
                    value={p.enabled}
                    disabled={locked}
                    trackColor={{ true: C.brand, false: C.lineStrong }}
                    thumbColor={C.paperWarm}
                    onValueChange={(enabled) =>
                      set.mutate(
                        { category: p.category, enabled },
                        { onError: (e) => toast(e.message) },
                      )
                    }
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  card: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  line: { borderTopWidth: 1, borderTopColor: C.line },
  body: { flex: 1, gap: 2, paddingVertical: S.sm },
  label: { fontFamily: F.uiMedium, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
