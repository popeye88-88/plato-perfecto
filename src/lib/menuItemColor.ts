export type ColorStyle = 'fill' | 'border';

export const DEFAULT_COLOR = '#E5E7EB'; // light gray

export const COLOR_PRESETS: { name: string; value: string }[] = [
  { name: 'Gris claro', value: '#E5E7EB' },
  { name: 'Rojo', value: '#FCA5A5' },
  { name: 'Naranja', value: '#FDBA74' },
  { name: 'Amarillo', value: '#FDE68A' },
  { name: 'Verde', value: '#86EFAC' },
  { name: 'Cian', value: '#67E8F9' },
  { name: 'Azul', value: '#93C5FD' },
  { name: 'Morado', value: '#C4B5FD' },
  { name: 'Rosa', value: '#F9A8D4' },
  { name: 'Marrón', value: '#D6BCAB' },
];

export function getMenuItemCardStyle(color?: string | null, style?: ColorStyle | null): React.CSSProperties {
  const c = color || DEFAULT_COLOR;
  const s: ColorStyle = style || 'fill';
  if (s === 'border') {
    return { borderColor: c, borderWidth: 2, backgroundColor: 'hsl(var(--card))' };
  }
  return { backgroundColor: c, borderColor: c };
}
