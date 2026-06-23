import type { Banner } from '@/types';

export interface BannerCarouselProps {
  banners: Banner[];
  onBannerPress?: (banner: Banner) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showDots?: boolean;
  testID?: string;
}
