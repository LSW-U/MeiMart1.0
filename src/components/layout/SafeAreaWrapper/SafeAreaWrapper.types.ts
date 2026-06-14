import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface SafeAreaWrapperProps {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  testID?: string;
  style?: StyleProp<ViewStyle>;
}
