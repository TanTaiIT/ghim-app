import { unwrap, unwrapEmpty } from './client';
import {
  deleteApiV1GroupsByGroupIdInvitationsByInvitationId,
  getApiV1GroupsByGroupIdInvitations,
  getApiV1GroupsByGroupIdJoinRequests,
  postApiV1GroupJoinRequestsByIdDecision,
  postApiV1GroupsByGroupIdCode,
  postApiV1GroupsByGroupIdInvitations,
} from './generated/sdk.gen';
import type {
  GetApiV1GroupsByGroupIdInvitationsResponses,
  GetApiV1GroupsByGroupIdJoinRequestsResponses,
} from './generated/types.gen';

/*
 * Mặt quản trị của nhóm — việc của chủ nhóm và điều hành viên (`group.manage.routes.ts` bên server): đơn xin vào, lời
 * mời, mã nhóm. Server kiểm vai trong nhóm ở từng lượt; app chỉ giấu lối vào theo vai đã biết, lỗi 403 hiện nguyên câu
 * của server. Tách khỏi `client.ts` như `ops.ts`: khác người dùng, khác file route bên server.
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

/** Một trang đủ cho một nhóm; `total` cho biết còn bao nhiêu chưa hiện. */
export type Listed<T> = { items: T[]; total: number };

/** Trần `limit` của server (`MAX_LIMIT` trong `common/schemas/pagination`). */
const MANAGE_PAGE = 100;

type WireJoinRequest = GetApiV1GroupsByGroupIdJoinRequestsResponses[200]['data']['items'][number];
type WireInvitation = GetApiV1GroupsByGroupIdInvitationsResponses[200]['data']['items'][number];

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
};
