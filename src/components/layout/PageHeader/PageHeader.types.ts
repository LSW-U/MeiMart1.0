import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  testID?: string;
}
