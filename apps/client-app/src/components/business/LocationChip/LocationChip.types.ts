export interface LocationChipProps {
  label: string;
  onPress?: () => void;
  /** 前景色（默认 on-primary；不随主题的深色底上传固定色，如 home 渐变 header 的白） */
  color?: string;
  testID?: string;
}
