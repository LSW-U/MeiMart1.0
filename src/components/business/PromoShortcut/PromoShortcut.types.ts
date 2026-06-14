export interface PromoShortcutItem {
  id: string;
  title: string;
  icon: string;
  link?: string;
}

export interface PromoShortcutProps {
  items: PromoShortcutItem[];
  onPress?: (item: PromoShortcutItem) => void;
  testID?: string;
}
