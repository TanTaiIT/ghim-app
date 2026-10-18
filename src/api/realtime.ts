import { io, type Socket } from 'socket.io-client';
import { BASE_URL, currentAccessToken, refreshAccessToken } from './http';

/*
 * Kênh realtime của ghim-server (`ghim-server/docs/realtime.md`): socket.io, chỉ chiều server → app, chỉ báo hiệu —
 * mọi thứ đọc lại qua HTTP. Lá của `src/api/**` như `http.ts`: không biết tới query hay store, người gọi truyền
 * handler vào.
 */

/** Sự kiện server phát mà app dùng; payload chỉ có mã, nội dung luôn tải lại qua HTTP. */
export type RealtimeEvent =
  | { type: 'message:new'; conversationId: string }
  | { type: 'message:updated'; conversationId: string };

export interface RealtimeHandlers {
  onEvent(event: RealtimeEvent): void;
  /** Mỗi lần nối được, kể cả lần đầu: sự kiện phát lúc mất kết nối không được gửi bù. */
  onConnect(): void;
}

export interface RealtimeConnection {
  close(): void;
}

const conversationOf = (payload: unknown): string | null =>
  typeof payload === 'object' &&
  payload !== null &&
  'conversationId' in payload &&
  typeof payload.conversationId === 'string'
    ? payload.conversationId
    : null;

export function connectRealtime(handlers: RealtimeHandlers): RealtimeConnection {
  const socket: Socket = io(BASE_URL, {
    path: '/realtime',
    // Chỉ websocket: server từ chối long-polling (mặc định của client là polling trước).
    transports: ['websocket'],
    // Hàm chứ không phải object: mỗi lần nối lại client gọi lại để lấy token mới nhất.
    auth: (cb) => cb({ token: currentAccessToken() }),
  });

  socket.on('connect', () => handlers.onConnect());
  for (const type of ['message:new', 'message:updated'] as const) {
    socket.on(type, (payload: unknown) => {
      const conversationId = conversationOf(payload);
      if (conversationId) handlers.onEvent({ type, conversationId });
    });
  }

  const renew = async (reconnect: boolean): Promise<void> => {
    try {
      const token = await refreshAccessToken();
      if (token && reconnect) socket.connect();
    } catch {
      // Không cần bề mặt lỗi riêng: 401/403 thì `queries/auth.ts` đã đưa về màn khách, lỗi mạng thì lượt nối sau
      // gặp lại và làm mới lần nữa.
    }
  };
  // `io server disconnect` là lần duy nhất client không tự nối lại: server cắt vì access token hết hạn hay phiên đã
  // bị thu hồi — làm mới token rồi tự nối lại.
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') void renew(true);
  });
  // Bắt tay bị từ chối vì token cũ: làm mới, rồi để client tự thử lại theo nhịp của nó.
  socket.on('connect_error', (failure) => {
    if (failure.message === 'UNAUTHORIZED') void renew(false);
  });

  return { close: () => socket.disconnect() };
}
