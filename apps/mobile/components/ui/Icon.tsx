import type { LucideIcon } from 'lucide-react-native';
import { colors, iconSize } from '@/theme';

export type IconTone = 'ink' | 'soft' | 'muted' | 'primary' | 'danger' | 'success' | 'warning' | 'white';
const toneColor: Record<IconTone, string> = {
  ink: colors.ink.DEFAULT,
  soft: colors.ink.soft,
  muted: colors.ink.muted,
  primary: colors.primary.DEFAULT,
  danger: colors.danger.DEFAULT,
  success: colors.success.DEFAULT,
  warning: colors.warning.DEFAULT,
  white: '#FFFFFF',
};

interface Props {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | number;
  tone?: IconTone;
  color?: string;
}

/** Every icon in the app goes through here so size and stroke width stay consistent. */
export function Icon({ icon: Glyph, size = 'md', tone = 'soft', color }: Props) {
  const px = typeof size === 'number' ? size : iconSize[size];
  return <Glyph size={px} color={color ?? toneColor[tone]} strokeWidth={iconSize.stroke} />;
}
