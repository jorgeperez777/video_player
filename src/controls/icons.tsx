import React from 'react';
import {StyleSheet, View} from 'react-native';
import Text from './Text';
import {svg} from './optional';

/**
 * Iconos de línea, al estilo de Netflix: contorno de trazo uniforme con puntas
 * y uniones redondas, en un único viewBox de 24x24 para que todos pesen igual.
 * Solo van rellenos los que Netflix rellena (play, pausa, stop, el corazón).
 *
 * `react-native-svg` es opcional (ver `optional`): si no está instalado, en vez
 * del vector se dibuja el carácter equivalente (▶, ⏸, ✕…). Se ve peor, pero el
 * reproductor sigue siendo usable y nadie tiene que instalar nada para probarlo.
 */

const WHITE = '#fff';

const Svg = svg?.default;
const Path = svg?.Path;

type IconProps = {size?: number; color?: string};

/** Todos los iconos se dibujan un poco más grandes que el tamaño pedido. */
const SCALE = 1.3;

/** Grosor de la línea, en unidades del viewBox de 24. */
const STROKE = 1.8;

/**
 * Los rellenos llevan además un trazo fino del mismo color: redondea las
 * esquinas del triángulo del play y de las barras de la pausa.
 */
const ROUND = 1.6;

/** Envoltorio común: todos los paths están dibujados en una rejilla de 24x24. */
function Icon({
  size,
  color = WHITE,
  path,
  glyph,
  filled = false,
}: {
  size: number;
  color?: string;
  path: string;
  glyph: string;
  /** Relleno (play, pausa…) en vez de línea. */
  filled?: boolean;
}) {
  const px = Math.round(size * SCALE);
  if (!Svg) {
    return (
      <Text style={{fontSize: px * 0.9, color, lineHeight: px * 1.05}}>
        {glyph}
      </Text>
    );
  }
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24">
      <Path
        d={path}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? ROUND : STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const PATHS = {
  play: 'M7.5 4.8v14.4L19 12z',
  pause: 'M7 5h2.8v14H7zM14.2 5H17v14h-2.8z',
  // Flecha circular abierta, con la punta arriba hacia atrás (como el ⟲10 de
  // Netflix). Su centro es (12, 13): ahí va el número en `SkipIcon`.
  replay: 'M12 5a8 8 0 1 1-6.93 4M14.5 2.5 12 5l2.5 2.5',
  stop: 'M6.5 6.5h11v11h-11z',
  close: 'M6 6l12 12M18 6 6 18',
  chevronDown: 'M6 9l6 6 6-6',
  fastForward: 'M3.5 6.5v11l7.5-5.5zM12.5 6.5v11l7.5-5.5z',
  skipNext: 'M5 5.5v13l10-6.5zM19 5.5v13',
  add: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  share:
    'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  skipPrevious: 'M19 5.5v13L9 12zM5 5.5v13',
  fullscreen: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  fullscreenExit: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
  pictureInPicture:
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM12.5 12h5v4h-5z',
  // La pantalla, la ventanita del miniplayer abajo a la derecha y una flecha
  // que va hacia ella: «mandar el vídeo a la miniatura». La flecha lo separa
  // del de PiP, que es solo el recuadro.
  miniPlayer:
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM13.5 12.5H18V16h-4.5zM6.5 8l4.5 4.5M11 9v3.5H7.5',
  // El engranaje de Material, pero solo su contorno: el trazo sigue la silueta
  // exterior y el agujero del centro.
  settings:
    'M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15A3 3 0 1 1 12 9a3 3 0 0 1 0 6z',
  cast: 'M3 8V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6M3 12a7 7 0 0 1 7 7M3 15.5A3.5 3.5 0 0 1 6.5 19M3 19h.01',
  castConnected:
    'M3 8V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6M3 12a7 7 0 0 1 7 7M3 15.5A3.5 3.5 0 0 1 6.5 19M3 19h.01M7 8.5h10.5v7H14',
  // Recuadro con dos «C» de arco abiertas.
  closedCaption:
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM10.5 10.3a2.2 2.2 0 1 0 0 3.4M17 10.3a2.2 2.2 0 1 0 0 3.4',
  liveTv:
    'M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM8 2.5 12 7l4-4.5',
  videoLibrary:
    'M7 3h13a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7zM3 7v13a1 1 0 0 0 1 1h13M12 7.5v5l4-2.5z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-5 8-5s8 1.7 8 5',
  airplay:
    'M7 17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-3M12 15l4.5 5h-9z',
  arrowBack: 'M20 12H4M10 6l-6 6 6 6',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  lockOpen:
    'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 7.7-1.5M12 15v2',
  episodes: 'M4 6h16M4 12h10M4 18h7M16 14.5v6l4.5-3z',
  home: 'M4 10.5 12 4l8 6.5V20h-5v-6h-6v6H4z',
  news: 'M4 4h16v16H4zM7 8h5v4H7zM14.5 8H17M14.5 11H17M7 15.5h10',
  favorite:
    'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
};

/**
 * El dibujo de respaldo cuando no hay `react-native-svg`: un carácter con el
 * mismo significado. No es bonito, pero se entiende y no hace falta instalar
 * nada para que el reproductor se pueda usar.
 */
const GLYPHS: Record<keyof typeof PATHS, string> = {
  add: '+',
  airplay: '⌁',
  arrowBack: '←',
  cast: '⬓',
  castConnected: '⬒',
  check: '✓',
  chevronDown: '⌄',
  close: '✕',
  closedCaption: 'CC',
  episodes: '☰',
  fastForward: '⏩',
  favorite: '♥',
  fullscreen: '⛶',
  fullscreenExit: '⛶',
  home: '⌂',
  liveTv: '📺',
  lock: '🔒',
  lockOpen: '🔓',
  news: '▤',
  pause: '⏸',
  person: '☻',
  pictureInPicture: '⧉',
  miniPlayer: '▭',
  play: '▶',
  replay: '↺',
  search: '⌕',
  settings: '⚙',
  share: '↗',
  skipNext: '⏭',
  skipPrevious: '⏮',
  stop: '■',
  videoLibrary: '▣',
};

export function PlayIcon({size = 36, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.play}
      glyph={GLYPHS.play}
      filled
    />
  );
}

export function PauseIcon({size = 36, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.pause}
      glyph={GLYPHS.pause}
      filled
    />
  );
}

export function ReplayIcon({size = 36, color}: IconProps) {
  return (
    <Icon size={size} color={color} path={PATHS.replay} glyph={GLYPHS.replay} />
  );
}

export function StopIcon({size = 22, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.stop}
      glyph={GLYPHS.stop}
      filled
    />
  );
}

export function CloseIcon({size = 22, color}: IconProps) {
  return (
    <Icon size={size} color={color} path={PATHS.close} glyph={GLYPHS.close} />
  );
}

export function ChevronIcon({
  direction = 'down',
  size = 24,
  color,
}: IconProps & {direction?: 'down' | 'up'}) {
  return (
    <View style={direction === 'up' ? styles.flipVertical : undefined}>
      <Icon
        size={size}
        color={color}
        path={PATHS.chevronDown}
        glyph={GLYPHS.chevronDown}
      />
    </View>
  );
}

export function TrackIcon({
  direction,
  size = 28,
  color,
}: IconProps & {direction: 'previous' | 'next'}) {
  return (
    <Icon
      size={size}
      color={color}
      path={direction === 'next' ? PATHS.skipNext : PATHS.skipPrevious}
      glyph={direction === 'next' ? GLYPHS.skipNext : GLYPHS.skipPrevious}
      filled
    />
  );
}

export function FullscreenIcon({
  size = 24,
  exit = false,
  color,
}: IconProps & {exit?: boolean}) {
  return (
    <Icon
      size={size}
      color={color}
      path={exit ? PATHS.fullscreenExit : PATHS.fullscreen}
      glyph={exit ? GLYPHS.fullscreenExit : GLYPHS.fullscreen}
    />
  );
}

export function FastForwardIcon({size = 24, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.fastForward}
      glyph={GLYPHS.fastForward}
      filled
    />
  );
}

export function PipIcon({size = 24, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.pictureInPicture}
      glyph={GLYPHS.pictureInPicture}
    />
  );
}

export function MiniPlayerIcon({size = 24, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.miniPlayer}
      glyph={GLYPHS.miniPlayer}
    />
  );
}

export function SettingsIcon({size = 24, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.settings}
      glyph={GLYPHS.settings}
    />
  );
}

export function CastIcon({
  size = 24,
  color,
  connected = false,
}: IconProps & {connected?: boolean}) {
  return (
    <Icon
      size={size}
      color={color}
      path={connected ? PATHS.castConnected : PATHS.cast}
      glyph={connected ? GLYPHS.castConnected : GLYPHS.cast}
    />
  );
}

export function ArrowBackIcon({size = 24, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.arrowBack}
      glyph={GLYPHS.arrowBack}
    />
  );
}

/** Candado del bloqueo de pantalla: cerrado para bloquear, abierto para soltar. */
export function LockIcon({
  open = false,
  size = 22,
  color,
}: IconProps & {open?: boolean}) {
  return (
    <Icon
      size={size}
      color={color}
      path={open ? PATHS.lockOpen : PATHS.lock}
      glyph={open ? GLYPHS.lockOpen : GLYPHS.lock}
    />
  );
}

export function EpisodesIcon({size = 24, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.episodes}
      glyph={GLYPHS.episodes}
    />
  );
}

export function AirPlayGlyph({size = 24, color}: IconProps) {
  return (
    <Icon
      size={size}
      color={color}
      path={PATHS.airplay}
      glyph={GLYPHS.airplay}
    />
  );
}

/** CC. `active` lo pinta en azul, como el resto de estados activos. */
export function SubtitlesIcon({
  size = 24,
  color,
  active,
  activeColor = '#3ea6ff',
}: IconProps & {active?: boolean; activeColor?: string}) {
  return (
    <Icon
      size={size}
      color={active ? activeColor : color}
      path={PATHS.closedCaption}
      glyph={GLYPHS.closedCaption}
    />
  );
}

/**
 * Salto de ±N segundos: la flecha circular abierta con el número dentro, como
 * en Netflix. El número va aparte para que se lea a cualquier tamaño.
 */
export function SkipIcon({
  direction,
  seconds,
  size = 40,
  color = WHITE,
}: IconProps & {direction: 'back' | 'forward'; seconds: number}) {
  // La caja y el número crecen igual que el arco (ver `SCALE`), o el número se
  // quedaría pequeño y descentrado dentro de la flecha.
  const px = Math.round(size * SCALE);
  return (
    <View style={[styles.skip, {width: px, height: px}]}>
      <View style={direction === 'forward' ? styles.flipHorizontal : undefined}>
        <Icon
          size={size}
          color={color}
          path={PATHS.replay}
          glyph={GLYPHS.replay}
        />
      </View>
      <Text
        style={[
          styles.skipSeconds,
          {color, fontSize: px * 0.26, lineHeight: px * 0.3},
        ]}>
        {seconds}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flipHorizontal: {transform: [{scaleX: -1}]},
  flipVertical: {transform: [{scaleY: -1}]},
  skip: {alignItems: 'center', justifyContent: 'center'},
  skipSeconds: {
    position: 'absolute',
    fontWeight: '700',
    // El arco no está centrado en el viewBox (su centro es y=13): el número
    // baja un poco para quedar dentro de la circunferencia.
    marginTop: '8%',
  },
});
