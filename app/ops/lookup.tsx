import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { InputSheet } from '@/components/InputSheet';
import { FlagResult, HoldResult } from '@/components/OpsLookupResult';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import { useClearFlag, useFlagLookup, useHoldLookup } from '@/queries/ops-lookup';
import { ApiError } from '@/api/http';
import { normalizeLookupCode } from '@/api/ops';
import { C, F, R, S } from '@/theme';

const status = (e: Error | null) => (e instanceof ApiError ? e.status : null);

/**
 * Tra mã tra cứu người dùng gửi kèm yêu cầu hỗ trợ (master, staff có việc hỗ trợ). Một mã là của một lần máy giữ hoặc
 * của một đánh dấu thiết bị: hỏi cả hai, hiện bên nào có. Đánh dấu trong kết quả lần giữ bấm được để tra tiếp và gỡ.
 */
export default function OpsLookup() {
  const params = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState(params.code ?? '');
  const [code, setCode] = useState<string | null>(
    params.code ? normalizeLookupCode(params.code) : null,
  );
  const [clearing, setClearing] = useState(false);
  const hold = useHoldLookup(code);
  const flag = useFlagLookup(code);
  const clear = useClearFlag(code ?? '');

  const lookup = (next: string) => {
    const normalized = normalizeLookupCode(next);
    setText(normalized);
    setCode(normalized || null);
  };
  const openPerson = (id: string) => router.push({ pathname: '/ops/user/[id]', params: { id } });
  const pending = code !== null && (hold.isPending || flag.isPending);
  const missing = code !== null && !pending && !hold.data && !flag.data;
  const denied = status(hold.error) === 403 || status(flag.error) === 403;

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Tra mã tra cứu" sub="Mã người dùng gửi kèm yêu cầu hỗ trợ" />
      <View style={styles.search}>
        <Feather name="search" size={18} color={C.inkSoft} />
        <TextInput
          accessibilityLabel="Mã tra cứu"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => lookup(text)}
          placeholder="VD: S7KQ2M9XA"
          placeholderTextColor={C.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {code === null ? (
          <EmptyState
            icon="hash"
            text="Nhập mã người dùng gửi — mã một lần máy giữ tin (bắt đầu bằng S) hoặc mã một đánh dấu thiết bị."
          />
        ) : pending ? (
          <Loading />
        ) : missing ? (
          <EmptyState
            icon={denied ? 'lock' : 'search'}
            text={
              denied
                ? (hold.error?.message ?? 'Chỉ master và staff có việc hỗ trợ tra được mã.')
                : `Không có mã ${code}.`
            }
          />
        ) : (
          <>
            {hold.data && (
              <HoldResult hold={hold.data} onOpenPerson={openPerson} onLookup={lookup} />
            )}
            {flag.data && (
              <FlagResult
                flag={flag.data}
                onOpenPerson={openPerson}
                onClear={() => setClearing(true)}
              />
            )}
          </>
        )}
      </ScrollView>

      <InputSheet
        visible={clearing}
        title="Gỡ đánh dấu thiết bị?"
        note="Chỉ gỡ khi đúng là nhầm — vd người dùng vừa mua lại máy cũ. Lượt gửi tin kế tiếp được chấm như mọi tài khoản khác."
        label="Lý do gỡ"
        placeholder="Máy mua lại"
        confirmLabel="Gỡ đánh dấu"
        minLength={3}
        busy={clear.isPending}
        onClose={() => setClearing(false)}
        onSubmit={(reason) =>
          clear.mutate(reason, {
            onSuccess: () => {
              setClearing(false);
              toast('Đã gỡ đánh dấu');
            },
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    margin: S.lg,
    marginBottom: 0,
    paddingHorizontal: S.md,
    height: 48,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  input: { flex: 1, fontFamily: F.uiSemi, fontSize: 16, letterSpacing: 2, color: C.ink },
  content: { padding: S.lg, gap: S.md },
});
