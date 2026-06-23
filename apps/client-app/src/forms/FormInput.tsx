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
};

export function FormInput<T extends FieldValues>({
  name,
  control,
  rules,
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
          error={error?.message}
        />
      )}
    />
  );
}

export type { FormInputProps };
