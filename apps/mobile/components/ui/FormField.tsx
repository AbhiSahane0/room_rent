import type { Control, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import type { TextInputProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Input } from './Input';
import { Select, Option } from './Select';

interface TextFieldProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  hint?: string;
  icon?: LucideIcon;
  prefix?: string;
}

export function TextField<T extends FieldValues>({ control, name, ...rest }: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input {...rest} value={field.value ?? ''} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
      )}
    />
  );
}

export function MoneyField<T extends FieldValues>(props: Omit<TextFieldProps<T>, 'keyboardType' | 'prefix'>) {
  return <TextField {...props} prefix="₹" keyboardType="decimal-pad" placeholder={props.placeholder ?? '0'} />;
}

interface SelectFieldProps<T extends FieldValues, V extends string> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  options: Option<V>[];
  disabled?: boolean;
}

export function SelectField<T extends FieldValues, V extends string>({ control, name, ...rest }: SelectFieldProps<T, V>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => <Select {...rest} value={field.value as V} onChange={field.onChange} error={fieldState.error?.message} />}
    />
  );
}
