export interface SwitchProps {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
}
