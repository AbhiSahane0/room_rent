declare const tokens: {
  colors: Record<string, any> & {
    primary: { DEFAULT: string; dark: string; soft: string; fg: string };
    secondary: { DEFAULT: string; soft: string };
    bg: string;
    surface: { DEFAULT: string; muted: string };
    ink: { DEFAULT: string; soft: string; muted: string };
    line: { DEFAULT: string; strong: string };
    success: { DEFAULT: string; soft: string };
    warning: { DEFAULT: string; soft: string };
    danger: { DEFAULT: string; soft: string };
    disabled: { DEFAULT: string; fg: string };
  };
  radius: { sm: number; md: number; lg: number; xl: number; full: number };
  icon: { sm: number; md: number; lg: number; stroke: number };
  fonts: { regular: string; medium: string; semibold: string; bold: string };
};
export default tokens;
