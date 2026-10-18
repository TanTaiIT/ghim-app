import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Chip } from './Chip';
import { C, F, R, S } from '@/theme';
import { groupThousands, parseDigits } from '@/utils/format';

/** Câu soạn sẵn cho chip "Hẹn xem hàng" — người mua hay gõ đúng câu này nhất. */
const VIEWING = 'Mình hẹn qua xem hàng được không ạ?';

/**
 * Ô soạn tin + hàng gợi ý nhanh. Hai chế độ: `text` gửi tin nhắn, `offer` gửi đề xuất giá (ô nhập chỉ
 * nhận số, tự chấm hàng nghìn). Gửi đi bằng callback — mutation do route khởi phát (folder §6).
 *
 * `canOffer` theo cờ của server (người mua, tin đang hiển thị, cho thương lượng, giá > 0): app không tự đoán luật
 * trả giá. `asBuyer`: câu "Hẹn xem hàng" là của người mua hỏi về một tin — người bán hay hội thoại với đội không có.
 * Không có nút gửi ảnh — server chưa nhận ảnh trong tin nhắn. `readOnly`: server không cho gửi (có chặn, bên kia đã
 * rời, nhóm đóng…) — thay ô soạn bằng đúng câu giải thích, không để người dùng gõ rồi mới nhận lỗi.
 */
export function ChatComposer({
  mode,
  onModeChange,
  onSendText,
  onSendOffer,
  canOffer,
  asBuyer,
  readOnly,
  sending,
  bottomInset,
}: {
  mode: 'text' | 'offer';
  onModeChange: (mode: 'text' | 'offer') => void;
  onSendText: (text: string) => void;
  onSendOffer: (amount: number) => void;
  canOffer: boolean;
  asBuyer: boolean;
  readOnly: string | null;
  sending: boolean;
  bottomInset: number;
}) {
  const [text, setText] = useState('');
  const offer = canOffer && mode === 'offer';
  const amount = parseDigits(text);
  const canSend = !sending && (offer ? amount > 0 : text.trim() !== '');

  const send = () => {
    if (!canSend) return;
    if (offer) {
      onSendOffer(amount);
      onModeChange('text');
    } else {
      onSendText(text.trim());
    }
    setText('');
  };

  if (readOnly) {
    return (
      <View style={[styles.closed, { paddingBottom: bottomInset + S.md }]}>
        <Text style={styles.closedText}>{readOnly}</Text>
      </View>
    );
  }

  return (
    <View>
      {(asBuyer || canOffer) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quick}>
          <View style={styles.quickRow}>
            {asBuyer && <Chip label="Hẹn xem hàng" onPress={() => onSendText(VIEWING)} />}
            {canOffer && (
              <Chip
                label={offer ? 'Huỷ trả giá' : 'Trả giá'}
                selected={offer}
                onPress={() => {
                  setText('');
                  onModeChange(offer ? 'text' : 'offer');
                }}
              />
            )}
          </View>
        </ScrollView>
      )}
      <View style={[styles.bar, { paddingBottom: bottomInset + S.sm }]}>
        <View style={[styles.input, offer && styles.inputOffer]}>
          <TextInput
            accessibilityLabel={offer ? 'Nhập giá muốn trả' : 'Nhập tin nhắn'}
            value={offer ? (amount > 0 ? groupThousands(amount) : '') : text}
            onChangeText={setText}
            onSubmitEditing={send}
            placeholder={offer ? 'Nhập giá bạn muốn trả' : 'Nhập tin nhắn...'}
            placeholderTextColor={C.muted}
            keyboardType={offer ? 'number-pad' : 'default'}
            autoFocus={offer}
            style={styles.inputText}
          />
          {offer && <Text style={styles.unit}>đ</Text>}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={offer ? 'Gửi đề xuất giá' : 'Gửi'}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={send}
          style={[styles.send, !canSend && styles.sendOff]}
        >
          <Feather name="send" size={19} color={C.paperWarm} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  closed: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
  },
  closedText: { fontFamily: F.uiMedium, fontSize: 13, color: C.inkSoft, textAlign: 'center' },
  quick: { flexGrow: 0, backgroundColor: C.paper },
  quickRow: { flexDirection: 'row', gap: S.sm, paddingVertical: S.sm, paddingHorizontal: S.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingTop: S.sm,
    paddingHorizontal: S.md,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
  },
  input: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: R.full,
    backgroundColor: C.sand,
  },
  inputOffer: { borderWidth: 1.5, borderColor: C.price, backgroundColor: C.warnWash },
  inputText: { flex: 1, fontFamily: F.ui, fontSize: 14, color: C.ink, paddingVertical: 0 },
  unit: { fontFamily: F.uiBold, fontSize: 14, color: C.inkSoft },
  send: {
    width: 44,
    height: 44,
    borderRadius: R.full,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.45 },
});
