import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { C, F, R, S } from '@/theme';

/* Bong bóng của màn Trợ giúp: lời bot (trái), lựa chọn của người dùng (phải), danh sách câu hỏi. */

/** `success` cho lời cảm ơn sau "Đã giải quyết"; `wide` cho bong bóng chứa nút bấm. */
export function BotBubble({
  children,
  wide = false,
  success = false,
}: {
  children: ReactNode;
  wide?: boolean;
  success?: boolean;
}) {
  return (
    <View style={[styles.bot, wide && styles.wide, success && styles.success]}>{children}</View>
  );
}

export function BotText({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <Text style={[styles.body, success && styles.successText]}>{children}</Text>;
}

export function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.mine}>
      <Text style={styles.mineText}>{text}</Text>
    </View>
  );
}

export function QuestionList({
  title,
  items,
}: {
  title: string;
  items: { q: string; onPress: () => void }[];
}) {
  return (
    <BotBubble wide>
      <BotText>{title}</BotText>
      {items.map((it) => (
        <Pressable
          key={it.q}
          accessibilityRole="button"
          onPress={it.onPress}
          style={styles.question}
        >
          <Text style={styles.questionText}>{it.q}</Text>
          <Feather name="chevron-right" size={14} color={C.brand} />
        </Pressable>
      ))}
    </BotBubble>
  );
}

const styles = StyleSheet.create({
  bot: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    padding: S.md,
    gap: S.sm,
    borderRadius: R.lg,
    borderBottomLeftRadius: R.xs,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  wide: { width: '86%' },
  success: { borderColor: C.brandLine, backgroundColor: C.brandWash },
  body: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.ink },
  successText: { color: C.brandDark },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: R.lg,
    borderBottomRightRadius: R.xs,
    backgroundColor: C.brand,
  },
  mineText: { fontFamily: F.ui, fontSize: 14, color: C.paperWarm },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.sm,
    minHeight: 44,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.sand,
  },
  questionText: { flex: 1, fontFamily: F.uiMedium, fontSize: 13, color: C.ink },
});
