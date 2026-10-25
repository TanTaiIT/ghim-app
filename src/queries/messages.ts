import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type Conversation,
  type ConversationTarget,
  type Message,
  type Notice,
  type PickedPhoto,
  type ReportCategory,
} from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/*
 * Tin mới của người kia tới qua realtime (`queries/realtime.ts`): sự kiện `message:new` / `message:updated` chỉ báo
 * hiệu, hook ở đây invalidate đúng key rồi tải lại qua HTTP — dữ liệu vẫn chỉ có một nguồn là server.
 */

export function useConversations() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.conversations.list(),
    queryFn: api.getConversations,
    enabled: authed,
  });
}

/** Số tin chưa đọc cho badge ở thanh điều hướng — cùng key với danh sách, không gọi thêm lần nào. */
export function useUnreadTotal(): number {
  const { data } = useConversations();
  return data?.reduce((sum, c) => sum + c.unread, 0) ?? 0;
}

export function useConversation(id: string | undefined) {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.conversations.detail(id ?? ''),
    queryFn: () => api.getConversation(id ?? ''),
    enabled: authed && Boolean(id),
  });
}

/**
 * Đọc hội thoại cũng là đọc dòng thông báo "tin nhắn mới" của nó: server giữ hai trạng thái đọc riêng, không có thì
 * chuông vẫn sáng sau khi người dùng đã xem hết tin.
 */
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.markConversationRead(id);
      const notices = qc.getQueryData<Notice[]>(qk.notices.list()) ?? [];
      const ids = notices
        .filter((n) => !n.read && n.target?.screen === 'chat' && n.target.id === id)
        .map((n) => n.id);
      if (ids.length > 0) await api.markNoticesRead(ids);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.conversations.list() });
      void qc.invalidateQueries({ queryKey: qk.notices.all() });
    },
  });
}

/** Cờ "đang xem" chỉ là tín hiệu cho việc đẩy thông báo — không có gì trong cache phải đọc lại. */
export function useConversationViewing() {
  return useMutation({
    mutationFn: ({ id, viewing }: { id: string; viewing: boolean }) =>
      api.setConversationViewing(id, viewing),
  });
}

/** Hội thoại đã xoá không còn trong danh sách; route rời màn nên chi tiết chỉ cần bỏ khỏi cache. */
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteConversation(id),
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: qk.conversations.detail(id) });
      void qc.invalidateQueries({ queryKey: qk.conversations.list() });
    },
  });
}

export function useReportConversation() {
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: ReportCategory }) =>
      api.reportConversation(id, category),
  });
}

/** Lạc quan: bong bóng hiện ngay với id tạm, refetch sau đó thay bằng bản server trả về. */
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = qk.conversations.detail(conversationId);
  return useMutation({
    /** Ảnh tải lúc gửi, song song; một ảnh hỏng (quá nhỏ, mất mạng) thì cả tin không gửi. */
    mutationFn: async ({ text, photos }: { text: string; photos: PickedPhoto[] }) =>
      api.sendMessage(conversationId, {
        text,
        imageIds: await Promise.all(photos.map((p) => api.uploadChatPhoto(conversationId, p))),
      }),
    onMutate: async ({ text, photos }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Conversation>(key);
      const temp: Message = {
        id: `temp-${Date.now()}`,
        kind: 'text',
        mine: true,
        text,
        photos: photos.map((p) => ({ uri: p.uri })),
        at: new Date().toISOString(),
      };
      qc.setQueryData<Conversation>(key, (c) => c && { ...c, messages: [...c.messages, temp] });
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: qk.conversations.list() });
    },
  });
}

export function useSendOffer(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => api.sendOffer(conversationId, amount),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.conversations.all() }),
  });
}

/** Lạc quan: nút Chấp nhận / Từ chối đổi ngay; server từ chối (đã có giá mới, tin đã bán) thì trả lại như cũ. */
export function useRespondOffer(conversationId: string) {
  const qc = useQueryClient();
  const key = qk.conversations.detail(conversationId);
  return useMutation({
    mutationFn: ({ messageId, status }: { messageId: string; status: 'accepted' | 'declined' }) =>
      api.respondOffer(conversationId, messageId, status),
    onMutate: async ({ messageId, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Conversation>(key);
      qc.setQueryData<Conversation>(
        key,
        (c) =>
          c && {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId && m.kind === 'offer' ? { ...m, status } : m,
            ),
          },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.conversations.all() }),
  });
}

/** Mở (hoặc mở lại) hội thoại theo ngữ cảnh — trả id để route điều hướng tới `/chat/[id]`. */
export function useOpenConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (to: ConversationTarget) => api.openConversation(to),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations.list() }),
  });
}
