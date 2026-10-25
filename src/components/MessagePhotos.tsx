import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Picture } from '@/api/client';
import { Gallery } from './Gallery';
import { Photo } from './Photo';
import { IconButton } from './ui';
import { C, R, S } from '@/theme';

/** Ô ảnh vuông trong bong bóng: một ảnh rộng cả bong bóng, hai tới bốn ảnh xếp lưới hai cột. */
const SINGLE = 220;
const TILE = 108;

/**
 * Ảnh của một tin nhắn (ghim-server add-message-images): lưới trong bong bóng, bấm một ảnh thì xem lớn, lướt ngang
 * qua các ảnh của cùng tin. Dùng chung cho khung chat, hàng hỗ trợ và bản ghi hội thoại trên bàn vận hành.
 */
export function MessagePhotos({ photos }: { photos: Picture[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const { height } = useWindowDimensions();
  if (photos.length === 0) return null;
  const size = photos.length === 1 ? SINGLE : TILE;

  return (
    <>
      <View style={[styles.grid, { maxWidth: photos.length === 1 ? SINGLE : TILE * 2 + S.xs }]}>
        {photos.map((p, i) => (
          <Pressable
            key={p.uri}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Xem ảnh ${i + 1} / ${photos.length}`}
            onPress={() => setOpen(i)}
          >
            <Photo picture={p} style={[styles.tile, { width: size, height: size }]} />
          </Pressable>
        ))}
      </View>
      <Modal visible={open !== null} animationType="fade" onRequestClose={() => setOpen(null)}>
        <SafeAreaView style={styles.viewer}>
          <View style={styles.close}>
            <IconButton icon="x" label="Đóng ảnh" variant="glass" onPress={() => setOpen(null)} />
          </View>
          <Gallery photos={photos} height={height * 0.8} fit="contain" start={open ?? 0} />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs },
  tile: { borderRadius: R.md },
  viewer: { flex: 1, justifyContent: 'center', backgroundColor: C.ink },
  close: { position: 'absolute', top: S.xl, right: S.lg, zIndex: 1 },
});
