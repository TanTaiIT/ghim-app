import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Field, PinButton } from './ui';

/*
 * `render` của Testing Library 14 chạy bất đồng bộ với React 19 (concurrent root), nên phải `await`
 * trước khi đọc `screen` — gọi đồng bộ thì `screen` báo "render function has not been called".
 */

describe('PinButton', () => {
  it('gọi onPress khi nhấn', async () => {
    const onPress = jest.fn();
    await render(<PinButton label="Gửi" onPress={onPress} />);
    fireEvent.press(screen.getByText('Gửi'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('khoá khi loading: không gọi onPress và không hiện nhãn', async () => {
    const onPress = jest.fn();
    await render(<PinButton label="Gửi" onPress={onPress} loading />);
    expect(screen.queryByText('Gửi')).toBeNull();
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('đưa text người dùng gõ lên onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(<Field label="Email" value="" onChangeText={onChangeText} placeholder="a@b.vn" />);
    fireEvent.changeText(screen.getByPlaceholderText('a@b.vn'), 'lan@ghim.vn');
    expect(onChangeText).toHaveBeenCalledWith('lan@ghim.vn');
    expect(screen.getByText('Email')).toBeTruthy();
  });
});
