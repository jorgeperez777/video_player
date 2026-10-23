import React from 'react';
import {StyleSheet, View} from 'react-native';
import Text from './Text';
import {svg} from './optional';

/**
 * Iconos de línea, al estilo de Pluto TV: contorno de trazo grueso y uniforme,
 * esquinas a escuadra y puntas redondas, en un único viewBox de 24x24 para que
 * todos pesen igual. Solo van rellenos play, pausa, stop y el corazón.
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
const STROKE = 2.4;

/**
 * Los rellenos llevan además un trazo fino del mismo color: redondea las
 * esquinas del triángulo del play y de las barras de la pausa.
 */
const ROUND = 1.8;

/** Envoltorio común: todos los paths están dibujados en una rejilla de 24x24. */
function Icon({
  size,
  color = WHITE,
  path,
  glyph,
  filled = false,
  solid,
  width = STROKE,
  cap = 'round',
}: {
  size: number;
  color?: string;
  path: string;
  glyph: string;
  /** Relleno (play, pausa…) en vez de línea. */
  filled?: boolean;
  /** Un trazo macizo aparte (el punto de la señal, la persona, la punta…). */
  solid?: string;
  /** Grosor distinto del normal, para los iconos de línea fina. */
  width?: number;
  /** Puntas rectas (las esquinas de pantalla completa). */
  cap?: 'round' | 'butt';
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
        strokeWidth={filled ? ROUND : width}
        strokeLinejoin="miter"
        strokeLinecap={cap}
      />
      {solid ? <Path d={solid} fill={color} /> : null}
    </Svg>
  );
}

const PATHS = {
  play: 'M7.5 4.8v14.4L19 12z',
  pause: 'M7 5h2.8v14H7zM14.2 5H17v14h-2.8z',
  // Flecha circular abierta, con la punta arriba hacia atrás (como el ⟲10 de
  // Netflix). Su centro es (12, 13): ahí va el número en `SkipIcon`.
  // El «reiniciar» de Pluto: tres cuartos de círculo con la punta maciza arriba
  // a la izquierda. Su centro es (12, 13.2): ahí va el número en `SkipIcon`.
  replay: 'M3.5 13.2a8.5 8.5 0 1 0 8.5-8.5',
  replaySolid: 'M13.9 1.7v7.1L7.4 5.3z',
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
  // Las cuatro esquinas de Pluto: brazos largos y puntas rectas.
  fullscreen: 'M3 9.5V3h6.5M14.5 3H21v6.5M21 14.5V21h-6.5M9.5 21H3v-6.5',
  fullscreenExit: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
  // PiP del sistema: el recuadro con la ventanita maciza, para no confundirlo
  // con el miniplayer (que la lleva en línea).
  pictureInPicture: 'M1.1 3.5h21.8v17H1.1z',
  pictureInPictureSolid: 'M11.1 10.9h8.8v7h-8.8z',
  // La pantalla, la ventanita del miniplayer abajo a la derecha y una flecha
  // que va hacia ella: «mandar el vídeo a la miniatura». La flecha lo separa
  // del de PiP, que es solo el recuadro.
  // El miniplayer de Pluto, calcado de su botón: el recuadro y la ventanita
  // abajo a la derecha, los dos en línea fina.
  miniPlayer: 'M1.1 3.5h21.8v17H1.1zM12 11.8h7v5.2h-7z',
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
  // La señal «((•))» de Pluto: el punto y dos arcos a cada lado.
  // La señal «((•))» de Pluto: dos arcos a cada lado y el punto macizo.
  liveTv:
    'M7 8.25a6.6 6.6 0 0 0 0 9.35M17 8.25a6.6 6.6 0 0 1 0 9.35M3.2 5.8a11 11 0 0 0 0 14.3M20.8 5.8a11 11 0 0 1 0 14.3',
  liveTvSolid: 'M12 16.36a3.44 3.44 0 1 0 0-6.88 3.44 3.44 0 0 0 0 6.88z',
  videoLibrary:
    'M7 3h13a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7zM3 7v13a1 1 0 0 0 1 1h13M12 7.5v5l4-2.5z',
  search:
    'M9.1 16.95a7.85 7.85 0 1 0 0-15.7 7.85 7.85 0 0 0 0 15.7zM14.9 14.9l7.85 7.85',
  // La persona dentro del círculo, como el «Sign In» de Pluto: el aro en
  // línea y la persona maciza (ver `personSolid`).
  person: 'M12 22.75a10.75 10.75 0 1 0 0-21.5 10.75 10.75 0 0 0 0 21.5z',
  personSolid:
    'M12 12.12a3.56 3.56 0 1 0 0-7.12 3.56 3.56 0 0 0 0 7.12zM5.12 18.54c1.16-2.66 3.8-4.52 6.88-4.52s5.72 1.86 6.88 4.52A9.5 9.5 0 0 1 12 21.5a9.5 9.5 0 0 1-6.88-2.96z',
  airplay:
    'M7 17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-3M12 15l4.5 5h-9z',
  arrowBack: 'M20 12H4M10 6l-6 6 6 6',
  // El candado de Pluto: cuerpo macizo y arco fino.
  lock: 'M6.75 10V8a5.25 5.25 0 0 1 10.5 0v2',
  lockSolid:
    'M5 10h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z',
  lockOpen: 'M6.75 10V8a5.25 5.25 0 0 1 10.1-2',
  episodes: 'M4 6h16M4 12h10M4 18h7M16 14.5v6l4.5-3z',
  // La casa de Pluto: tejado a dos aguas y la puerta como muesca en la base
  // (rellena, es una silueta maciza con la puerta vacía).
  home: 'M2.7 8.7 12 1.3l9.3 7.4v13.6h-5.5v-7.9a1.7 1.7 0 0 0-1.7-1.7h-4.2a1.7 1.7 0 0 0-1.7 1.7v7.9H2.7z',
  homeSolid: 'M1.45 8.7 12 0l10.55 8.7V24h-7.9v-8.6H9.35V24h-7.9z',
  news: 'M4 4h16v16H4zM7 8h5v4H7zM14.5 8H17M14.5 11H17M7 15.5h10',
  // El corazón de Pluto, por el centro de su contorno.
  favorite:
    'M12 6.9C11 5.6 9.5 5 8 5 5.7 5 4 6.8 4 9c0 3 2.8 5.6 7.4 9.7l.6.5.6-.5C17.2 14.6 20 12 20 9c0-2.2-1.7-4-4-4-1.5 0-3 .6-4 1.9z',
  // Velocímetro: medio arco y la aguja (la velocidad, como en Netflix).
  speed: 'M4.5 16.5a8 8 0 1 1 15 0M12 16.5l4.2-5.2',
  // Bocadillo con dos líneas: audio y subtítulos, como en Netflix.
  tracks: 'M4 4h16v11h-9l-4.5 4V15H4zM8 8h8M8 11.5h5',
};

/**
 * El dibujo de respaldo cuando no hay `react-native-svg`: un carácter con el
 * mismo significado. No es bonito, pero se entiende y no hace falta instalar
 * nada para que el reproductor se pueda usar.
 */
/** Los trazos macizos (`…Solid`) acompañan a otro icono y no tienen carácter. */
const GLYPHS: Record<Exclude<keyof typeof PATHS, `${string}Solid`>, string> = {
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
  speed: '⏵',
  tracks: '…',
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
    <Icon
      size={size}
      color={color}
      path={PATHS.replay}
      solid={PATHS.replaySolid}
      width={1.7}
      glyph={GLYPHS.replay}
    />
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
      cap="butt"
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
      solid={PATHS.pictureInPictureSolid}
      width={1.75}
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
      width={1.75}
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
      solid={PATHS.lockSolid}
      width={1.5}
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

export function SpeedIcon({size = 20, color}: IconProps) {
  return (
    <Icon size={size} color={color} path={PATHS.speed} glyph={GLYPHS.speed} />
  );
}

export function TracksIcon({size = 20, color}: IconProps) {
  return (
    <Icon size={size} color={color} path={PATHS.tracks} glyph={GLYPHS.tracks} />
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
          solid={PATHS.replaySolid}
          width={1.7}
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
