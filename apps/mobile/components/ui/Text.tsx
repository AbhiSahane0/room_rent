import { Text as RNText, TextProps } from 'react-native';
import { cn } from '@/utils/cn';

const variants = {
  display: 'text-display font-bold',
  title: 'text-title font-bold',
  heading: 'text-heading font-semibold',
  body: 'text-body font-regular',
  bodyMedium: 'text-body font-medium',
  secondary: 'text-secondary font-regular',
  secondaryMedium: 'text-secondary font-medium',
  caption: 'text-caption font-medium',
  label: 'text-secondary font-semibold',
  number: 'text-title font-bold',
} as const;

const tones = {
  ink: 'text-ink',
  soft: 'text-ink-soft',
  muted: 'text-ink-muted',
  primary: 'text-primary',
  danger: 'text-danger',
  success: 'text-success',
  warning: 'text-warning',
  white: 'text-white',
} as const;

export interface AppTextProps extends TextProps {
  variant?: keyof typeof variants;
  tone?: keyof typeof tones;
  className?: string;
}

export function Text({ variant = 'body', tone = 'ink', className, ...props }: AppTextProps) {
  return <RNText className={cn(variants[variant], tones[tone], className)} {...props} />;
}
