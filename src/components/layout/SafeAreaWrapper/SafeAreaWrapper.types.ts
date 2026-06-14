import type { ReactNode } from 'react';

export interface SafeAreaWrapperProps {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  testID?: string;
}
