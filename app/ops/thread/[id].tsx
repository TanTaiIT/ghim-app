import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import { useMarkSupportRead, useSendSupport, useSupportThread } from '@/queries/ops-support';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Câu soạn sẵn hay dùng; staff sửa tiếp trước khi gửi. Tin của staff không qua bộ lọc cụm từ cấm (TK 24). */
const MACROS = [
  'Ghim không bao giờ yêu cầu chuyển khoản qua tin nhắn.',
  'Bạn gửi giúp mình ảnh chụp đoạn chat và biên lai chuyển khoản nhé.',
  'Mình đã chuyển việc này cho đội duyệt, có kết quả mình báo bạn.',
];

/**
 * Một hội thoại hỗ trợ. Mở ra là đánh dấu đã đọc cho cả đội — người khác trong đội thấy hội thoại không còn "chưa đọc".
 * Người dùng đã xoá tài khoản thì chỉ đọc được (server: `CONVERSATION_CLOSED`).
 */
export default function OpsSupportThread() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const thread = useSupportThread(id);
  const send = useSendSupport();
  const { mutate: markRead } = useMarkSupportRead();
  const [text, setText] = useState('');
  const scroll = useRef<ScrollView>(null);
  const unread = thread.data?.thread.unread ?? 0;

  // Đánh dấu khi có tin chưa đọc, không phải mỗi lần khung tự tải lại — mỗi lượt là một request ghi.
  useEffect(() => {
    if (unread > 0) markRead(id);
  }, [id, unread, markRead]);

  if (thread.isPending) return <Loading />;
  if (thread.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Hỗ trợ" />
        <EmptyState icon="alert-circle" text={thread.error.message} />
      </View>
    );
  }
  const { thread: head, messages } = thread.data;
  const body = text.trim();

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title={head.personName}
        sub={head.gone ? 'Đã xoá tài khoản — chỉ đọc' : 'Hội thoại hỗ trợ'}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.chat}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 && <EmptyState icon="message-circle" text="Chưa có tin nhắn." />}
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.fromTeam ? styles.out : m.system ? styles.system : styles.in,
              ]}
            >
              <Text style={[styles.text, m.fromTeam && styles.outText]}>{m.body}</Text>
              <Text style={[styles.time, m.fromTeam && styles.outTime]}>
                {m.fromTeam ? 'Đội hỗ trợ' : m.system ? 'Hệ thống' : head.personName} ·{' '}
                {formatAgo(m.at)}
              </Text>
            </View>
          ))}
        </ScrollView>

        {head.canSend ? (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, S.md) }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.macros}
            >
              {MACROS.map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  onPress={() => setText(m)}
                  style={styles.macro}
                >
                  <Text style={styles.macroText} numberOfLines={1}>
                    {m}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.row}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={`Trả lời ${head.personName}…`}
                placeholderTextColor={C.muted}
                multiline
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gửi"
                disabled={body === '' || send.isPending}
                onPress={() =>
                  send.mutate(
                    { id, body },
                    { onSuccess: () => setText(''), onError: (e) => toast(e.message) },
                  )
                }
                style={[styles.send, (body === '' || send.isPending) && styles.sendOff]}
              >
                <Feather name="send" size={20} color={C.paperWarm} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={[styles.closed, { paddingBottom: Math.max(insets.bottom, S.md) }]}>
            Hội thoại đã đóng — không gửi thêm được.
          </Text>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  chat: { padding: S.lg, gap: 10 },
  bubble: {
    maxWidth: '80%',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: R.lg,
  },
  in: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: R.xs,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  system: { alignSelf: 'flex-start', backgroundColor: C.sand },
  out: { alignSelf: 'flex-end', borderBottomRightRadius: R.xs, backgroundColor: C.brand },
  text: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.ink },
  outText: { color: C.paperWarm },
  time: { fontFamily: F.uiMedium, fontSize: 11, color: C.muted },
  outTime: { color: C.brandLine },
  composer: {
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: S.md,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
  },
  macros: { gap: S.sm },
  macro: {
    maxWidth: 260,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: S.md,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.brandLine,
    backgroundColor: C.brandWash,
  },
  macroText: { fontFamily: F.uiSemi, fontSize: 13, color: C.brandDark },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: S.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: S.lg,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: R.lg,
    backgroundColor: C.sand,
    fontFamily: F.ui,
    fontSize: 14,
    color: C.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: R.full,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.45 },
  closed: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
    fontFamily: F.uiMedium,
    fontSize: 13,
    color: C.inkSoft,
    textAlign: 'center',
  },
});
