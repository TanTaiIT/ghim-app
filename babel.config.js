module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 dùng plugin của react-native-worklets. Phải để CUỐI CÙNG (HARD#13): sai tên hay
    // sai vị trí thì animation im lặng không chạy, không có lỗi nào báo.
    plugins: ['react-native-worklets/plugin'],
  };
};
