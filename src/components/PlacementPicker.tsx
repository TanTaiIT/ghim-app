import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { isPublicGroup, type GroupMode, type Placement } from '@/api/client';
import { Chip } from './Chip';
import type { IconName } from './ui';
import { useGroup, useMyGroups } from '@/queries/groups';
import { C, F, R, S } from '@/theme';

export type Where = { placement: Placement; groupId: string | null; badgeGroupId: string | null };

type Target = { id: string; name: string; mode: GroupMode; member: boolean };

const SCOPE_TEXT: Record<Exclude<Placement, 'marketplace'>, string> = {
  group_public: 'Ai cũng mở được, nhưng tin chỉ nằm trên bảng tin của nhóm — không có ở sàn chung.',
  members_only: 'Chỉ thành viên của nhóm thấy tin.',
};

/**
 * Nhóm đăng được: nhóm mình đang ở (trừ nhóm tạm khoá — server trả 409), cộng nhóm mở từ trang nhóm khi người
 * đăng là người ngoài. Người ngoài chỉ có mức "công khai trong nhóm"; nhóm riêng tư chỉ có "chỉ thành viên"
 * (spec placement).
 */
function useTargets(groupId: string | null): Target[] {
  const mine = useMyGroups();
  const targets = (mine.data ?? [])
    .filter((g) => g.state !== 'locked')
    .map((g) => ({ id: g.id, name: g.name, mode: g.mode, member: true }));
  const outsideId = groupId && !targets.some((t) => t.id === groupId) ? groupId : undefined;
  const outside = useGroup(outsideId).data;
  return outside?.visible && outsideId
    ? [...targets, { id: outside.id, name: outside.name, mode: outside.mode, member: false }]
    : targets;
}

const scopesOf = (t: Target): Exclude<Placement, 'marketplace'>[] => [
  ...(isPublicGroup(t.mode) ? (['group_public'] as const) : []),
  ...(t.member ? (['members_only'] as const) : []),
];

/** Dòng tóm tắt của bước xem trước — cùng nguồn tên nhóm với bảng chọn. */
export function usePlacementLabel(where: Where): string {
  const targets = useTargets(where.groupId);
  const badge = useMyGroups().data?.find((g) => g.id === where.badgeGroupId);
  if (where.placement === 'marketplace') {
    return badge ? `Toàn sàn · huy hiệu «${badge.name}»` : 'Toàn sàn';
  }
  const name = targets.find((t) => t.id === where.groupId)?.name ?? 'Nhóm';
  return `${name} · ${where.placement === 'members_only' ? 'chỉ thành viên' : 'công khai trong nhóm'}`;
}

/**
 * "Hiển thị tin ở đâu?" của bước 2. Người đăng phải tự chọn — server không đoán thay. Huy hiệu "Thành viên «nhóm»"
 * chỉ gắn lên tin sàn chung, và chỉ ở nhóm cho quyền mang huy hiệu.
 */
export function PlacementPicker({
  value,
  onChange,
}: {
  value: Where;
  onChange: (next: Where) => void;
}) {
  const mine = useMyGroups();
  const targets = useTargets(value.groupId);
  const badges = (mine.data ?? []).filter((g) => g.badgeEligible);
  const onMarket = value.placement === 'marketplace';

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Hiển thị tin ở đâu?</Text>
      <Option
        icon="globe"
        title="Toàn sàn"
        text="Mọi người đều tìm thấy tin của bạn"
        selected={onMarket}
        onPress={() => onChange({ ...value, placement: 'marketplace', groupId: null })}
      >
        {onMarket && badges.length > 0 && (
          <View style={styles.extra}>
            <Text style={styles.small}>Gắn dòng &quot;Thành viên nhóm&quot; lên tin</Text>
            <View style={styles.chips}>
              <Chip
                label="Không gắn"
                selected={value.badgeGroupId === null}
                onPress={() => onChange({ ...value, badgeGroupId: null })}
              />
              {badges.map((g) => (
                <Chip
                  key={g.id}
                  label={g.name}
                  selected={value.badgeGroupId === g.id}
                  onPress={() => onChange({ ...value, badgeGroupId: g.id })}
                />
              ))}
            </View>
          </View>
        )}
      </Option>
      {targets.map((t) => {
        const scopes = scopesOf(t);
        const selected = !onMarket && value.groupId === t.id;
        const first = scopes[0];
        if (!first) return null;
        const scope = value.placement === 'marketplace' ? first : value.placement;
        return (
          <Option
            key={t.id}
            icon="users"
            title={t.name}
            text={
              selected
                ? SCOPE_TEXT[scope]
                : t.member
                  ? 'Nhóm của bạn'
                  : 'Gửi vào nhóm với tư cách người ngoài'
            }
            selected={selected}
            onPress={() => onChange({ placement: first, groupId: t.id, badgeGroupId: null })}
          >
            {selected && scopes.length > 1 && (
              <View style={styles.chips}>
                {scopes.map((s) => (
                  <Chip
                    key={s}
                    label={s === 'members_only' ? 'Chỉ thành viên' : 'Công khai trong nhóm'}
                    selected={value.placement === s}
                    onPress={() => onChange({ ...value, placement: s })}
                  />
                ))}
              </View>
            )}
          </Option>
        );
      })}
    </View>
  );
}

function Option({
  icon,
  title,
  text,
  selected,
  onPress,
  children,
}: {
  icon: IconName;
  title: string;
  text: string;
  selected: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionOn]}
    >
      <View style={styles.row}>
        <Feather name={icon} size={20} color={C.brand} />
        <View style={styles.flex}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.small}>{text}</Text>
        </View>
        <Feather
          name={selected ? 'check-circle' : 'circle'}
          size={22}
          color={selected ? C.brand : C.lineStrong}
        />
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.sm },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  flex: { flex: 1 },
  option: {
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  optionOn: { borderColor: C.brandLine, backgroundColor: C.brandWash },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  title: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  extra: { gap: S.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
