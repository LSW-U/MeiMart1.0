import type { ReactNode } from 'react';

export interface TabBarProps {
  tabs: string[];
  activeIndex: number;
  onTabChange: (index: number) => void;
  testID?: string;
}
