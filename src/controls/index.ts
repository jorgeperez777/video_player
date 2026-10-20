/**
 * Controles de reproducción, al estilo de YouTube, listos para usar.
 *
 * `<Video>` pone el vídeo y nada más: ni botones, ni barra, ni menús. Esto es
 * la capa de encima —play/pausa, ±10 s, barra con vista previa, pantalla
 * completa, calidad, subtítulos, audio, velocidad, PiP, Chromecast, AirPlay,
 * gestos de volumen y brillo, bloqueo, «saltar intro» y «siguiente episodio»—
 * para no tener que escribirla en cada app.
 *
 * Se importa aparte, `react-native-video/controls`, por dos razones: quien solo
 * quiera el `<Video>` no se lleva nada de esto en su bundle, y las librerías
 * que los controles usan (iconos, notch, giro, Chromecast, red) son
 * **opcionales**: si faltan, se apaga esa parte y el resto sigue (ver
 * `optional.ts`).
 */
export {default, default as VideoPlayer} from './VideoPlayer';
export type {Chapter, Episode, PlayerFeatures} from './VideoPlayer';
export {default as SeekBar} from './SeekBar';
export {
  t,
  setControlsLanguage,
  setControlsStrings,
  getControlsLanguage,
  useControlsLanguage,
  type ControlsLanguage,
  type ControlsTextKey,
} from './strings';
export {SAVE_EVERY_MS} from './types';
export type {DataSaver, Prefs, PlaybackEvent} from './types';
export {default as useNetworkCap, mbps} from './useNetworkCap';
export type {NetworkCap} from './useNetworkCap';
export {default as useStoryboard} from './useStoryboard';
export type {StoryboardSource, StoryboardIndex} from './useStoryboard';
export {decideOnAppState} from './appStatePause';
export type {PauseAction, PauseDecision} from './appStatePause';
export {formatTime} from './format';
export * from './icons';
