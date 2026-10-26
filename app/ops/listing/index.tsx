import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { listingIdIn } from '@/api/ops';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { PinButton } from '@/components/ui';
import { C, F, S } from '@/theme';

/**
 * Mở một tin để gỡ / khôi phục theo mã. Là lối duy nhất tới tin đã gỡ: người dùng không còn thấy tin đó, và bàn vận
 * hành chưa có danh sách tin theo người đăng — mã lấy từ lời người đăng gửi Hỗ trợ, hay đường dẫn tin họ dán.
 */
export default function OpsListingOpen() {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState('');

  const open = () => {
    const id = listingIdIn(text);
    if (id) router.push(`/ops/listing/${id}`);
    else toast('Không thấy mã tin — dán mã tin hay đường dẫn có mã tin');
  };

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Gỡ / khôi phục tin" sub="Mở tin theo mã" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>
          Tin đang hiện thì mở thẳng từ trang tin. Tin đã gỡ thì người dùng không còn thấy — dán mã
          tin (hay đường dẫn có mã) để khôi phục.
        </Text>
        <Field
          label="Mã tin"
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="VD: 01a1312e-959f-7011-aed7-98a4ad9322d8"
          returnKeyType="go"
          onSubmitEditing={open}
        />
        <PinButton label="Mở tin" disabled={text.trim() === ''} onPress={open} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.lg },
  note: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
});
