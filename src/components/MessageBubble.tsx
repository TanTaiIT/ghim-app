import { StyleSheet, Text, View } from 'react-native';
import type { Message } from '@/api/client';
import { MessagePhotos } from './MessagePhotos';
import { C, F, R, S } from '@/theme';

/** Bong bóng tin chữ: ảnh (nếu có) trên, chữ dưới; tin chỉ có ảnh thì không có dòng chữ trống. */
export function MessageBubble({ message }: { message: Extract<Message, { kind: 'text' }> }) {
  const { mine, text, photos } = message;
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <MessagePhotos photos={photos} />
      {text !== '' && <Text style={[styles.text, mine && styles.mineText]}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '78%', gap: S.sm, paddingVertical: 10, paddingHorizontal: 14 },
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
  text: { fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
  mineText: { color: C.paperWarm },
});
