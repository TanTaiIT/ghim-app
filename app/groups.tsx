import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { GroupRow } from '@/components/GroupRow';
import { useToast } from '@/components/Toast';
import {
  EmptyState,
  Loading,
  OutlineButton,
  PinButton,
  ScreenHeader,
  SectionTitle,
} from '@/components/ui';
import {
  useAnswerInvitation,
  useAnswerOwnerOffer,
  useGroupCode,
  useGroupInvites,
  useGroupSearch,
  useJoinFromRoster,
  useMyGroups,
} from '@/queries/groups';
import { GROUP_ROLE_TAG, type GroupSummary } from '@/api/client';
import { C, F, S } from '@/theme';
import { daysUntil, groupThousands } from '@/utils/format';

const metaOf = (g: GroupSummary) =>
  `${groupThousands(g.memberCount)} thành viên${g.description ? ` · ${g.description}` : ''}`;

const OFFER_META: Record<'assignment' | 'transfer', string> = {
  assignment: 'Ghim giao bạn làm chủ nhóm',
  transfer: 'Chủ nhóm chuyển quyền chủ cho bạn',
};

/**
 * "Nhóm của tôi": lời mời đang chờ (nhận làm chủ, vào nhóm, danh sách lớp), nhóm đang ở, tìm nhóm công khai theo
 * tên, tìm nhóm riêng tư bằng mã. Bộ UI không có màn này — thiếu nó, người chưa ở nhóm nào không có đường vào nhóm.
 */
export default function MyGroups() {
  const router = useRouter();
  const toast = useToast();
  const mine = useMyGroups();
  const invites = useGroupInvites();
  const answer = useAnswerInvitation();
  const answerOffer = useAnswerOwnerOffer();
  const rosterJoin = useJoinFromRoster();
  const [q, setQ] = useState('');
  const search = useGroupSearch(q);
  const [codeText, setCodeText] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const found = useGroupCode(code);

  const open = (id: string) => router.push(`/group/${id}`);
  const fail = (e: Error) => toast(e.message);
  const pending = answer.isPending || answerOffer.isPending || rosterJoin.isPending;
  const invitations = invites.data?.invitations ?? [];
  const rosters = invites.data?.rosters ?? [];
  const offers = invites.data?.ownerOffers ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Nhóm của tôi" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {offers.length + invitations.length + rosters.length > 0 && (
          <SectionTitle title="Lời mời" />
        )}
        {offers.map((o) => (
          <GroupRow
            key={o.id}
            name={o.groupName}
            initials={o.initials}
            meta={`${OFFER_META[o.kind]} · còn ${daysUntil(o.expiresAt)} ngày`}
          >
            <View style={styles.actions}>
              <View style={styles.flex}>
                <PinButton
                  compact
                  label="Nhận làm chủ"
                  disabled={pending}
                  onPress={() =>
                    answerOffer.mutate(
                      { id: o.id, accept: true },
                      {
                        onSuccess: () => {
                          toast(`Bạn đã là chủ nhóm ${o.groupName}`);
                          open(o.groupId);
                        },
                        onError: fail,
                      },
                    )
                  }
                />
              </View>
              <OutlineButton
                compact
                label="Từ chối"
                onPress={() => answerOffer.mutate({ id: o.id, accept: false }, { onError: fail })}
              />
            </View>
          </GroupRow>
        ))}
        {invitations.map((i) => (
          <GroupRow
            key={i.id}
            name={i.groupName}
            initials={i.initials}
            meta={`Mời bạn vào nhóm · còn ${daysUntil(i.expiresAt)} ngày`}
          >
            <View style={styles.actions}>
              <View style={styles.flex}>
                <PinButton
                  compact
                  label="Nhận lời mời"
                  disabled={pending}
                  onPress={() =>
                    answer.mutate(
                      { id: i.id, accept: true },
                      { onSuccess: () => open(i.groupId), onError: fail },
                    )
                  }
                />
              </View>
              <OutlineButton
                compact
                label="Từ chối"
                onPress={() => answer.mutate({ id: i.id, accept: false }, { onError: fail })}
              />
            </View>
          </GroupRow>
        ))}
        {rosters.map((r) => (
          <GroupRow
            key={r.groupId}
            name={r.groupName}
            initials={r.initials}
            meta="Bạn có tên trong danh sách lớp của nhóm — vào là thành viên ngay."
          >
            <PinButton
              compact
              label="Vào nhóm"
              disabled={pending}
              onPress={() =>
                rosterJoin.mutate(r.groupId, { onSuccess: () => open(r.groupId), onError: fail })
              }
            />
          </GroupRow>
        ))}

        <SectionTitle title="Nhóm của bạn" />
        {mine.isPending ? (
          <Loading />
        ) : mine.data?.length ? (
          mine.data.map((g) => (
            <GroupRow
              key={g.id}
              name={g.name}
              initials={g.initials}
              meta={metaOf(g)}
              tag={GROUP_ROLE_TAG[g.role]}
              onPress={() => open(g.id)}
            />
          ))
        ) : (
          <EmptyState icon="users" text="Bạn chưa ở nhóm nào. Tìm nhóm bên dưới để tham gia." />
        )}

        <SectionTitle title="Tìm nhóm" />
        <Field
          label="Tên nhóm công khai"
          value={q}
          onChangeText={setQ}
          placeholder="VD: Phụ huynh lớp 5B"
          returnKeyType="search"
        />
        {search.data?.map((g) => (
          <GroupRow
            key={g.id}
            name={g.name}
            initials={g.initials}
            meta={metaOf(g)}
            onPress={() => open(g.id)}
          />
        ))}
        {search.data?.length === 0 && (
          <Text style={styles.hint}>Không có nhóm công khai nào khớp.</Text>
        )}

        <SectionTitle title="Có mã nhóm?" />
        <Text style={styles.hint}>
          Nhóm riêng tư không hiện khi tìm theo tên — nhập mã quản trị nhóm đưa.
        </Text>
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Field
              label="Mã nhóm"
              value={codeText}
              onChangeText={setCodeText}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <View style={styles.find}>
            <OutlineButton
              label="Tìm"
              onPress={() => codeText.trim() && setCode(codeText.trim())}
            />
          </View>
        </View>
        {found.isError && <Text style={styles.error}>{found.error.message}</Text>}
        {found.data && code && (
          <GroupRow
            name={found.data.name}
            initials={found.data.initials}
            meta={metaOf(found.data)}
            onPress={() =>
              router.push({ pathname: '/group/[id]', params: { id: found.data.id, code } })
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'flex-end', gap: S.sm },
  find: { paddingBottom: 2 },
  hint: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  error: { fontFamily: F.ui, fontSize: 13, color: C.price },
});
