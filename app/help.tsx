import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { Choice } from '@/components/Chip';
import { BotBubble, BotText, QuestionList, UserBubble } from '@/components/HelpThread';
import { IconButton, Loading, OutlineButton, PinButton, useBack } from '@/components/ui';
import { useHelpTopics, useMe } from '@/queries/account';
import { useOpenConversation } from '@/queries/messages';
import { C, F, R, S } from '@/theme';

/**
 * Trợ giúp dạng hội thoại: chọn chủ đề → chọn câu hỏi → đọc trả lời → "Đã giải quyết" hoặc chat admin.
 * Ô gõ phía dưới lọc câu hỏi của mọi chủ đề, để người biết mình muốn hỏi gì khỏi bấm qua từng tầng.
 */
export default function Help() {
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const me = useMe();
  const topics = useHelpTopics();
  const openChat = useOpenConversation();
  const [topicId, setTopicId] = useState<string | null>(null);
  const [faq, setFaq] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);
  const [query, setQuery] = useState('');

  const pick = (id: string | null, index: number | null) => {
    setTopicId(id);
    setFaq(index);
    setResolved(false);
    setQuery('');
  };
  const chatAdmin = () =>
    openChat.mutate(
      { kind: 'support' },
      { onSuccess: (cid) => router.push(`/chat/${cid}`), onError: (e) => toast(e.message) },
    );

  const topic = topics.data?.find((t) => t.id === topicId);
  const answer = topic && faq !== null ? topic.faqs[faq] : undefined;
  const q = query.trim().toLowerCase();
  const matches =
    q === ''
      ? []
      : (topics.data ?? []).flatMap((t) =>
          t.faqs.flatMap((f, i) => (f.q.toLowerCase().includes(q) ? [{ t, f, i }] : [])),
        );
  const firstName = me.data?.name.split(' ').at(-1);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
        <View style={styles.badge}>
          <Feather name="help-circle" size={22} color={C.brand} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>Trợ giúp</Text>
          <Text style={styles.small}>Trả lời tự động · Admin hỗ trợ 8:00 – 22:00</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BotBubble>
          <BotText>
            Xin chào{firstName ? ` ${firstName}` : ''}! Bạn cần hỗ trợ về vấn đề nào?
          </BotText>
        </BotBubble>
        {topics.isPending ? (
          <Loading />
        ) : (
          <View style={styles.topics}>
            {topics.data?.map((t) => (
              <View key={t.id} style={styles.topic}>
                <Choice
                  align="left"
                  label={t.label}
                  selected={t.id === topicId}
                  onPress={() => pick(t.id, null)}
                />
              </View>
            ))}
          </View>
        )}

        {matches.length > 0 && (
          <QuestionList
            title={`Câu hỏi khớp “${query.trim()}”:`}
            items={matches.map((m) => ({ q: m.f.q, onPress: () => pick(m.t.id, m.i) }))}
          />
        )}

        {topic && q === '' && (
          <>
            <UserBubble text={topic.label} />
            <QuestionList
              title="Câu hỏi thường gặp:"
              items={topic.faqs.map((f, i) => ({ q: f.q, onPress: () => pick(topic.id, i) }))}
            />
          </>
        )}

        {answer && q === '' && (
          <>
            <UserBubble text={answer.q} />
            <BotBubble wide>
              <BotText>{answer.a}</BotText>
              {!resolved && (
                <View style={styles.actions}>
                  <View style={styles.flex}>
                    <OutlineButton
                      compact
                      label="Đã giải quyết"
                      onPress={() => setResolved(true)}
                    />
                  </View>
                  <View style={styles.flex}>
                    <PinButton
                      compact
                      label="Chat với admin"
                      onPress={chatAdmin}
                      loading={openChat.isPending}
                    />
                  </View>
                </View>
              )}
            </BotBubble>
          </>
        )}

        {resolved && q === '' && (
          <BotBubble success>
            <BotText success>Cảm ơn bạn! Rất vui vì đã giúp được.</BotText>
            <OutlineButton compact label="Hỏi câu khác" onPress={() => pick(null, null)} />
          </BotBubble>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Feather name="search" size={18} color={C.inkSoft} />
            <TextInput
              accessibilityLabel="Tìm câu hỏi"
              value={query}
              onChangeText={setQuery}
              placeholder="Gõ câu hỏi, ví dụ: cách đẩy tin"
              placeholderTextColor={C.muted}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chat với admin"
            onPress={chatAdmin}
            style={styles.admin}
          >
            <Feather name="user" size={20} color={C.paperWarm} />
          </Pressable>
        </View>
        <Text style={styles.note}>Admin không bao giờ yêu cầu chuyển khoản qua tin nhắn.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: S.sm,
    paddingRight: S.sm,
    paddingLeft: S.xs,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: R.sm,
    backgroundColor: C.brandLt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  content: { padding: S.lg, gap: S.md },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  topic: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  footer: {
    paddingTop: 10,
    paddingHorizontal: S.md,
    paddingBottom: S.sm,
    gap: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: R.full,
    backgroundColor: C.sand,
  },
  searchInput: { flex: 1, fontFamily: F.ui, fontSize: 14, color: C.ink, paddingVertical: 0 },
  admin: {
    width: 46,
    height: 46,
    borderRadius: R.full,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { textAlign: 'center', fontFamily: F.ui, fontSize: 11, color: C.inkSoft },
});
