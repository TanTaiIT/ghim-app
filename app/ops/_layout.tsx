import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { TwoFactorGate } from '@/components/TwoFactorGate';
import { EmptyState, Loading } from '@/components/ui';
import { useConfirmTwoFactor, useStartTwoFactor } from '@/queries/ops-people';
import { useOpsTasks } from '@/queries/ops-review';
import { ApiError } from '@/api/http';
import { C } from '@/theme';

/**
 * Bàn vận hành (master, staff) — khu riêng trong app, header tối, thanh tab riêng. Cổng vào là chính hàng chờ "mọi việc":
 * server chặn mọi `/ops/*` theo cùng một luật (staff hay master, có lớp thứ hai), nên lỗi của nó nói đúng ai được vào.
 */
export default function OpsLayout() {
  const toast = useToast();
  const gate = useOpsTasks(null);
  const start = useStartTwoFactor();
  const confirm = useConfirmTwoFactor();
  const [setup, setSetup] = useState<{ uri: string; secret: string } | null>(null);
  const code = gate.error instanceof ApiError ? gate.error.code : null;

  if (gate.isPending) return <Loading />;
  if (code === 'TWO_FACTOR_REQUIRED') {
    return (
      <TwoFactorGate
        setup={setup}
        starting={start.isPending}
        confirming={confirm.isPending}
        onStart={() =>
          start.mutate(undefined, { onSuccess: setSetup, onError: (e) => toast(e.message) })
        }
        onConfirm={(c) =>
          confirm.mutate(c, {
            onSuccess: () => toast('Đã bật lớp bảo vệ thứ hai'),
            onError: (e) => toast(e.message),
          })
        }
      />
    );
  }
  if (gate.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Bàn vận hành" />
        <EmptyState
          icon={code === 'FORBIDDEN' ? 'lock' : 'wifi-off'}
          text={
            code === 'FORBIDDEN'
              ? 'Tài khoản này không có quyền master hay staff.'
              : gate.error.message
          }
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.paper } });
