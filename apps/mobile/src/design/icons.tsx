/**
 * Line icons from the mocks: 24-unit grid, 1.8-pt stroke, round caps/joins (HANDOFF.md §4).
 * Rendered with react-native-svg so stroke width and colour follow the design exactly.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'mic'
  | 'contexts'
  | 'settings'
  | 'search'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'share'
  | 'more'
  | 'play'
  | 'pause'
  | 'stop'
  | 'refresh'
  | 'plus'
  | 'check'
  | 'info'
  | 'phone'
  | 'people'
  | 'chat'
  | 'lines'
  | 'book'
  | 'close'
  | 'trash';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  switch (name) {
    case 'mic':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={9} y={3} width={6} height={11} rx={3} {...common} />
          <Path d="M5 11a7 7 0 0 0 14 0" {...common} />
          <Path d="M12 18v3" {...common} />
        </Svg>
      );
    case 'contexts':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={5} width={18} height={14} rx={3} {...common} />
          <Path d="M3 10h18" {...common} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 7h9M19 7h1M4 17h3M13 17h7" {...common} />
          <Circle cx={16} cy={7} r={2.5} {...common} />
          <Circle cx={10} cy={17} r={2.5} {...common} />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={6} {...common} />
          <Path d="M20 20l-4.3-4.3" {...common} />
        </Svg>
      );
    case 'chevronRight':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 5l7 7-7 7" {...common} strokeWidth={2} />
        </Svg>
      );
    case 'chevronLeft':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M15 5l-7 7 7 7" {...common} strokeWidth={2} />
        </Svg>
      );
    case 'chevronDown':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 9l6 6 6-6" {...common} strokeWidth={2.2} />
        </Svg>
      );
    case 'share':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3v12M8 7l4-4 4 4" {...common} />
          <Path d="M5 12v7h14v-7" {...common} />
        </Svg>
      );
    case 'more':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={5} cy={12} r={2} fill={color} />
          <Circle cx={12} cy={12} r={2} fill={color} />
          <Circle cx={19} cy={12} r={2} fill={color} />
        </Svg>
      );
    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M8 5v14l11-7z" fill={color} />
        </Svg>
      );
    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={6} y={4} width={4} height={16} rx={1.5} fill={color} />
          <Rect x={14} y={4} width={4} height={16} rx={1.5} fill={color} />
        </Svg>
      );
    case 'stop':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={5} y={5} width={14} height={14} rx={3} fill={color} />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20 12a8 8 0 1 1-2.3-5.7" {...common} strokeWidth={2} />
          <Path d="M20 4v5h-5" {...common} strokeWidth={2} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" {...common} strokeWidth={2.2} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 12l4 4 10-10" {...common} strokeWidth={2.5} />
        </Svg>
      );
    case 'info':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M12 8v5M12 16h.01" {...common} />
        </Svg>
      );
    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={7} y={2} width={10} height={20} rx={2.5} {...common} strokeWidth={2} />
          <Path d="M11 18h2" {...common} strokeWidth={2} />
        </Svg>
      );
    case 'people':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={9} cy={8} r={3.5} {...common} />
          <Path d="M3 20a6 6 0 0 1 12 0" {...common} />
          <Circle cx={17} cy={9} r={2.5} {...common} />
          <Path d="M16 15a5 5 0 0 1 5 5" {...common} />
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 4h14v12H9l-4 4z" {...common} />
        </Svg>
      );
    case 'lines':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 6h16M4 12h16M4 18h9" {...common} />
        </Svg>
      );
    case 'book':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 19V5l8 4 8-4v14l-8 4z" {...common} />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 6l12 12M18 6L6 18" {...common} strokeWidth={2} />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...common} />
        </Svg>
      );
    default:
      return null;
  }
}

/** Brand mark: four amber bars + the record dot (HANDOFF.md §9). `size` is the rendered box. */
export function LogoMark({ size = 32, bars = '#E9A24A', dot = '#E0432F' }: { size?: number; bars?: string; dot?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={8} y={21} width={6} height={22} rx={3} fill={bars} />
      <Rect x={19} y={12} width={6} height={40} rx={3} fill={bars} />
      <Rect x={30} y={6} width={6} height={52} rx={3} fill={bars} />
      <Rect x={41} y={17} width={6} height={30} rx={3} fill={bars} />
      <Circle cx={55} cy={47} r={3.5} fill={dot} />
    </Svg>
  );
}
