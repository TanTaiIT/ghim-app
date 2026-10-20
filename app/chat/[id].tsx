import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatComposer } from '@/components/ChatComposer';
import { ChatHeader } from '@/components/ChatHeader';
import { OfferBubble } from '@/components/OfferBubble';
import { ConfirmSheet } from '@/components/PickerSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, SafetyNote, useBack } from '@/components/ui';
import {
  useConversation,
  useConversationViewing,
  useDeleteConversation,
  useMarkConversationRead,
  useReportConversation,
  useRespondOffer,
  useSendMessage,
  useSendOffer,
} from '@/queries/messages';
import { useForeground } from '@/queries/realtime';
import { C, F, R, S } from '@/theme';
import { formatDay } from '@/utils/format';

/** Server giữ cờ "đang xem" 10 phút: gọi lại giữa chừng để cờ không tắt khi người dùng còn đọc. */
const VIEWING_RENEW_MS = 5 * 60_000;

export default function Chat() {
  const { id = '', offer } = useLocalSearchParams<{ id: string; offer?: string }>();
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList>(null);
  const [mode, setMode] = useState<'text' | 'offer'>(offer ? 'offer' : 'text');
  const [sheet, setSheet] = useState<'report' | 'delete' | null>(null);

  const conversation = useConversation(id);
  const send = useSendMessage(id);
  const sendOffer = useSendOffer(id);
  const respond = useRespondOffer(id);
  const report = useReportConversation();
  const remove = useDeleteConversation();
  const { mutate: markRead } = useMarkConversationRead();
  const { mutate: setViewing } = useConversationViewing();
  const foreground = useForeground();
  const latest = conversation.data?.messages.at(-1)?.id;

  // Đang mở là đã đọc — cả tin tới qua realtime khi màn còn mở; badge đếm lại khi danh sách refetch.
  useEffect(() => {
    if (id && latest) markRead(id);
  }, [id, latest, markRead]);

  // Tin của hội thoại đang mở không đẩy lên máy này. Rời màn hay app xuống nền thì gỡ cờ ngay, kẻo tin tới lúc không
  // ai nhìn màn hình lại không có thông báo.
  useEffect(() => {
    if (!id || !foreground) return undefined;
    setViewing({ id, viewing: true });
    const timer = setInterval(() => setViewing({ id, viewing: true }), VIEWING_RENEW_MS);
    return () => {
      clearInterval(timer);
      setViewing({ id, viewing: false });
    };
  }, [id, foreground, setViewing]);

  if (conversation.isPending) return <Loading />;
  if (conversation.isError) {
    return (
      <SafeAreaView style={styles.screen}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
        <EmptyState icon="message-circle" text={conversation.error.message} />
      </SafeAreaView>
    );
  }

  const { kind, messages, isSeller, canOffer, readOnly } = conversation.data;
  const first = messages[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ChatHeader
        conversation={conversation.data}
        onBack={back}
        onOpenListing={(listingId) => router.push(`/listing/${listingId}`)}
        onReport={kind === 'listing' ? () => setSheet('report') : undefined}
        onDelete={() => setSheet('delete')}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={styles.listHead}>
              <SafetyNote text="Không chuyển khoản đặt cọc trước khi xem hàng. Admin không bao giờ yêu cầu chuyển khoản qua tin nhắn." />
              {first && <Text style={styles.day}>{formatDay(first.at)}</Text>}
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'offer' ? (
              <OfferBubble
                offer={item}
                canReply={isSeller && readOnly === null}
                busy={respond.isPending}
                onReply={(status) =>
                  respond.mutate(
                    { messageId: item.id, status },
                    { onError: (e) => toast(e.message) },
                  )
                }
              />
            ) : (
              <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, item.mine && styles.mineText]}>{item.text}</Text>
              </View>
            )
          }
        />
        <ChatComposer
          mode={mode}
          onModeChange={setMode}
          canOffer={canOffer}
          asBuyer={kind === 'listing' && !isSeller}
          readOnly={readOnly}
          sending={send.isPending || sendOffer.isPending}
          bottomInset={insets.bottom}
          onSendText={(text) => send.mutate(text, { onError: (e) => toast(e.message) })}
          onSendOffer={(amount) => sendOffer.mutate(amount, { onError: (e) => toast(e.message) })}
        />
      </KeyboardAvoidingView>

      <ReportSheet
        visible={sheet === 'report'}
        title="Báo cáo người này vì…"
        onClose={() => setSheet(null)}
        onSelect={(category) =>
          report.mutate(
            { id, category },
            {
              onSuccess: () => toast('Đã gửi báo cáo, đội kiểm duyệt sẽ xem xét'),
              onError: (e) => toast(e.message),
            },
          )
        }
      />
      <ConfirmSheet
        visible={sheet === 'delete'}
        title="Xoá hội thoại này?"
        confirmLabel="Xoá hội thoại"
        note="Chỉ xoá khỏi danh sách của bạn — bên kia vẫn thấy đủ tin nhắn"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: () => {
              toast('Đã xoá hội thoại');
              back();
            },
            onError: (e) => toast(e.message),
          })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  messages: { paddingVertical: 14, paddingHorizontal: S.lg, gap: 10 },
  listHead: { gap: 10 },
  day: {
    alignSelf: 'center',
    paddingVertical: S.xs,
    fontFamily: F.ui,
    fontSize: 12,
    color: C.muted,
  },
  bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14 },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: C.brand,
    borderRadius: R.lg,
    borderBottomRightRadius: R.xs,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: C.paperWarm,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.lg,
    borderBottomLeftRadius: R.xs,
  },
  bubbleText: { fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
  mineText: { color: C.paperWarm },
});
