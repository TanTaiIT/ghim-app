import type { ComponentProps, ReactNode, RefObject } from 'react';
import { StyleSheet, type StyleProp, type View, type ViewStyle } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { IconButton } from './ui';
import { BLUR, C, R } from '@/theme';

/**
 * Vùng nội dung mà tấm `Glass` phía trên làm mờ. Android (expo-blur 57) chỉ làm mờ được view nằm trong một
 * `BlurTargetView`, và tấm kính phải đứng **ngoài** vùng đó — đặt bên trong là tự chụp chính mình. Vì mỗi khung hình
 * vùng này được ghi lại để làm mờ, chỉ bọc đúng phần nằm sau kính (ảnh, hình minh hoạ), không bọc cả màn.
 */
export const GlassBackdrop = BlurTargetView;

type Tone = keyof typeof BLUR;

/** `light`: kính sáng trên ảnh, icon tối. `clear`: kính trong trên nền minh hoạ tối, icon sáng. */
const TINT = { light: 'light', clear: 'default' } as const;
const LIQUID_STYLE = { light: 'regular', clear: 'clear' } as const;

const liquid = isLiquidGlassAvailable();

/**
 * Tấm kính mờ: iOS 26 dùng Liquid Glass của hệ thống, iOS cũ dùng hiệu ứng mờ của UIKit, Android làm mờ `target`.
 * Không có `target` thì Android chỉ còn lớp màu đục — expo-blur tự lùi về `none` và cảnh báo, nên chỉ bật phương pháp
 * làm mờ khi có `target`.
 */
export function Glass({
  target,
  tone = 'light',
  style,
  children,
}: {
  target?: RefObject<View | null>;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  if (liquid) {
    return (
      <GlassView glassEffectStyle={LIQUID_STYLE[tone]} style={[styles.glass, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView
      intensity={BLUR[tone]}
      tint={TINT[tone]}
      blurMethod={target ? 'dimezisBlurViewSdk31Plus' : 'none'}
      blurTarget={target}
      style={[styles.glass, style]}
    >
      {children}
    </BlurView>
  );
}

/** Nút tròn bằng kính đặt trên ảnh hay hình minh hoạ — thay cho nút trắng đặc có bóng. */
export function GlassIconButton({
  target,
  tone = 'light',
  ...button
}: { target?: RefObject<View | null>; tone?: Tone } & Omit<
  ComponentProps<typeof IconButton>,
  'variant'
>) {
  return (
    <Glass target={target} tone={tone} style={styles.round}>
      <IconButton {...button} color={button.color ?? (tone === 'clear' ? C.paperWarm : C.ink)} />
    </Glass>
  );
}

const styles = StyleSheet.create({
  glass: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassEdge },
  round: { borderRadius: R.full },
});
