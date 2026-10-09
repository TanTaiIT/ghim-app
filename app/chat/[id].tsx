import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatComposer } from '@/components/ChatComposer';
import { OfferBubble } from '@/components/OfferBubble';
import { Photo } from '@/components/Photo';
import { useToast } from '@/components/Toast';
import { Avatar, Verified } from '@/components/Avatar';
import { EmptyState, IconButton, Loading, Price, SafetyNote, useBack } from '@/components/ui';
import {
  useConversation,
  useMarkConversationRead,
  useRespondOffer,
  useSendMessage,
  useSendOffer,
} from '@/queries/messages';
import { C, F, R, S } from '@/theme';
import { formatDay } from '@/utils/format';

const SOON = 'Tính năng này sẽ có khi nối backend';

export default function Chat() {
  const { id = '', offer } = useLocalSearchParams<{ id: string; offer?: string }>();
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList>(null);
  const [mode, setMode] = useState<'text' | 'offer'>(offer ? 'offer' : 'text');

  const conversation = useConversation(id);
  const send = useSendMessage(id);
  const sendOffer = useSendOffer(id);
  const respond = useRespondOffer(id);
  const { mutate: markRead } = useMarkConversationRead();

  // Mở hội thoại = đã đọc; badge ở thanh điều hướng đếm lại khi danh sách hội thoại refetch.
  useEffect(() => {
    if (id) markRead(id);
  }, [id, markRead]);

  if (conversation.isPending) return <Loading />;
  if (conversation.isError) {
    return (
      <SafeAreaView style={styles.screen}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
        <EmptyState icon="message-circle" text={conversation.error.message} />
      </SafeAreaView>
    );
  }

  const { peer, listing, messages } = conversation.data;
  const first = messages[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
        <View>
          <Avatar name={peer.name} size={42} tone="solid" />
          {peer.online && <View style={styles.online} />}
        </View>
        <View style={styles.peer}>
          <View style={styles.peerName}>
            <Text style={styles.name} numberOfLines={1}>
              {peer.name}
            </Text>
            {peer.verified && <Verified size={14} />}
          </View>
          <Text style={[styles.status, peer.online && styles.statusOn]}>
            {peer.online ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </Text>
        </View>
        <IconButton icon="phone" label="Gọi" onPress={() => toast(SOON)} />
        <IconButton icon="more-vertical" label="Tuỳ chọn khác" onPress={() => toast(SOON)} />
      </View>

      {listing && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/listing/${listing.id}`)}
          style={styles.strip}
        >
          <Photo picture={listing.cover} style={styles.stripThumb} />
          <View style={styles.stripBody}>
            <Text style={styles.stripTitle} numberOfLines={1}>
              {listing.title}
            </Text>
            <Price value={listing.price} size={14} />
          </View>
          <View style={styles.stripCta}>
            <Text style={styles.stripCtaText}>Xem tin</Text>
          </View>
        </Pressable>
      )}

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
          sending={send.isPending || sendOffer.isPending}
          bottomInset={insets.bottom}
          onAttach={() => toast('Gửi ảnh cần add-media ở backend')}
          onSendText={(text) => send.mutate(text, { onError: (e) => toast(e.message) })}
          onSendOffer={(amount) => sendOffer.mutate(amount, { onError: (e) => toast(e.message) })}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: S.xs,
    paddingBottom: 10,
    paddingRight: S.sm,
    paddingLeft: S.xs,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  online: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.paperWarm,
    backgroundColor: C.brandBright,
  },
  peer: { flex: 1, gap: 1 },
  peerName: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  status: { fontFamily: F.uiMedium, fontSize: 12, color: C.muted },
  statusOn: { color: C.brandTx },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: 10,
    paddingHorizontal: S.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  stripThumb: { width: 48, height: 48, borderRadius: R.sm },
  stripBody: { flex: 1, minWidth: 0, gap: 2 },
  stripTitle: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  stripCta: {
    height: 32,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.sand,
    justifyContent: 'center',
  },
  stripCtaText: { fontFamily: F.uiBold, fontSize: 12, color: C.ink },
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
