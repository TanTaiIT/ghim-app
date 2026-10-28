import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { PinButton } from '@/components/ui';
import { PRODUCT_SCOPE_LABEL, type NewProduct } from '@/api/ops-admin';
import { PROMOTION_EFFECT_LABEL, type PromotionEffect } from '@/api/promotion';
import { useCreateProduct } from '@/queries/ops-admin';
import { C, F, S } from '@/theme';

const TIERS = ['T0', 'T1', 'T2', 'T3'] as const;
const SCOPES = ['both', 'marketplace', 'group'] as const;
const digits = (t: string) => t.replace(/[^0-9]/g, '');

/** Tạo gói đẩy tin (chỉ master). Mã và hiệu ứng không đổi được sau này — lượt mua chụp lại chúng. */
export default function OpsNewPromotion() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateProduct();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [effect, setEffect] = useState<PromotionEffect>('featured');
  const [days, setDays] = useState('7');
  const [price, setPrice] = useState('');
  const [cooldown, setCooldown] = useState('24');
  const [minTier, setMinTier] = useState<(typeof TIERS)[number]>('T1');
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('both');

  const priceN = Number.parseInt(price, 10);
  const daysN = Number.parseInt(days, 10);
  const cooldownN = Number.parseInt(cooldown, 10);
  const ready =
    /^[a-z0-9_]{2,32}$/.test(code) &&
    name.trim().length > 0 &&
    Number.isInteger(priceN) &&
    priceN >= 1 &&
    Number.isInteger(cooldownN) &&
    (effect === 'rank_to_top' || (Number.isInteger(daysN) && daysN >= 1));

  const submit = () => {
    const body: NewProduct = {
      code,
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      effect,
      ...(effect === 'featured' ? { durationDays: daysN } : {}),
      cooldownHours: cooldownN,
      price: priceN,
      minTier,
      scope,
    };
    create.mutate(body, {
      onSuccess: () => {
        toast(`Đã tạo gói ${name.trim()}`);
        router.back();
      },
      onError: (e) => toast(e.message),
    });
  };

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Thêm gói đẩy tin" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            label="Mã gói"
            value={code}
            onChangeText={(t) => setCode(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="featured_14d"
            autoCapitalize="none"
            hint="2–32 ký tự a–z, 0–9, gạch dưới; không đổi được sau này."
          />
          <Field
            label="Tên"
            value={name}
            onChangeText={setName}
            placeholder="Nổi bật 14 ngày"
            maxLength={80}
          />
          <Field
            label="Mô tả"
            value={description}
            onChangeText={setDescription}
            placeholder="Tin vào dải Tin nổi bật trong 14 ngày."
            maxLength={500}
            multiline
          />
          <Text style={styles.label}>Hiệu ứng</Text>
          <View style={styles.choices}>
            {(Object.keys(PROMOTION_EFFECT_LABEL) as PromotionEffect[]).map((e) => (
              <Choice
                key={e}
                label={PROMOTION_EFFECT_LABEL[e]}
                selected={effect === e}
                onPress={() => setEffect(e)}
              />
            ))}
          </View>
          {effect === 'featured' && (
            <Field
              label="Thời hạn (ngày)"
              value={days}
              onChangeText={(t) => setDays(digits(t))}
              keyboardType="number-pad"
              hint="Tối đa theo con số promotion.featuredMaxDays (khởi đầu 30)."
            />
          )}
          <Field
            label="Giá (Xu)"
            value={price}
            onChangeText={(t) => setPrice(digits(t))}
            keyboardType="number-pad"
            placeholder="4"
          />
          <Field
            label="Chờ giữa hai lần mua cùng gói cho một tin (giờ)"
            value={cooldown}
            onChangeText={(t) => setCooldown(digits(t))}
            keyboardType="number-pad"
            hint="0 = không chờ."
          />
          <Text style={styles.label}>Mức tin cậy tối thiểu</Text>
          <View style={styles.choices}>
            {TIERS.map((t) => (
              <Choice key={t} label={t} selected={minTier === t} onPress={() => setMinTier(t)} />
            ))}
          </View>
          <Text style={styles.label}>Phạm vi</Text>
          <View style={styles.choices}>
            {SCOPES.map((s) => (
              <Choice
                key={s}
                label={PRODUCT_SCOPE_LABEL[s]}
                selected={scope === s}
                onPress={() => setScope(s)}
              />
            ))}
          </View>
          <PinButton
            label="Tạo gói"
            disabled={!ready}
            loading={create.isPending}
            onPress={submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
