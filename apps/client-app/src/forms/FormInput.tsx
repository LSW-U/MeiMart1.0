import { Controller } from 'react-hook-form';
import type { Control, FieldPath, RegisterOptions, FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import type { InputProps } from '@/components/ui/Input/Input.types';

type FormInputProps<T extends FieldValues> = Omit<
  InputProps,
  'value' | 'onChangeText' | 'error' | 'onBlur'
> & {
  name: FieldPath<T>;
  control: Control<T>;
  rules?: RegisterOptions<T>;
  /**
   * P27 D4：schema 错误信息 i18n 化——传入页面的 t()，zod message 是 i18n key（如
   * 'profileEdit.nameRequired'）时翻译显示；不传则直显原文（旧页面英文串不受影响）
   */
  tError?: (msg: string) => string;
};

export function FormInput<T extends FieldValues>({
  name,
  control,
  rules,
  tError,
  ...inputProps
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <Input
          {...inputProps}
          value={(value as string) ?? ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error?.message != null && tError ? tError(error.message) : error?.message}
        />
      )}
    />
  );
}

export type { FormInputProps };
