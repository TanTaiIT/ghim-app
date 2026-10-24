import {
  isPublicGroup,
  unwrap,
  unwrapEmpty,
  type Group,
  type GroupMember,
  type GroupMode,
  type GroupUnit,
} from './client';
import {
  deleteApiV1GroupsByGroupIdBansByAccountId,
  deleteApiV1GroupsByGroupIdInvitationsByInvitationId,
  deleteApiV1GroupsByGroupIdMembersByAccountId,
  deleteApiV1GroupsByGroupIdModeratorsByAccountId,
  deleteApiV1GroupsByGroupIdOwnerTransfer,
  deleteApiV1GroupsByGroupIdUnitsByUnitId,
  getApiV1GroupsByGroupIdBans,
  getApiV1GroupsByGroupIdInvitations,
  getApiV1GroupsByGroupIdJoinRequests,
  patchApiV1GroupsByGroupIdMembersByAccountId,
  patchApiV1GroupsByGroupIdSettings,
  patchApiV1GroupsByGroupIdUnitsByUnitId,
  postApiV1GroupJoinRequestsByIdDecision,
  postApiV1GroupsByGroupIdAnnouncements,
  postApiV1GroupsByGroupIdClose,
  postApiV1GroupsByGroupIdCode,
  postApiV1GroupsByGroupIdInvitations,
  postApiV1GroupsByGroupIdOwnerTransfer,
  postApiV1GroupsByGroupIdRoster,
  postApiV1GroupsByGroupIdRosterRemove,
  postApiV1GroupsByGroupIdUnits,
  putApiV1GroupsByGroupIdBansByAccountId,
  putApiV1GroupsByGroupIdModeratorsByAccountId,
} from './generated/sdk.gen';
import type {
  GetApiV1GroupsByGroupIdBansResponses,
  GetApiV1GroupsByGroupIdInvitationsResponses,
  GetApiV1GroupsByGroupIdJoinRequestsResponses,
} from './generated/types.gen';

/*
 * Mặt quản trị của nhóm — việc của chủ nhóm và điều hành viên (`group.manage.routes.ts` bên server): đơn xin vào, lời
 * mời, mã nhóm, thành viên, cấm, lớp, danh sách lớp, cài đặt, chuyển chủ, đóng nhóm, thông báo. Server kiểm vai trong
 * nhóm ở từng lượt; app chỉ giấu lối vào theo vai đã biết, lỗi 403 hiện nguyên câu của server. Tách khỏi `client.ts`
 * như `ops.ts`: khác người dùng, khác file route bên server.
 */

/** Đơn đang chờ của một người xin vào; `expiresAt` = lúc đơn tự huỷ nếu chưa ai xử. */
export type PendingJoinRequest = {
  id: string;
  accountId: string;
  name: string;
  createdAt: string;
  expiresAt: string;
};

/** Lời mời đang chờ. `emailHint` đã che (`b***@truong.vn`) — server không trả email đầy đủ cho ai, kể cả chủ nhóm. */
export type PendingInvitation = {
  id: string;
  emailHint: string;
  unitId: string | null;
  createdAt: string;
  expiresAt: string;
};

export type BannedMember = { id: string; name: string; bannedAt: string };

/** Gửi đúng khoá muốn đổi — server đòi ít nhất một. */
export type GroupSettingsPatch = {
  name?: string;
  description?: string | null;
  mode?: GroupMode;
  allowOutsiders?: boolean;
  showNameOnMarketplace?: boolean;
  boardStyle?: 'list' | 'grid';
};

/** Một trang đủ cho một nhóm; `total` cho biết còn bao nhiêu chưa hiện. */
export type Listed<T> = { items: T[]; total: number };

/** Nhóm nhìn từ người có vai quản trị. */
export type ManagedGroup = Extract<Group, { visible: true }> & { role: 'owner' | 'moderator' };

/** Server kiểm vai ở từng lượt; đây chỉ để giấu lối vào và chọn chữ. */
export const managerOf = (g: Group | undefined): ManagedGroup | null =>
  g?.visible && (g.role === 'owner' || g.role === 'moderator') ? { ...g, role: g.role } : null;

/** Chủ nhóm và điều hành viên cả nhóm — việc server đòi `requireManager(ctx, false)`. */
export const isWholeManager = (g: ManagedGroup): boolean =>
  g.role === 'owner' || g.moderatorUnitId === null;

/** `ROSTER_BATCH_MAX` của server: một lượt nạp danh sách lớp tối đa chừng này email. */
export const ROSTER_BATCH_MAX = 500;

/**
 * Hệ quả của việc đổi cách vào, theo spec group-modes — nói trước khi lưu. Riêng tư sang công khai và đổi trong cùng
 * phía không hạ gì thì không có gì để nói (null).
 */
export function modeNoteOf(from: GroupMode, to: GroupMode): string | null {
  if (from === to) return null;
  if (isPublicGroup(from) && !isPublicGroup(to)) {
    return 'Nhóm sang "đang chuyển sang riêng tư" tới khi tin công khai của nhóm hạ xong; "nhận tin người ngoài" tắt.';
  }
  if (from === 'public_review' && to === 'public_open')
    return 'Mọi đơn đang chờ bị huỷ; ai bấm tham gia là vào ngay.';
  if (from === 'private_code' && to === 'private_invite')
    return 'Mã nhóm hết hiệu lực; đơn đang chờ vẫn duyệt được.';
  if (from === 'private_invite' && to === 'private_code') return 'Nhóm sẽ có một mã nhóm mới.';
  return null;
}

export const JOINED_VIA_LABEL: Record<GroupMember['joinedVia'], string> = {
  joined: 'bấm tham gia',
  approved: 'được duyệt',
  invited: 'lời mời',
  roster: 'danh sách lớp',
  assigned: 'được giao',
};

export type MemberAction = 'unit' | 'moderator' | 'dismiss' | 'transfer' | 'remove' | 'ban';

/**
 * Người xem xử được gì trên một thành viên — đúng luật server (`requireCanManageMember`, spec membership "Gỡ thành
 * viên"): không ai xử chủ nhóm; điều hành viên không xử điều hành viên khác; điều hành viên lớp chỉ xử thành viên lớp
 * mình; xếp lớp cần vai cả nhóm; bổ nhiệm / bãi nhiệm / chuyển chủ chỉ chủ nhóm. Server kiểm lại — đây chỉ để không bày
 * nút mà bấm là 403.
 */
export function memberActionsOf(
  viewer: { role: 'owner' | 'moderator'; moderatorUnitId: string | null; hasUnits: boolean },
  target: Pick<GroupMember, 'role' | 'unitId'>,
): MemberAction[] {
  if (target.role === 'owner') return [];
  const unitAction: MemberAction[] = viewer.hasUnits ? ['unit'] : [];
  if (viewer.role === 'moderator') {
    if (target.role !== 'member') return [];
    if (viewer.moderatorUnitId === null) return [...unitAction, 'remove', 'ban'];
    return target.unitId === viewer.moderatorUnitId ? ['remove', 'ban'] : [];
  }
  return [
    ...unitAction,
    target.role === 'moderator' ? 'dismiss' : 'moderator',
    'transfer',
    'remove',
    'ban',
  ];
}

/** Trần `limit` của server (`MAX_LIMIT` trong `common/schemas/pagination`). */
const MANAGE_PAGE = 100;

type WireJoinRequest = GetApiV1GroupsByGroupIdJoinRequestsResponses[200]['data']['items'][number];
type WireInvitation = GetApiV1GroupsByGroupIdInvitationsResponses[200]['data']['items'][number];
type WireBan = GetApiV1GroupsByGroupIdBansResponses[200]['data']['items'][number];

const toJoinRequest = (w: WireJoinRequest): PendingJoinRequest => ({
  id: w.id,
  accountId: w.accountId,
  name: w.displayName,
  createdAt: w.createdAt,
  expiresAt: w.expiresAt,
});

const toInvitation = ({
  id,
  emailHint,
  unitId,
  createdAt,
  expiresAt,
}: WireInvitation): PendingInvitation => ({ id, emailHint, unitId, createdAt, expiresAt });

const toBanned = (w: WireBan): BannedMember => ({
  id: w.accountId,
  name: w.displayName,
  bannedAt: w.bannedAt,
});

export const groupManageApi = {
  /** Chỉ đơn còn chờ. Chủ nhóm và điều hành viên cả nhóm; điều hành viên lớp nhận 403 (spec membership). */
  joinRequests: async (groupId: string): Promise<Listed<PendingJoinRequest>> => {
    const { items, total } = await unwrap(
      getApiV1GroupsByGroupIdJoinRequests({ path: { groupId }, query: { limit: MANAGE_PAGE } }),
    );
    return { items: items.map(toJoinRequest), total };
  },

  /** Hai người cùng xử một đơn: lượt sau nhận 409 — toast câu của server, danh sách đọc lại là hết đơn đó. */
  decideJoinRequest: async (requestId: string, approve: boolean): Promise<void> => {
    await unwrap(
      postApiV1GroupJoinRequestsByIdDecision({ path: { id: requestId }, body: { approve } }),
    );
  },

  /** Điều hành viên lớp chỉ thấy lời mời vào lớp mình — server lọc, app không lọc lại. */
  invitations: async (groupId: string): Promise<Listed<PendingInvitation>> => {
    const { items, total } = await unwrap(
      getApiV1GroupsByGroupIdInvitations({ path: { groupId }, query: { limit: MANAGE_PAGE } }),
    );
    return { items: items.map(toInvitation), total };
  },

  /**
   * Lời mời "mù": trả lời giống hệt dù email có tài khoản, đã ở nhóm hay không — không có gì để báo ngoài "đã ghi"
   * (spec Lời mời, TK 10). Mời lại email đang chờ không tạo dòng thứ hai, chỉ đổi lớp.
   */
  invite: (groupId: string, email: string, unitId: string | null): Promise<void> =>
    unwrapEmpty(
      postApiV1GroupsByGroupIdInvitations({
        path: { groupId },
        body: unitId ? { email, unitId } : { email },
      }),
    ),

  revokeInvitation: (groupId: string, invitationId: string): Promise<void> =>
    unwrapEmpty(
      deleteApiV1GroupsByGroupIdInvitationsByInvitationId({ path: { groupId, invitationId } }),
    ),

  /** Mã cũ hết hiệu lực ngay lúc đổi; chỉ chủ nhóm (và master). */
  rotateCode: async (groupId: string): Promise<string> =>
    (await unwrap(postApiV1GroupsByGroupIdCode({ path: { groupId } }))).code,

  /** `unitId` null = bỏ khỏi lớp. */
  setMemberUnit: (groupId: string, accountId: string, unitId: string | null): Promise<void> =>
    unwrapEmpty(
      patchApiV1GroupsByGroupIdMembersByAccountId({
        path: { groupId, accountId },
        body: { unitId },
      }),
    ),

  /** Người bị gỡ vào lại như người mới theo cách vào hiện tại của nhóm. */
  removeMember: (groupId: string, accountId: string): Promise<void> =>
    unwrapEmpty(deleteApiV1GroupsByGroupIdMembersByAccountId({ path: { groupId, accountId } })),

  /** Cấm chỉ có tác dụng trong nhóm này; người bị cấm mất tư cách thành viên ngay. */
  ban: (groupId: string, accountId: string): Promise<void> =>
    unwrapEmpty(putApiV1GroupsByGroupIdBansByAccountId({ path: { groupId, accountId } })),

  unban: (groupId: string, accountId: string): Promise<void> =>
    unwrapEmpty(deleteApiV1GroupsByGroupIdBansByAccountId({ path: { groupId, accountId } })),

  bans: async (groupId: string): Promise<Listed<BannedMember>> => {
    const { items, total } = await unwrap(
      getApiV1GroupsByGroupIdBans({ path: { groupId }, query: { limit: MANAGE_PAGE } }),
    );
    return { items: items.map(toBanned), total };
  },

  /** Server chỉ giữ dấu băm email nên không có danh sách để đọc lại — chỉ biết số dòng vừa thêm. */
  addRoster: async (
    groupId: string,
    entries: { email: string; unitId: string | null }[],
  ): Promise<number> =>
    (
      await unwrap(
        postApiV1GroupsByGroupIdRoster({
          path: { groupId },
          body: {
            entries: entries.map(({ email, unitId }) => (unitId ? { email, unitId } : { email })),
          },
        }),
      )
    ).added,

  removeRosterEntry: (groupId: string, email: string): Promise<void> =>
    unwrapEmpty(postApiV1GroupsByGroupIdRosterRemove({ path: { groupId }, body: { email } })),

  /** Công khai → riêng tư đi qua "đang chuyển sang riêng tư"; hồ sơ nhóm đọc lại mới biết đã xong chưa. */
  updateSettings: (groupId: string, patch: GroupSettingsPatch): Promise<void> =>
    unwrapEmpty(patchApiV1GroupsByGroupIdSettings({ path: { groupId }, body: patch })),

  createUnit: (groupId: string, name: string): Promise<GroupUnit> =>
    unwrap(postApiV1GroupsByGroupIdUnits({ path: { groupId }, body: { name } })),

  renameUnit: (groupId: string, unitId: string, name: string): Promise<void> =>
    unwrapEmpty(
      patchApiV1GroupsByGroupIdUnitsByUnitId({ path: { groupId, unitId }, body: { name } }),
    ),

  /** Lớp còn thành viên thì server trả 409 `GROUP_UNIT_NOT_EMPTY`. */
  deleteUnit: (groupId: string, unitId: string): Promise<void> =>
    unwrapEmpty(deleteApiV1GroupsByGroupIdUnitsByUnitId({ path: { groupId, unitId } })),

  /** `unitId` null = điều hành viên cả nhóm. Người nhận phải là thành viên và từ mức T1 (spec group-roles). */
  setModerator: (groupId: string, accountId: string, unitId: string | null): Promise<void> =>
    unwrapEmpty(
      putApiV1GroupsByGroupIdModeratorsByAccountId({
        path: { groupId, accountId },
        body: { unitId },
      }),
    ),

  dismissModerator: (groupId: string, accountId: string): Promise<void> =>
    unwrapEmpty(deleteApiV1GroupsByGroupIdModeratorsByAccountId({ path: { groupId, accountId } })),

  /** Chủ cũ vẫn là chủ tới khi người nhận đồng ý; trả về hạn trả lời để báo cho chủ nhóm. */
  transferOwnership: async (groupId: string, accountId: string): Promise<{ expiresAt: string }> => {
    const { expiresAt } = await unwrap(
      postApiV1GroupsByGroupIdOwnerTransfer({ path: { groupId }, body: { accountId } }),
    );
    return { expiresAt };
  },

  /** Không có lời chuyển nào chờ thì server trả 404 — toast câu đó là đủ. */
  cancelOwnerTransfer: (groupId: string): Promise<void> =>
    unwrapEmpty(deleteApiV1GroupsByGroupIdOwnerTransfer({ path: { groupId } })),

  /** Vĩnh viễn: đơn, lời mời, mã nhóm huỷ ngay; không mở lại được (spec group-lifecycle). */
  closeGroup: (groupId: string): Promise<void> =>
    unwrapEmpty(postApiV1GroupsByGroupIdClose({ path: { groupId } })),

  /** `unitId` null = cả nhóm; điều hành viên lớp bị server gắn lớp của mình dù gửi gì. */
  postAnnouncement: (groupId: string, body: string, unitId: string | null): Promise<void> =>
    unwrapEmpty(
      postApiV1GroupsByGroupIdAnnouncements({
        path: { groupId },
        body: unitId ? { body, unitId } : { body },
      }),
    ),
};
