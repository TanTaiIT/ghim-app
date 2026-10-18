/**
 * Tầng HTTP: base URL + token của phiên cho SDK sinh từ OpenAPI (`runtimeConfigPath` của hey-api).
 *
 * File này là LÁ của `src/api/**`: không import `stores/**` (folder.convention §6). Token được
 * `queries/auth.ts` đẩy xuống qua `setHttpAccessToken` — đó là layer được phép chạm cả hai bên.
 */

/** Không có `/api/v1` ở đây: đường dẫn đầy đủ nằm trong SDK, vì OpenAPI của server khai đủ tiền tố. */
export const BASE_URL: string = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3100';

let accessToken: string | null = null;

export function setHttpAccessToken(next: string | null): void {
  accessToken = next;
}

/** Kênh realtime (`./realtime`) xin token ở mỗi lượt nối lại — phải là token mới nhất, không phải lúc mở app. */
export const currentAccessToken = (): string | null => accessToken;

let deviceId: string | null = null;

export function setHttpDeviceId(next: string | null): void {
  deviceId = next;
}

/** Header mà các route đăng tin đòi (lưu nội dung, gửi duyệt); request khác không cần nên không gửi kèm. */
export const deviceHeaders = (): { 'x-device-id': string } | undefined =>
  deviceId ? { 'x-device-id': deviceId } : undefined;

/** Làm mới phiên, trả access token mới. Ném lỗi khi không làm mới được; null = không có phiên nào. */
type SessionRefresher = () => Promise<string | null>;

let refresher: SessionRefresher | null = null;
let refreshing: Promise<string | null> | null = null;

/** `queries/auth.ts` đăng ký: refresh token nằm trong store, mà tầng này không được đọc store. */
export function setSessionRefresher(next: SessionRefresher | null): void {
  refresher = next;
}

/**
 * Mọi request dính 401 cùng lúc dùng chung MỘT lượt refresh. Server xoay refresh token mỗi lượt: lượt thứ hai
 * cầm token vừa bị xoay nhận 409 `REFRESH_CONFLICT` trong 30 giây ân hạn, quá hạn thì cả phiên bị thu hồi như
 * token bị đánh cắp.
 */
/** Kênh realtime bị server cắt vì access token hết hạn: làm mới chung lượt với các request HTTP đang chờ. */
export const refreshAccessToken = (): Promise<string | null> =>
  refresher ? refreshOnce(refresher) : Promise.resolve(null);

function refreshOnce(run: SessionRefresher): Promise<string | null> {
  refreshing ??= run().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * `fetch` của SDK: request có Bearer mà nhận 401 thì làm mới phiên rồi gửi lại đúng một lần — server trả 401
 * cho cả token hết hạn (15 phút) lẫn token hỏng. Request không có Bearer (đăng nhập, refresh) đi thẳng: 401 của
 * chúng là sai mật khẩu hoặc phiên đã chết, refresh không cứu được.
 */
const authFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const sent = request.headers.get('Authorization');
  if (!sent || !refresher) return fetch(request);

  const replay = request.clone();
  const response = await fetch(request);
  if (response.status !== 401) return response;

  // Request bay với token cũ trong lúc một lượt khác vừa làm mới xong: gửi lại bằng token mới, không xoay thêm.
  const token =
    accessToken && sent !== `Bearer ${accessToken}` ? accessToken : await refreshOnce(refresher);
  if (!token) return response;
  replay.headers.set('Authorization', `Bearer ${token}`);
  return fetch(replay);
};

/**
 * Lỗi nghiệp vụ từ backend, đã bóc khỏi vỏ `{ success: false, error: { code, message } }`.
 *
 * `code` là thứ màn hình rẽ nhánh (`ACCOUNT_LOCKED`, `EMAIL_TAKEN`…); `message` là câu tiếng Việt do
 * server soạn cho người dùng, hiện thẳng qua toast. Không hardcode lại câu lỗi ở màn hình.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Hợp đồng của hey-api: `client.gen.ts` gọi hàm này lúc khởi tạo client, luôn truyền config mặc định.
 * Generic để file biên dịch được cả khi `src/api/generated/**` chưa sinh — type thật của `config` đến
 * từ chính output đó.
 */
export const createClientConfig = <T extends object>(config: T) => ({
  ...config,
  baseUrl: BASE_URL,
  // SDK chỉ gọi hàm này cho endpoint có `security: [{ bearerAuth }]` trong OpenAPI.
  auth: () => accessToken ?? undefined,
  fetch: authFetch,
});
