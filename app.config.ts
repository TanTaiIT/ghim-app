import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Cấu hình nằm ở `app.json`; file này chỉ thêm `google-services.json` (Firebase — Android cần nó để nhận thông báo đẩy).
 * File đó không vào git (HARD#19) nên EAS không nhận được cùng mã nguồn: bản build EAS đọc biến file
 * `GOOGLE_SERVICES_JSON` của môi trường EAS (giá trị là đường dẫn tới file), máy dev dùng file đặt ở gốc repo.
 */
export default ({ config }: ConfigContext): Partial<ExpoConfig> => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
