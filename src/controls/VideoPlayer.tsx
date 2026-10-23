import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  Modal,
  PanResponder,
  PixelRatio,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Text from './Text';
import {decideOnAppState} from './appStatePause';
import {
  CastButton,
  lockToLandscape,
  lockToPortrait,
  onNetworkChange,
  useInsets,
} from './optional';
import Video, {
  AirPlayButton,
  isPictureInPictureSupported,
  SelectedTrackType,
  SelectedVideoTrackType,
  type OnBufferData,
  type OnExternalPlaybackChangeData,
  type OnLoadData,
  type OnProgressData,
  type OnAudioTracksData,
  type OnTextTracksData,
  type OnVideoErrorData,
  type OnVideoTracksData,
  type AudioTrack,
  type TextTrack,
  type ReactVideoSource,
  type VideoRef,
  type VideoTrack,
} from '../index';
import {t, useControlsLanguage} from './strings';
import {formatTime} from './format';
import {SAVE_EVERY_MS, type PlaybackEvent, type Prefs} from './types';
import SeekBar from './SeekBar';
import useCast from './useCast';
import useNetworkCap, {mbps, type DataSaver} from './useNetworkCap';
import useStoryboard, {type StoryboardSource} from './useStoryboard';
import {
  AirPlayGlyph,
  ArrowBackIcon,
  CastIcon,
  ChevronIcon,
  CloseIcon,
  EpisodesIcon,
  FastForwardIcon,
  FullscreenIcon,
  LockIcon,
  StopIcon,
  MiniPlayerIcon,
  PipIcon,
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  SettingsIcon,
  SkipIcon,
  SpeedIcon,
  TrackIcon,
  TracksIcon,
} from './icons';

/**
 * `StyleSheet.absoluteFill` es un identificador de estilo ya registrado y no se
 * puede esparcir dentro de otro estilo; esto sí, y dice lo mismo.
 */
const FILL = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

const SKIP_SECONDS = 10;
const DOUBLE_TAP_MS = 300;
// Tras un doble tap, taps sencillos dentro de esta ventana siguen saltando.
const SKIP_CHAIN_MS = 800;
const AUTO_HIDE_MS = 3000;
/**
 * Cuánto se espera al giro antes de pintar los controles igualmente.
 *
 * El giro tarda unos 300-500 ms, pero puede no llegar nunca: el móvil con el
 * giro bloqueado, o una app que no trae `react-native-orientation-locker` (es
 * opcional, ver `optional.ts`). Sin este plazo, ahí no habría controles jamás
 * y en iOS, que no tiene botón atrás, no habría forma de salir.
 */
const PLACE_TIMEOUT_MS = 800;
// Cuánto se queda en pantalla la pastilla de «Desbloquear» al tocar con el candado puesto.
const LOCK_HINT_MS = 3000;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
// Mantener pulsado el vídeo acelera la reproducción hasta soltar (como TikTok).
const BOOST_RATE = 2;
// Umbral del pulsado largo. Por encima de la ventana de doble tap, para que un
// tap que se demora no acelere sin querer.
const BOOST_HOLD_MS = 400;
// Por debajo de este retraso (respecto a la posición live del reproductor) se
// considera que estás "en directo".
const LIVE_EDGE_TOLERANCE_S = 5;
// Directos con ventana DVR menor que esto no muestran barra ni saltos.
const MIN_DVR_WINDOW_S = 30;
// Reintentos automáticos tras un error: 2 s, 4 s, 8 s, 16 s, 30 s (tope) y luego se detiene.
const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

type Side = 'left' | 'right';

/**
 * Tramo con nombre dentro del vídeo. Separa la barra de progreso y, si es
 * `skippable`, saca el botón para saltarlo (intro, resumen del capítulo previo…).
 */
export type Chapter = {
  title: string;
  start: number;
  end: number;
  skippable?: boolean;
};

/**
 * Entrada de la lista de episodios que se abre desde el reproductor. `id` es lo
 * que se devuelve en `onSelectEpisode`: quien nos use decide qué significa (el
 * índice de su catálogo, un slug…).
 */
export type Episode = {
  id: string | number;
  title: string;
  /** Segunda línea: temporada y número, duración, sinopsis corta… */
  subtitle?: string;
  /** Ya visto, de 0 a 1, para la barrita de la fila. */
  progress?: number;
  /** Fotograma o carátula del episodio (16:9). Sin ella, un hueco gris. */
  image?: string;
  /** Número del episodio: se ve en grande en el hueco si no hay imagen. */
  number?: number;
  /** Sinopsis corta; se recorta a dos líneas. */
  description?: string;
};

/**
 * Qué partes del overlay se ofrecen. Todas van activas por defecto: solo hace
 * falta pasar las que quieras quitar (`features={{skipButtons: false}}`).
 */
export type PlayerFeatures = {
  /** Botones ⟲10 / ⟳10 de la fila central. */
  skipButtons?: boolean;
  /** Doble tap en los lados para ±10 s. Sin él, el tap solo muestra/oculta. */
  doubleTapSkip?: boolean;
  /** Botones ⏮ / ⏭ (además hay que pasar `onNext`/`onPrevious`). */
  trackButtons?: boolean;
  /** Barra de progreso arrastrable. */
  seekBar?: boolean;
  /**
   * Dejar una barra fina de progreso cuando se ocultan los controles (como
   * YouTube). Por defecto no: se va con el resto de los controles.
   */
  idleProgressBar?: boolean;
  /** Miniatura del instante al arrastrar (además hay que pasar `storyboard`). */
  seekPreview?: boolean;
  /** Mantener pulsado el vídeo para ir a x2. */
  holdToSpeed?: boolean;
  /** Botón CC. Los subtítulos se siguen pudiendo elegir en ⚙. */
  subtitlesButton?: boolean;
  /** Botón ⚙: calidad, ahorro de datos, subtítulos y velocidad. */
  settingsButton?: boolean;
  /** Botón ▭ de Picture in Picture (además el dispositivo tiene que soportarlo). */
  pipButton?: boolean;
  /** Botones de Chromecast y AirPlay. */
  routeButtons?: boolean;
  /**
   * Botón ⤢ de pantalla completa. Por defecto está en `inline` y no en
   * `immersive`, donde el reproductor ya nace a pantalla completa.
   */
  fullscreenButton?: boolean;
  /**
   * Candado para bloquear la pantalla y no darle sin querer mientras sujetas el
   * móvil (como Netflix). Por defecto solo en `immersive`.
   */
  lockButton?: boolean;
  /** Botón «Saltar intro» en los capítulos marcados como saltables. */
  skipIntro?: boolean;
  /** Tarjeta de «a continuación» en los últimos segundos. */
  nextUpCard?: boolean;
  /** Deslizar arriba/abajo: volumen (derecha) y brillo (izquierda). */
  verticalGestures?: boolean;
  /** Pellizcar para alternar entre ajustar y rellenar la pantalla. */
  pinchToFill?: boolean;
};

type Props = {
  source: ReactVideoSource;
  title?: string;
  style?: StyleProp<ViewStyle>;
  onError?: (message: string) => void;
  /**
   * Cómo se presenta el reproductor:
   *
   * - `inline` (por defecto): empotrado en su hueco, en vertical, con botón ⤢ y
   *   miniplayer. Es el modelo de YouTube.
   * - `immersive`: nace ya en horizontal a pantalla completa, sin ⤢ ni ⌄, y el
   *   botón atrás (o la ← de la barra superior) cierra el reproductor llamando a
   *   `onClose`. Es el modelo de Netflix con un episodio.
   */
  presentation?: 'inline' | 'immersive';
  /**
   * Pantalla completa controlada desde fuera. Si se pasa, manda el padre (el
   * reproductor solo la pide por `onFullscreenChange`); si no, la gestiona él.
   */
  fullscreen?: boolean;
  /** Se llama al entrar/salir de pantalla completa (útil para ocultar el resto de la UI). */
  onFullscreenChange?: (fullscreen: boolean) => void;
  /**
   * Cerrar del todo. En `immersive` es lo que hace el botón atrás: no hay estado
   * vertical al que volver.
   */
  onClose?: () => void;
  /** Se llama al entrar/salir de Picture in Picture. */
  onPipChange?: (active: boolean) => void;
  /**
   * Si se pasa, aparece el chevron ⌄ a la izquierda del título (como en YouTube)
   * para mandar el reproductor al miniplayer.
   */
  onMinimize?: () => void;
  /** Lista de reproducción: botones ⏮/⏭ (solo en VOD) y autoplay del siguiente al terminar. */
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  /** Reproducir el siguiente automáticamente al terminar (por defecto true). */
  autoplayNext?: boolean;
  /**
   * Modo miniplayer: solo el vídeo, sin overlay ni gestos. Quien lo use dibuja
   * sus propios controles encima (ver `PlayerHost`).
   */
  compact?: boolean;
  /**
   * Pausa controlada desde fuera. Si se pasa, manda el padre (hace falta para que
   * el miniplayer y el reproductor grande compartan el mismo estado); si no, el
   * reproductor la gestiona él solo.
   */
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /**
   * Ahorro de datos. Vive fuera del reproductor para que la elección sobreviva al
   * cambio de vídeo (que remonta este componente).
   */
  dataSaver?: DataSaver;
  onDataSaverChange?: (mode: DataSaver) => void;
  /** Miniaturas para la vista previa de la barra (ver `useStoryboard`). */
  storyboard?: StoryboardSource;
  /** Capítulos del vídeo: marcas en la barra y botón de saltar intro. */
  chapters?: Chapter[];
  /**
   * Qué viene después, para la tarjeta de continuidad de los últimos segundos:
   * miniatura con ▶, «Siguiente en N», el título y una línea de detalle.
   */
  nextUp?: {
    /** Línea principal: la serie, o la película. */
    title: string;
    /** Fotograma o carátula (16:9) para la miniatura de la tarjeta. */
    image?: string;
    /** En negrita delante del detalle: «T1 E3». */
    badge?: string;
    /** Detalle: el nombre del episodio, la duración… */
    subtitle?: string;
  };
  /**
   * Lista de episodios: saca el botón ☰ y la hoja para saltar a otro sin salir
   * del reproductor. Sin `episodes` no hay botón.
   */
  episodes?: Episode[];
  /** El que se está viendo, para marcarlo en la lista. */
  currentEpisodeId?: string | number;
  onSelectEpisode?: (id: string | number) => void;
  /**
   * Controles del sistema (notificación en Android, pantalla de bloqueo y centro de
   * control en iOS) con los metadatos de `source.metadata`. En iOS solo se ven en
   * dispositivo, no en el simulador.
   */
  notificationControls?: boolean;
  /** Seguir sonando con la app en segundo plano (radio/TV). */
  playInBackground?: boolean;
  /**
   * Seguir sonando mientras algo tapa la app sin llevarla al fondo: la persiana
   * de notificaciones o el centro de control en iOS. Va de la mano de
   * `playInBackground`.
   */
  playWhenInactive?: boolean;
  /** Segundo por el que arrancar («seguir viendo»). Solo VOD. */
  startPosition?: number;
  /** Cada pocos segundos, para que quien nos use guarde la posición. */
  onPositionChange?: (seconds: number, duration: number) => void;
  /**
   * En cada aviso de progreso (cada segundo, en VOD), para quien quiera pintar
   * una barra fuera del reproductor (el miniplayer). En directo no se llama.
   */
  onProgressChange?: (seconds: number, duration: number) => void;
  /**
   * Preferencias recordadas entre sesiones (idioma de subtítulos y audio, calidad
   * y velocidad). El reproductor las aplica cuando el stream anuncia sus pistas y
   * avisa por `onPrefsChange` en cuanto el usuario cambia algo.
   */
  prefs?: Prefs;
  onPrefsChange?: (prefs: Prefs) => void;
  /** Controles que se ofrecen; por defecto, todos (ver `PlayerFeatures`). */
  features?: PlayerFeatures;
  /**
   * Hechos de reproducción para telemetría (arranque, rebuffers, errores…). El
   * reproductor no agrega nada: solo cuenta lo que pasa. Ver `player/telemetry`.
   */
  onEvent?: (event: PlaybackEvent) => void;
  /**
   * Color de acento. Lo usan la barra de progreso y todo lo que dice "activo"
   * (CC encendido, opción elegida en ⚙, badge EN VIVO cuando vas en directo),
   * para que no haya dos colores distintos significando lo mismo.
   */
  accent?: string;
  /**
   * Degradado para las barras de progreso, como imagen (ver
   * `PROGRESS_GRADIENT` en la app). Si se pasa, las barras lo usan en vez del
   * color plano; `accent` se queda para iconos, tirador y badges, donde un
   * degradado no pinta nada.
   */
  accentGradient?: string;
  /**
   * Qué se enseña mientras hace buffering. Por defecto, el spinner del sistema;
   * se puede pasar cualquier cosa (en esta app, una animación Lottie) sin que el
   * reproductor dependa de nada para dibujarla.
   */
  loadingIndicator?: React.ReactNode;
};

const BOTTOM_BAR_PADDING = 12;
// Acento por defecto: el rojo de la barra de progreso.
const DEFAULT_ACCENT = '#ff0000';
// La tarjeta de «a continuación» aparece en los últimos segundos del vídeo.
const NEXT_UP_S = 10;
// Ancho en pantalla de la miniatura de la vista previa; el alto lo pone el sprite.
const PREVIEW_WIDTH = 160;

// ⏮ con más de este tiempo reproducido vuelve al inicio en vez de al anterior (como YouTube).
const PREVIOUS_RESTART_THRESHOLD_S = 3;

// Se reexporta para quien ya lo importaba desde aquí.
export {formatTime};

export default function VideoPlayer({
  source,
  title,
  style,
  onError,
  presentation = 'inline',
  fullscreen: fullscreenProp,
  onFullscreenChange,
  onClose,
  onPipChange,
  onMinimize,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  autoplayNext = true,
  compact = false,
  paused: pausedProp,
  onPausedChange,
  dataSaver = 'auto',
  onDataSaverChange,
  storyboard,
  chapters,
  nextUp,
  episodes,
  currentEpisodeId,
  onSelectEpisode,
  notificationControls = true,
  playInBackground = false,
  playWhenInactive = false,
  startPosition = 0,
  onPositionChange,
  onProgressChange,
  prefs,
  onPrefsChange,
  features = {},
  accent = DEFAULT_ACCENT,
  accentGradient,
  loadingIndicator,
  onEvent,
}: Props) {
  // En inmersivo el reproductor ya ocupa la pantalla: no hay ⤢ ni ⌄, y sí candado.
  const immersive = presentation === 'immersive';
  const {
    skipButtons = true,
    doubleTapSkip = true,
    trackButtons = true,
    seekBar = true,
    idleProgressBar = false,
    seekPreview = true,
    holdToSpeed = true,
    subtitlesButton = true,
    settingsButton = true,
    pipButton = true,
    routeButtons = true,
    fullscreenButton = !immersive,
    lockButton = immersive,
    skipIntro = true,
    nextUpCard = true,
    verticalGestures = true,
    pinchToFill = true,
  } = features;
  const videoRef = useRef<VideoRef>(null);
  // Los textos pueden cambiar de idioma en caliente (`setControlsLanguage`).
  useControlsLanguage();
  const insets = useInsets();

  const [ownPaused, setOwnPaused] = useState(false);
  const paused = pausedProp ?? ownPaused;
  // Espejo del valor actual: los setPaused(p => !p) se resuelven contra él, así el
  // callback no depende de `paused` ni se recrea en cada cambio.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const setPaused = useCallback(
    (next: boolean | ((previous: boolean) => boolean)) => {
      const value = typeof next === 'function' ? next(pausedRef.current) : next;
      pausedRef.current = value;
      if (onPausedChange) {
        onPausedChange(value);
      }
      if (pausedProp === undefined) {
        setOwnPaused(value);
      }
    },
    [onPausedChange, pausedProp],
  );
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [rate, setRate] = useState(1);
  // Aceleración por pulsado largo: se activa mientras el dedo siga abajo, así que
  // el ref es quien decide en onPressOut (el estado solo pinta el aviso).
  const [boosting, setBoosting] = useState(false);
  const boostingRef = useRef(false);
  // Directo: isLive viene de onLoad/onProgress (campo añadido a la librería);
  // liveOffset son los segundos por detrás del borde del directo (-1 = desconocido).
  const [isLive, setIsLive] = useState(false);
  const [liveOffset, setLiveOffset] = useState(-1);
  const [seekableDuration, setSeekableDuration] = useState(0);
  // Pantalla completa: como `paused`, si llega por props manda el padre. En
  // inmersivo nace activada.
  const [ownFullscreen, setOwnFullscreen] = useState(immersive);
  const fullscreen = fullscreenProp ?? ownFullscreen;
  const fullscreenRef = useRef(fullscreen);
  fullscreenRef.current = fullscreen;
  const setFullscreen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const value =
        typeof next === 'function' ? next(fullscreenRef.current) : next;
      fullscreenRef.current = value;
      if (fullscreenProp === undefined) {
        // Sin control externo, el aviso lo da el efecto al cambiar el estado.
        setOwnFullscreen(value);
      } else {
        onFullscreenChange?.(value);
      }
    },
    [fullscreenProp, onFullscreenChange],
  );
  // Candado: ignora los toques sobre el vídeo hasta desbloquear. `lockHint` es la
  // pastilla de «Desbloquear» que aparece al tocar la pantalla bloqueada.
  const [locked, setLocked] = useState(false);
  const [lockHint, setLockHint] = useState(false);
  // Picture in Picture. En Android la ventana PiP muestra la Activity entera escalada,
  // así que mientras está activo ocultamos los controles y el vídeo ocupa todo.
  const [pipActive, setPipActive] = useState(false);
  // PiP no existe en todos los sitios (el simulador de iOS no lo soporta, y en
  // Android hace falta que el dispositivo declare la característica). Sin soporte,
  // entrar en PiP no falla: no hace nada. Así que mejor no ofrecer el botón.
  const [pipSupported, setPipSupported] = useState(false);
  useEffect(() => {
    isPictureInPictureSupported().then(setPipSupported);
  }, []);
  // AirPlay (iOS): AVPlayer enruta el vídeo él mismo; aquí solo sabemos que está activo
  // y a qué dispositivo va, para avisarlo en pantalla.
  const [airplay, setAirplay] = useState<{
    active: boolean;
    deviceName?: string | null;
  }>({
    active: false,
  });
  const [controlsVisible, setControlsVisible] = useState(true);
  // Menú ⚙: principal → Calidad / Velocidad.
  const [menu, setMenu] = useState<
    | 'main'
    | 'tracks'
    | 'quality'
    | 'speed'
    | 'subtitles'
    | 'audio'
    | 'saver'
    | 'episodes'
    | null
  >(null);
  /**
   * A dónde vuelve ← en una hoja: a ⚙ si se abrió desde ahí, o se cierra si
   * vino de la fila de acciones de abajo (velocidad, audio y subtítulos…).
   */
  const menuRoot = useRef<'main' | null>('main');
  // Calidad: 'auto' (ABR) o el alto en px de la variante elegida. Solo Android.
  const [videoTracks, setVideoTracks] = useState<VideoTrack[]>([]);
  const [quality, setQuality] = useState<'auto' | number>('auto');
  // Tope de bitrate según la red (ver useNetworkCap) y última estimación de ancho
  // de banda que publica ExoPlayer (`reportBandwidth`, solo Android).
  const networkCap = useNetworkCap(dataSaver);
  // Vista previa de la barra: recorte del storyboard para el instante arrastrado.
  const tileAt = useStoryboard(seekPreview ? storyboard : undefined);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  /**
   * El primer `onLoad` de esta fuente. Hasta que llega no se sabe la duración
   * ni qué pistas hay, así que la mitad de los controles no harían nada: se
   * enseña el indicador de carga y punto.
   */
  const [loaded, setLoaded] = useState(false);
  // Gestos verticales: volumen del reproductor y «brillo». El brillo real del
  // sistema necesita módulo nativo, así que lo que se ajusta es un velo negro
  // encima del vídeo: oscurece, que es para lo que se usa de noche.
  const [volume, setVolume] = useState(1);
  const [dim, setDim] = useState(0);
  // Pellizcar: ajustar (contain) o rellenar (cover) la caja del reproductor.
  const [fill, setFill] = useState(false);
  const [hud, setHud] = useState<{label: string; value?: number} | null>(null);
  const [bandwidth, setBandwidth] = useState(0);
  // Subtítulos: pistas que anuncia el stream y la elegida ('off' = desactivados).
  const [textTracks, setTextTracks] = useState<TextTrack[]>([]);
  const [subtitle, setSubtitle] = useState<'off' | number>('off');
  // Audio: pistas que anuncia el stream y la elegida ('auto' = la del sistema, que
  // es la que casa con el idioma del dispositivo).
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [audioTrack, setAudioTrack] = useState<'auto' | number>('auto');
  // Última pista encendida, para que el botón CC la recupere al volver a activarlos.
  const lastSubtitle = useRef<number | null>(null);
  if (subtitle !== 'off') {
    lastSubtitle.current = subtitle;
  }
  // El usuario descartó el salto automático al siguiente en este vídeo.
  const [nextCancelled, setNextCancelled] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [skipHint, setSkipHint] = useState<{
    side: Side;
    seconds: number;
  } | null>(null);
  // Se incrementa con cada interacción para reiniciar el temporizador de auto-ocultar.
  const [interaction, setInteraction] = useState(0);

  // Recuperación de errores: la librería no reinicializa el reproductor tras un
  // error fatal, así que remontamos <Video> (key) y reanudamos desde la última posición.
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [playerKey, setPlayerKey] = useState(0);
  const [online, setOnline] = useState(true);
  const resumeTimeRef = useRef(0);
  const resumeToLiveRef = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Última posición local conocida, para arrancar el Chromecast donde íbamos.
  const currentTimeRef = useRef(0);
  const surfaceWidth = useRef(1);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{time: number; side: Side} | null>(null);
  const lastSkip = useRef<{time: number; side: Side; seconds: number} | null>(
    null,
  );

  const touch = useCallback(() => setInteraction((n) => n + 1), []);
  /** La tarjeta de «a continuación» está a la vista (ver `showNextUp`). */
  const nextUpOpen = useRef(false);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    touch();
  }, [touch]);

  // Auto-ocultar mientras reproduce y no hay interacción en curso.
  //
  // `!loaded` cuenta como «no hay nada reproduciéndose»: si el vídeo tarda en
  // arrancar, esconder los controles deja una ruleta sobre negro sin ninguna
  // salida a la vista. Se quedan puestos hasta que haya imagen.
  useEffect(() => {
    if (
      !controlsVisible ||
      !loaded ||
      paused ||
      scrubbing ||
      menu ||
      buffering ||
      playerError
    ) {
      return;
    }
    const timer = setTimeout(() => {
      // Con la tarjeta de «a continuación» los controles se quedan, como en
      // Pluto: la barra de tiempo es lo que la sitúa (ver `showNextUp`).
      if (!nextUpOpen.current) {
        setControlsVisible(false);
      }
    }, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [
    controlsVisible,
    loaded,
    paused,
    scrubbing,
    menu,
    buffering,
    playerError,
    interaction,
  ]);

  // Candado: bloquear esconde los controles y deja la superficie sorda; un toque
  // saca la pastilla de «Desbloquear» unos segundos y se vuelve a ir.
  const lockHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashLockHint = useCallback(() => {
    setLockHint(true);
    if (lockHintTimer.current) {
      clearTimeout(lockHintTimer.current);
    }
    lockHintTimer.current = setTimeout(() => setLockHint(false), LOCK_HINT_MS);
  }, []);

  const lock = useCallback(() => {
    setLocked(true);
    setMenu(null);
    setControlsVisible(false);
    flashLockHint();
  }, [flashLockHint]);

  const unlock = useCallback(() => {
    setLocked(false);
    setLockHint(false);
    setControlsVisible(true);
    touch();
  }, [touch]);

  // Pantalla completa: rota a horizontal (los dos sentidos, como Netflix: en
  // Android `lockToLandscape` es SENSOR_LANDSCAPE), avisa al padre y se queda con
  // el botón atrás de Android.
  const backRef = useRef<() => void>(() => {});
  backRef.current = () => {
    if (locked) {
      // Bloqueado, atrás solo suelta el candado: salir sin querer es justo lo que
      // el candado evita.
      unlock();
      return;
    }
    if (immersive) {
      // No hay estado vertical al que volver: atrás cierra.
      if (onClose) {
        onClose();
      }
      return;
    }
    setFullscreen(false);
  };

  useEffect(() => {
    onFullscreenChange?.(fullscreen);
    // En miniplayer manda el vertical aunque el modo siga siendo inmersivo: la
    // app que hay detrás está en portrait, y el back es suyo, no nuestro.
    if (!fullscreen || compact) {
      lockToPortrait();
      return;
    }
    lockToLandscape();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, compact]);

  // Al desmontar se vuelve a vertical: el resto de la app está en portrait.
  useEffect(() => () => lockToPortrait(), []);

  useEffect(() => {
    onPipChange?.(pipActive);
    if (pipActive) {
      setControlsVisible(false);
      setMenu(null);
      return undefined;
    }
    // Al salir de PiP el nativo se queda parado y no avisa a JS: como `paused`
    // ya valía `false`, React no le manda ningún cambio y el vídeo se queda
    // quieto con los controles diciendo «pausar». El mismo truco que para el
    // segundo plano (ver `appStatePause`): mandarlo a pausa y devolverlo, que
    // así sí es un cambio de prop y el nativo vuelve a arrancar.
    if (pausedRef.current) {
      return;
    }
    setPaused(true);
    const timer = setTimeout(() => setPaused(false), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipActive]);

  // Conectividad: al volver la red, reintentar de inmediato si estamos en error.
  // retryNow se incrementa desde el botón "Reintentar" o desde NetInfo.
  const [retryNow, setRetryNow] = useState(0);
  const onlineRef = useRef(true);
  useEffect(() => {
    const unsubscribe = onNetworkChange((state) => {
      const isOnline =
        !!state.isConnected && state.isInternetReachable !== false;
      const cameBack = isOnline && !onlineRef.current;
      onlineRef.current = isOnline;
      setOnline(isOnline);
      if (cameBack) {
        setRetryNow((n) => n + 1);
      }
    });
    return unsubscribe;
  }, []);

  const sourceUri =
    typeof source === 'object' && source !== null && 'uri' in source
      ? (source as {uri?: string}).uri
      : undefined;

  // Preferencias: se leen por ref para no re-aplicarlas en cada render.
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const onPrefsChangeRef = useRef(onPrefsChange);
  onPrefsChangeRef.current = onPrefsChange;
  /** Fusiona y publica el cambio; quien nos use decide dónde se guarda. */
  const updatePrefs = useCallback((partial: Prefs) => {
    onPrefsChangeRef.current?.({...prefsRef.current, ...partial});
  }, []);
  // La posición se publica cada pocos segundos, no en cada onProgress.
  const onPositionRef = useRef(onPositionChange);
  onPositionRef.current = onPositionChange;
  const lastSavedAt = useRef(0);
  // «Seguir viendo»: se aplica una vez por fuente, cuando el medio ya cargó.
  const resumeApplied = useRef(false);
  const prefsApplied = useRef({subtitle: false, audio: false, quality: false});

  // Telemetría. El callback se lee por ref para que cambiarlo no reabra sesiones.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const emitEvent = useCallback((event: PlaybackEvent) => {
    onEventRef.current?.(event);
  }, []);
  const titleRef = useRef(title);
  titleRef.current = title;
  // Cada fuente nueva (también la primera) abre una sesión de medición.
  useEffect(() => {
    emitEvent({type: 'start', title: titleRef.current ?? sourceUri ?? ''});
  }, [emitEvent, sourceUri]);
  // Cambiar de vídeo o de canal ya no remonta el reproductor (así ExoPlayer/AVPlayer
  // no se recrean), así que hay que limpiar a mano lo que era del medio anterior.
  // `firstSource` evita hacerlo en el primer render, donde no hay nada que limpiar.
  const firstSource = useRef(true);
  useEffect(() => {
    if (firstSource.current) {
      firstSource.current = false;
      return;
    }
    setCurrentTime(0);
    setLoaded(false);
    setDuration(0);
    setBuffered(0);
    setBuffering(true);
    setEnded(false);
    setIsLive(false);
    setLiveOffset(-1);
    setSeekableDuration(0);
    setScrubbing(false);
    setVideoTracks([]);
    setQuality('auto');
    setTextTracks([]);
    setSubtitle('off');
    lastSubtitle.current = null;
    setAudioTracks([]);
    setAudioTrack('auto');
    setNextCancelled(false);
    resumeApplied.current = false;
    prefsApplied.current = {subtitle: false, audio: false, quality: false};
    lastSavedAt.current = 0;
    setPlayerError(null);
    setRetryAttempt(0);
    setRetryCountdown(null);
    setMenu(null);
    setControlsVisible(true);
    resumeTimeRef.current = 0;
    resumeToLiveRef.current = false;
    currentTimeRef.current = 0;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, [sourceUri]);

  // Chromecast: al conectar un dispositivo, el vídeo pasa al receptor y la
  // reproducción local se pausa; al desconectar, se reanuda donde iba el receptor.
  const cast = useCast({
    media: {url: sourceUri, title, isLive, duration},
    getLocalTime: () => currentTimeRef.current,
    onCastStart: () => {
      setPaused(true);
      setMenu(null);
      setControlsVisible(true);
    },
    onCastEnd: (position) => {
      if (!isLive && position > 0) {
        videoRef.current?.seek(position);
        setCurrentTime(position);
      }
      setPaused(false);
    },
  });
  const casting = cast.casting;

  /**
   * El sistema puede parar el vídeo por su cuenta —la persiana de
   * notificaciones, el centro de control, irse al escritorio— y lo hace sin
   * avisar a JS: los controles se quedaban con cara de estar reproduciendo, el
   * botón diciendo «pausar», encima de un vídeo parado. La regla de qué hacer
   * en cada caso vive en `decideOnAppState`, que se puede probar aparte.
   */
  const backgroundGuards = useRef({
    pipActive,
    casting,
    playInBackground,
    playWhenInactive,
  });
  backgroundGuards.current = {
    pipActive,
    casting,
    playInBackground,
    playWhenInactive,
  };
  // Se pausó solo porque algo tapó la app, no porque nadie lo pidiera: al
  // volver, a seguir.
  const resumeOnActive = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const guards = backgroundGuards.current;
      const decision = decideOnAppState(state, {
        paused: pausedRef.current,
        resumeOnActive: resumeOnActive.current,
        guarded:
          guards.pipActive ||
          guards.casting ||
          guards.playInBackground ||
          guards.playWhenInactive,
      });
      resumeOnActive.current = decision.resumeOnActive;
      if (decision.action !== 'none') {
        setPaused(decision.action === 'pause');
      }
    });
    return () => subscription.remove();
  }, [setPaused]);

  const retry = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    setRetryCountdown(null);
    setPlayerError(null);
    setBuffering(true);
    setPaused(false);
    setPlayerKey((k) => k + 1); // remonta <Video> → la librería vuelve a preparar el source
  }, [setPaused]);

  // Reintento manual (botón) o forzado por la red: reinicia la cuenta de intentos.
  useEffect(() => {
    if (retryNow > 0 && playerError) {
      setRetryAttempt(0);
      retry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryNow]);

  // Reintento automático con backoff mientras haya red. Sin red, esperamos a NetInfo.
  useEffect(() => {
    if (!playerError || !online) {
      setRetryCountdown(null);
      return;
    }
    const delay = RETRY_DELAYS_MS[retryAttempt];
    if (delay === undefined) {
      setRetryCountdown(null); // agotados: queda el botón "Reintentar"
      return;
    }
    const deadline = Date.now() + delay;
    setRetryCountdown(Math.ceil(delay / 1000));
    const tick = setInterval(
      () =>
        setRetryCountdown(
          Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
        ),
      500,
    );
    retryTimer.current = setTimeout(() => {
      clearInterval(tick);
      setRetryAttempt((a) => a + 1);
      retry();
    }, delay);
    return () => {
      clearInterval(tick);
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [playerError, online, retryAttempt, retry]);

  useEffect(
    () => () => {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
      }
      if (skipHintTimer.current) {
        clearTimeout(skipHintTimer.current);
      }
      if (lockHintTimer.current) {
        clearTimeout(lockHintTimer.current);
      }
    },
    [],
  );

  const seekTo = useCallback(
    (time: number) => {
      const max = isLive ? seekableDuration : duration;
      const clamped = Math.max(0, Math.min(max || 0, time));
      if (casting) {
        cast.seek(clamped);
        return;
      }
      videoRef.current?.seek(clamped);
      setCurrentTime(clamped);
      emitEvent({type: 'seek'});
      if (ended && clamped < duration) {
        setEnded(false);
      }
    },
    [cast, casting, duration, emitEvent, ended, isLive, seekableDuration],
  );

  // Vuelve a la posición live del reproductor (currentTime + liveOffset) y reanuda.
  // No saltamos al borde absoluto de la ventana para evitar rebuffering.
  const goToLive = useCallback(() => {
    const target =
      liveOffset >= 0 ? currentTime + liveOffset : seekableDuration;
    videoRef.current?.seek(target);
    setCurrentTime(target);
    setPaused(false);
    touch();
  }, [currentTime, liveOffset, seekableDuration, setPaused, touch]);

  const togglePlay = useCallback(() => {
    if (casting) {
      if (cast.paused) {
        cast.play();
      } else {
        cast.pause();
      }
      touch();
      return;
    }
    if (ended) {
      seekTo(0);
      setEnded(false);
      setPaused(false);
    } else {
      setPaused((p) => !p);
    }
    touch();
  }, [cast, casting, ended, seekTo, setPaused, touch]);

  // showHint: el indicador lateral solo se muestra con el gesto de doble tap.
  const skip = useCallback(
    (side: Side, showHint = true) => {
      const now = Date.now();
      const chained =
        lastSkip.current &&
        lastSkip.current.side === side &&
        now - lastSkip.current.time < SKIP_CHAIN_MS;
      const seconds = (chained ? lastSkip.current!.seconds : 0) + SKIP_SECONDS;
      lastSkip.current = {time: now, side, seconds};

      const from = casting ? cast.position : currentTime;
      seekTo(from + (side === 'left' ? -SKIP_SECONDS : SKIP_SECONDS));
      if (showHint) {
        setSkipHint({side, seconds});
        if (skipHintTimer.current) {
          clearTimeout(skipHintTimer.current);
        }
        skipHintTimer.current = setTimeout(
          () => setSkipHint(null),
          SKIP_CHAIN_MS,
        );
      }
      touch();
    },
    [cast, casting, currentTime, seekTo, touch],
  );

  // Tap sencillo: mostrar/ocultar. Doble tap en un lado: saltar ±10 s.
  const onSurfacePress = (e: GestureResponderEvent) => {
    if (pipActive) {
      return;
    }
    if (!canSkip || !doubleTapSkip) {
      // Sin doble tap (directo, o desactivado por props) el tap actúa al instante.
      if (controlsVisible) {
        setControlsVisible(false);
      } else {
        showControls();
      }
      return;
    }
    const side: Side =
      e.nativeEvent.locationX < surfaceWidth.current / 2 ? 'left' : 'right';
    const now = Date.now();

    const chaining =
      lastSkip.current &&
      lastSkip.current.side === side &&
      now - lastSkip.current.time < SKIP_CHAIN_MS;
    const isDouble =
      lastTap.current &&
      lastTap.current.side === side &&
      now - lastTap.current.time < DOUBLE_TAP_MS;

    lastTap.current = {time: now, side};

    if (chaining || isDouble) {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      skip(side);
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      if (controlsVisible) {
        setControlsVisible(false);
      } else {
        showControls();
      }
    }, DOUBLE_TAP_MS);
  };

  // Mantener pulsado: x2 mientras el dedo siga abajo, como en TikTok. No en directo
  // (correríamos hasta el borde del directo y solo conseguiríamos un atasco) ni
  // transmitiendo (ahí la velocidad la manda el receptor).
  const canBoost =
    holdToSpeed && !isLive && !casting && !playerError && !paused && !ended;
  // Si en ⚙ ya había puesto algo más rápido, su elección gana: acelerar nunca frena.
  const boostRate = Math.max(rate, BOOST_RATE);

  const startBoost = () => {
    if (!canBoost) {
      return;
    }
    boostingRef.current = true;
    setBoosting(true);
    // Los controles estorban justo cuando quieres ver pasar el vídeo: se van (y al
    // soltar se quedan así, como en YouTube; un tap los devuelve).
    setControlsVisible(false);
  };

  const endBoost = () => {
    if (!boostingRef.current) {
      return;
    }
    boostingRef.current = false;
    setBoosting(false);
  };

  // Si acelerar deja de tener sentido con el dedo todavía abajo (terminó el vídeo,
  // llegó un error, pausaron desde la notificación), volver a la velocidad normal.
  useEffect(() => {
    if (boosting && !canBoost) {
      boostingRef.current = false;
      setBoosting(false);
    }
  }, [boosting, canBoost]);

  // Deslizar en vertical y pellizcar. Va por encima del `Pressable` de los taps:
  // solo reclama el gesto cuando hay movimiento claro, así el tap, el doble tap y
  // el pulsado largo siguen funcionando igual.
  const surfaceHeight = useRef(1);
  // Posición de la caja en la ventana: hace falta para saber en qué mitad empezó el
  // gesto. `locationX` no sirve aquí, porque el toque empieza en el hijo y el padre
  // se queda el gesto después.
  const containerRef = useRef<React.ComponentRef<typeof View>>(null);
  const surfacePageX = useRef(0);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef({
    mode: null as null | 'volume' | 'brightness' | 'pinch',
    start: 0,
    distance: 0,
  }).current;
  const gestureRef = useRef({
    verticalGestures,
    pinchToFill,
    volume,
    dim,
    compact,
    locked,
  });
  gestureRef.current = {
    verticalGestures,
    pinchToFill,
    volume,
    dim,
    compact,
    locked,
  };

  const showHud = useCallback((label: string, value?: number) => {
    setHud({label, value});
    if (hudTimer.current) {
      clearTimeout(hudTimer.current);
    }
    hudTimer.current = setTimeout(() => setHud(null), 900);
  }, []);

  const touchDistance = (
    touches: ReadonlyArray<{pageX: number; pageY: number}>,
  ) => {
    const [a, b] = touches;
    if (!a || !b) {
      return 0;
    }
    return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
  };

  const pan = useRef(
    PanResponder.create({
      // El tap lo sigue atendiendo el Pressable de debajo.
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (e, g) => {
        const {
          verticalGestures: vertical,
          pinchToFill: pinch,
          compact: mini,
          locked: blocked,
        } = gestureRef.current;
        if (mini || blocked) {
          return false;
        }
        if (pinch && e.nativeEvent.touches.length === 2) {
          return true;
        }
        return (
          vertical &&
          Math.abs(g.dy) > 12 &&
          Math.abs(g.dy) > Math.abs(g.dx) * 1.5
        );
      },
      onPanResponderGrant: (e, g) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          gesture.mode = 'pinch';
          gesture.distance = touchDistance(touches);
          return;
        }
        const startX = g.x0 - surfacePageX.current;
        const right = startX > surfaceWidth.current / 2;
        gesture.mode = right ? 'volume' : 'brightness';
        gesture.start = right
          ? gestureRef.current.volume
          : 1 - gestureRef.current.dim;
      },
      onPanResponderMove: (e, g) => {
        if (gesture.mode === 'pinch') {
          const touches = e.nativeEvent.touches;
          if (touches.length < 2) {
            return;
          }
          const ratio = touchDistance(touches) / (gesture.distance || 1);
          if (ratio > 1.15) {
            setFill(true);
            showHud(t('gesture.fill'));
          } else if (ratio < 0.87) {
            setFill(false);
            showHud(t('gesture.fit'));
          }
          return;
        }
        if (!gesture.mode) {
          return;
        }
        // Todo el alto de la caja recorre el rango entero, con un poco de margen.
        const delta = -g.dy / (surfaceHeight.current * 0.8);
        const value = Math.max(0, Math.min(1, gesture.start + delta));
        if (gesture.mode === 'volume') {
          setVolume(value);
          showHud(t('gesture.volume'), value);
        } else {
          // El velo es lo contrario del brillo: a menos brillo, más velo.
          setDim(1 - value);
          showHud(t('gesture.brightness'), value);
        }
      },
      onPanResponderRelease: () => {
        gesture.mode = null;
      },
      onPanResponderTerminate: () => {
        gesture.mode = null;
      },
    }),
  ).current;

  useEffect(
    () => () => {
      if (hudTimer.current) {
        clearTimeout(hudTimer.current);
      }
    },
    [],
  );

  const onLoad = (data: OnLoadData) => {
    setLoaded(true);
    setDuration(data.duration);
    // «Seguir viendo»: solo en VOD, y solo la primera carga de esta fuente.
    if (!resumeApplied.current) {
      resumeApplied.current = true;
      if (!data.isLive && startPosition > 0 && startPosition < data.duration) {
        videoRef.current?.seek(startPosition);
        setCurrentTime(startPosition);
      }
      const savedSpeed = prefsRef.current?.speed;
      if (savedSpeed && savedSpeed !== 1 && !data.isLive) {
        setRate(savedSpeed);
      }
    }
    setIsLive(!!data.isLive);
    setBuffering(false);
    if (data.videoTracks?.length) {
      setVideoTracks(data.videoTracks);
    }
    if (data.textTracks?.length) {
      setTextTracks(data.textTracks);
      applySubtitlePref(data.textTracks);
    }
    if (data.audioTracks?.length) {
      setAudioTracks(data.audioTracks);
      applyAudioPref(data.audioTracks);
    }
    // Cargó tras un reintento: reanudar donde estábamos (o al directo).
    if (playerKey > 0) {
      if (resumeToLiveRef.current || data.isLive) {
        // Al remontar, el reproductor arranca ya en la posición live por defecto.
      } else if (resumeTimeRef.current > 0) {
        videoRef.current?.seek(resumeTimeRef.current);
      }
      setRetryAttempt(0);
    }
  };

  const onPlayerError = (e: OnVideoErrorData) => {
    const err = e.error;
    const message =
      err.errorString ??
      err.localizedDescription ??
      err.error ??
      JSON.stringify(err);
    resumeTimeRef.current = currentTime;
    resumeToLiveRef.current = isLive && atLiveEdge;
    setBuffering(false);
    setPlayerError(message);
    setControlsVisible(true);
    emitEvent({type: 'error', message});
    onError?.(message);
  };

  const onVideoTracks = (data: OnVideoTracksData) =>
    setVideoTracks(data.videoTracks);
  const onAudioTracks = (data: OnAudioTracksData) => {
    const tracks = data.audioTracks ?? [];
    setAudioTracks(tracks);
    applyAudioPref(tracks);
  };

  /** Idioma de audio recordado → índice de este stream (los índices no se guardan). */
  const applyAudioPref = (tracks: AudioTrack[]) => {
    const wanted = prefsRef.current?.audioLanguage;
    if (prefsApplied.current.audio || !wanted || !tracks.length) {
      return;
    }
    prefsApplied.current.audio = true;
    const match = tracks.find((track) => track.language === wanted);
    if (match) {
      setAudioTrack(match.index);
    }
  };

  /** Lo mismo con los subtítulos: se recuerda el idioma, o que iban apagados. */
  const applySubtitlePref = (tracks: TextTrack[]) => {
    const wanted = prefsRef.current?.subtitleLanguage;
    if (prefsApplied.current.subtitle || !wanted || !tracks.length) {
      return;
    }
    prefsApplied.current.subtitle = true;
    if (wanted === 'off') {
      return;
    }
    const match = tracks.find((track) => track.language === wanted);
    if (match) {
      setSubtitle(match.index);
    }
  };
  const onTextTracks = (data: OnTextTracksData) => {
    setTextTracks(data.textTracks);
    applySubtitlePref(data.textTracks);
  };

  const onProgress = (data: OnProgressData) => {
    currentTimeRef.current = data.currentTime;
    if (!scrubbing) {
      setCurrentTime(data.currentTime);
    }
    setBuffered(data.playableDuration);
    setSeekableDuration(data.seekableDuration);
    if (data.isLive !== undefined) {
      setIsLive(data.isLive);
    }
    setLiveOffset(data.liveOffset ?? -1);
    emitEvent({type: 'progress', seconds: data.currentTime});
    if (!data.isLive && duration > 0) {
      onProgressChange?.(data.currentTime, duration);
    }
    // Posición para «seguir viendo»: a disco cada pocos segundos, no en cada aviso.
    const now = Date.now();
    if (
      !data.isLive &&
      data.seekableDuration > 0 &&
      now - lastSavedAt.current > SAVE_EVERY_MS
    ) {
      lastSavedAt.current = now;
      onPositionRef.current?.(data.currentTime, duration);
    }
  };

  const onBuffer = (data: OnBufferData) => {
    setBuffering(data.isBuffering);
    emitEvent({type: 'buffer', buffering: data.isBuffering});
  };

  const onEnd = () => {
    if (autoplayNext && hasNext && onNext && !nextCancelled) {
      onNext();
      return;
    }
    setEnded(true);
    setPaused(true);
    setCurrentTime(duration);
    showControls();
    emitEvent({type: 'end'});
  };

  // ⏮: en VOD reinicia si ya llevamos unos segundos; si no (o en directo), va al anterior.
  const goPrevious = () => {
    const restart =
      !isLive && (currentTime > PREVIOUS_RESTART_THRESHOLD_S || !hasPrevious);
    if (restart || !onPrevious) {
      seekTo(0);
      setPaused(false);
    } else if (hasPrevious) {
      onPrevious();
    }
    touch();
  };

  // Mientras se transmite, los tiempos y el estado de reproducción vienen del receptor.
  const displayTime = scrubbing
    ? scrubTime
    : casting
    ? cast.position
    : currentTime;
  const uiPaused = casting ? cast.paused : paused;
  const uiBuffering = casting ? cast.buffering : buffering;

  // Alturas únicas disponibles (1080, 720, …) de mayor a menor.
  const qualityOptions = Array.from(
    new Set(videoTracks.map((track) => track.height ?? 0).filter((h) => h > 0)),
  ).sort((a, b) => b - a);
  const playingHeight = videoTracks.find((track) => track.selected)?.height;
  const qualityLabel = (q: 'auto' | number) =>
    q === 'auto'
      ? playingHeight
        ? t('quality.autoAt', {height: playingHeight})
        : t('quality.auto')
      : t('quality.height', {height: q});
  const speedLabel = (r: number) =>
    r === 1 ? t('speed.normal') : t('speed.rate', {rate: r});
  const saverLabel = (mode: DataSaver) =>
    mode === 'auto'
      ? t('saver.auto')
      : mode === 'on'
      ? t('saver.on')
      : t('saver.off');
  // iOS puede anunciar pistas con título vacío (AVPlayer expone la opción legible
  // aunque el stream no traiga subtítulos), así que no vale `??`: hay que caer al
  // idioma o al número también con cadena vacía.
  const trackLabel = (track: {
    title?: string;
    language?: string;
    index: number;
  }) =>
    track.title ||
    track.language ||
    t('track.fallback', {number: track.index + 1});
  const audioLabel = () => {
    if (audioTrack === 'auto') {
      const playing = audioTracks.find((track) => track.selected);
      return playing ? trackLabel(playing) : t('audio.default');
    }
    const track = audioTracks.find((item) => item.index === audioTrack);
    return track ? trackLabel(track) : t('audio.default');
  };
  const subtitleLabel = () => {
    if (subtitle === 'off') {
      return t('subtitles.off');
    }
    const track = textTracks.find((item) => item.index === subtitle);
    return track ? trackLabel(track) : t('subtitles.off');
  };
  // En directo la barra representa la ventana DVR (seekableDuration), no una duración fija.
  // Transmitiendo, la duración la da el receptor (en directo no hay DVR remoto).
  const timelineDuration = casting
    ? cast.duration || duration
    : isLive
    ? seekableDuration
    : duration;
  const hasDvr = casting
    ? !isLive && timelineDuration > 0
    : !isLive || seekableDuration >= MIN_DVR_WINDOW_S;
  // En directo no hay saltos de ±10 s (ni botones ni doble tap).
  const canSkip = !isLive;
  // Capítulo en curso y bloque saltable (intro) bajo el cursor.
  const currentChapter = chapters?.find(
    (chapter) => displayTime >= chapter.start && displayTime < chapter.end,
  );
  const showSkipIntro =
    skipIntro &&
    !!currentChapter?.skippable &&
    !locked &&
    !playerError &&
    !casting &&
    !pipActive &&
    !scrubbing;
  // Tarjeta de «a continuación»: últimos segundos de un VOD con siguiente.
  const remaining = duration > 0 ? duration - currentTime : 0;
  const showNextUp =
    nextUpCard &&
    !!nextUp &&
    !!onNext &&
    hasNext &&
    !locked &&
    !isLive &&
    !casting &&
    !playerError &&
    !pipActive &&
    !ended &&
    !nextCancelled &&
    duration > 0 &&
    remaining > 0 &&
    remaining <= NEXT_UP_S;
  nextUpOpen.current = showNextUp;
  // Al salir la tarjeta se enseñan los controles y se quedan (ver el auto-ocultado).
  useEffect(() => {
    if (showNextUp) {
      setControlsVisible(true);
    }
  }, [showNextUp]);
  // Botones de pista anterior/siguiente cuando hay lista (también en directo: una
  // lista puede tener varios canales en vivo).
  const showTrackButtons = trackButtons && (!!onNext || !!onPrevious);
  const atLiveEdge =
    isLive && liveOffset >= 0 && liveOffset <= LIVE_EDGE_TOLERANCE_S;
  // Posición live del reproductor dentro de la ventana DVR.
  const livePosition =
    liveOffset >= 0 ? currentTime + liveOffset : seekableDuration;
  // Mientras se arrastra en directo, retraso estimado respecto a esa posición.
  const displayLiveOffset = scrubbing
    ? Math.max(0, livePosition - scrubTime)
    : liveOffset;

  /**
   * Al abrir a pantalla completa se gira a horizontal, y el giro no es
   * instantáneo: durante un par de fotogramas la caja mide lo de antes y los
   * márgenes seguros (el notch) todavía son los de vertical. Pintar los
   * controles ahí es lo que hacía que saltaran de sitio nada más entrar.
   * Hasta que la caja no está donde va a quedarse, no se pintan.
   *
   * Eso sí, con plazo: hay móviles con el giro bloqueado y apps sin
   * `react-native-orientation-locker`, y ahí la caja nunca llega a ser
   * apaisada. Pasado el plazo se pintan igual, porque unos controles mal
   * colocados un instante son mucho mejor que ninguno.
   */
  const [placeTimedOut, setPlaceTimedOut] = useState(false);
  useEffect(() => {
    if (!fullscreen || compact) {
      setPlaceTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setPlaceTimedOut(true), PLACE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fullscreen, compact]);

  const placed =
    layoutWidth > 0 &&
    layoutHeight > 0 &&
    (!fullscreen || compact || layoutWidth >= layoutHeight || placeTimedOut);

  // En fullscreen el vídeo va de borde a borde; los controles respetan las
  // barras del sistema (edge-to-edge en Android 15+, notch en iOS).
  const controlsInsets = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  // Vista previa: solo mientras se arrastra, en VOD y con storyboard. La barra
  // ocupa el ancho del reproductor menos el padding de la barra inferior.
  const previewTile =
    scrubbing && !isLive && !casting ? tileAt(scrubTime) : null;
  // El sprite se dibuja a su tamaño natural en píxeles (dividiendo por la densidad)
  // y se amplía con un transform: así el bitmap se decodifica una sola vez y al
  // tamaño real del fichero, en vez de al de la vista, que en pantallas densas
  // multiplicaba la memoria. El aumento lo hace la GPU al pintar.
  const density = PixelRatio.get();
  const previewNaturalWidth = previewTile ? previewTile.width / density : 0;
  const previewNaturalHeight = previewTile ? previewTile.height / density : 0;
  const previewScale = previewNaturalWidth
    ? PREVIEW_WIDTH / previewNaturalWidth
    : 1;
  const barInset = fullscreen ? insets.left + insets.right : 0;
  const barWidth = Math.max(1, layoutWidth - barInset - 2 * BOTTOM_BAR_PADDING);
  const previewLeft = Math.min(
    barWidth - PREVIEW_WIDTH / 2,
    Math.max(
      PREVIEW_WIDTH / 2,
      (timelineDuration > 0 ? scrubTime / timelineDuration : 0) * barWidth,
    ),
  );

  // Android: los subtítulos se pintan dentro del vídeo, así que hay que apartarlos
  // de la barra inferior mientras los controles están a la vista (iOS los coloca solo).
  // Memoizado: si no, cada render manda una prop nueva a la vista nativa.
  const subtitleStyle = useMemo(
    () => ({
      subtitlesFollowVideo: true,
      paddingBottom: controlsVisible && !compact ? 56 : 12,
    }),
    [controlsVisible, compact],
  );

  const containerStyle =
    (fullscreen || pipActive) && !compact
      ? [styles.container, styles.fullscreen]
      : [styles.container, style];

  return (
    <View
      ref={containerRef}
      style={containerStyle}
      onLayout={(e) => {
        surfaceWidth.current = e.nativeEvent.layout.width || 1;
        surfaceHeight.current = e.nativeEvent.layout.height || 1;
        setLayoutWidth(e.nativeEvent.layout.width || 0);
        setLayoutHeight(e.nativeEvent.layout.height || 0);
        // La caja se mueve (miniplayer, pantalla completa): hay que remedir.
        containerRef.current?.measureInWindow((x) => {
          surfacePageX.current = x;
        });
      }}>
      <StatusBar hidden={fullscreen && !compact} />

      <Video
        key={playerKey}
        ref={videoRef}
        source={source}
        style={StyleSheet.absoluteFill}
        paused={paused}
        rate={boosting ? boostRate : rate}
        resizeMode={fill ? 'cover' : 'contain'}
        volume={volume}
        controls={false}
        // Android: sin esta prop la librería usa la política por defecto de ExoPlayer
        // (3 reintentos y error). Con ella, los fallos de red reintentan hasta que vuelva.
        disableDisconnectError
        // Controles del sistema: la librería publica una MediaSession con los
        // metadatos que lleve la fuente (título, autor, carátula).
        showNotificationControls={notificationControls && !casting}
        playInBackground={playInBackground}
        playWhenInactive={playWhenInactive}
        // PiP automático al salir de la app (Android 12+ / iOS 14.2+) y manual con el botón.
        enterPictureInPictureOnLeave={pipSupported}
        onPictureInPictureStatusChanged={(e) => setPipActive(e.isActive)}
        // AirPlay: el vídeo sale por la tele, pero lo sigue reproduciendo este <Video>,
        // así que los controles valen igual; solo cambia lo que se ve en el móvil.
        onExternalPlaybackChange={(e: OnExternalPlaybackChangeData) =>
          setAirplay({
            active: e.isExternalPlaybackActive,
            deviceName: e.deviceName,
          })
        }
        // iOS: el usuario tocó "volver a la app" desde la ventana PiP; ya no hay nada que
        // restaurar (el reproductor sigue montado), así que confirmamos de inmediato.
        onRestoreUserInterfaceForPictureInPictureStop={() =>
          videoRef.current?.restoreUserInterfaceForPictureInPictureStopCompleted(
            true,
          )
        }
        // Cada aviso de progreso re-renderiza el overlay entero. Con los controles
        // ocultos lo único que se mueve es la barra fina, así que basta 1 por segundo.
        progressUpdateInterval={controlsVisible || scrubbing ? 250 : 1000}
        onLoad={onLoad}
        onProgress={onProgress}
        onBuffer={onBuffer}
        onVideoTracks={onVideoTracks}
        onTextTracks={onTextTracks}
        onAudioTracks={onAudioTracks}
        selectedAudioTrack={
          audioTrack === 'auto'
            ? {type: SelectedTrackType.SYSTEM}
            : {type: SelectedTrackType.INDEX, value: audioTrack}
        }
        // Tope de datos: solo manda con calidad automática; si el usuario ha fijado
        // una resolución a mano, su elección gana. 0 = sin tope.
        //
        // Encogido en el miniplayer no se baja aparte: cambiar de resolución
        // al minimizar deja en algunos decodificadores (el del emulador, al
        // menos) el fotograma pequeño en una esquina del buffer grande, con
        // el resto congelado.
        maxBitRate={quality === 'auto' ? networkCap.bitrate : 0}
        reportBandwidth
        onBandwidthUpdate={(e) => {
          setBandwidth(e.bitrate ?? 0);
          emitEvent({type: 'bitrate', bps: e.bitrate ?? 0});
        }}
        // Primer fotograma en pantalla: cierra la medición del arranque.
        onReadyForDisplay={() => emitEvent({type: 'ready', live: isLive})}
        selectedTextTrack={
          subtitle === 'off'
            ? {type: SelectedTrackType.DISABLED}
            : {type: SelectedTrackType.INDEX, value: subtitle}
        }
        // Android dibuja los subtítulos dentro de la superficie: hay que subirlos
        // cuando los controles tapan la parte de abajo (en iOS los coloca el sistema).
        subtitleStyle={subtitleStyle}
        selectedVideoTrack={
          quality === 'auto'
            ? {type: SelectedVideoTrackType.AUTO}
            : {type: SelectedVideoTrackType.RESOLUTION, value: quality}
        }
        onEnd={onEnd}
        onError={onPlayerError}
      />

      {/* Superficie táctil: tap, doble tap y pulsado largo. En miniplayer los gestos
          los maneja quien nos envuelve, así que aquí no se pinta nada más que el vídeo. */}
      {/* Velo del gesto de brillo: encima del vídeo, debajo de todo lo demás. */}
      {dim > 0 && (
        <View pointerEvents="none" style={[styles.dimVeil, {opacity: dim}]} />
      )}

      {!compact && !locked && (
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('a11y.surface')}
            style={StyleSheet.absoluteFill}
            onPress={onSurfacePress}
            // Pressable no llama a onPress si ya disparó el pulsado largo, así que el
            // x2 no choca con el tap ni con el doble tap de ±10 s.
            delayLongPress={BOOST_HOLD_MS}
            onLongPress={startBoost}
            onPressOut={endBoost}
          />
        </View>
      )}

      {/* Pantalla bloqueada: se come todos los toques y solo ofrece desbloquear */}
      {locked && !compact && !pipActive && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('a11y.locked')}
            style={StyleSheet.absoluteFill}
            onPress={flashLockHint}
          />
          {lockHint && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('a11y.unlock')}
              style={({pressed}) => [
                styles.unlockPill,
                {bottom: 24 + (fullscreen ? insets.bottom : 0)},
                pressed && styles.dimmed,
              ]}
              onPress={unlock}>
              <LockIcon open size={18} />
              <Text style={styles.unlockText}>{t('lock.unlock')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Aviso del gesto en curso (volumen, brillo o encuadre) */}
      {hud && !compact && (
        <View pointerEvents="none" style={styles.hud}>
          <Text style={styles.hudLabel}>{hud.label}</Text>
          {hud.value !== undefined && (
            <View style={styles.hudTrack}>
              {accentGradient ? (
                <Image
                  source={{uri: accentGradient}}
                  style={[
                    styles.hudFill,
                    {width: `${Math.round(hud.value * 100)}%`},
                  ]}
                  resizeMode="stretch"
                  fadeDuration={0}
                />
              ) : (
                <View
                  style={[
                    styles.hudFill,
                    {
                      backgroundColor: accent,
                      width: `${Math.round(hud.value * 100)}%`,
                    },
                  ]}
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* AirPlay: el vídeo se ve en la tele; aquí queda el estado (los controles siguen
          gobernando el mismo AVPlayer, por eso no hay controles remotos aparte) */}
      {airplay.active && !casting && (
        <View pointerEvents="none" style={styles.castOverlay}>
          {/* Igual que al transmitir: con los controles visibles solo queda el fondo,
              el dispositivo se lee en la fila de abajo. */}
          {!controlsVisible && (
            <>
              <AirPlayGlyph size={56} />
              <Text style={styles.castTitle} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <Text style={styles.castDevice} numberOfLines={1}>
                {t('airplay.playingOn', {
                  device: airplay.deviceName ?? t('airplay.name'),
                })}
              </Text>
            </>
          )}
        </View>
      )}

      {/* Transmitiendo: el vídeo se ve en el Chromecast, aquí queda el estado */}
      {casting && (
        <View pointerEvents="none" style={styles.castOverlay}>
          {/* Con los controles visibles solo queda el fondo: el icono estorbaría a los
              botones centrales y el dispositivo ya se lee bajo el título. */}
          {!controlsVisible && (
            <>
              <CastIcon size={56} connected />
              <Text style={styles.castTitle} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <Text style={styles.castDevice} numberOfLines={1}>
                {cast.loadError
                  ? t('cast.failed', {error: cast.loadError})
                  : t('cast.playingOn', {device: cast.deviceName})}
              </Text>
            </>
          )}
        </View>
      )}

      {!compact && (
        <>
          {/* Indicador de salto (±10 s) */}
          {skipHint && (
            <View
              pointerEvents="none"
              style={[
                styles.skipHint,
                skipHint.side === 'left'
                  ? styles.skipHintLeft
                  : styles.skipHintRight,
              ]}>
              <Text style={styles.skipHintArrows}>
                {skipHint.side === 'left' ? '◀◀' : '▶▶'}
              </Text>
              <Text style={styles.skipHintText}>{skipHint.seconds} s</Text>
            </View>
          )}

          {/* Saltar intro: va por libre, se vea o no el resto de controles (como Netflix) */}
          {showSkipIntro && currentChapter && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chapter.skipIntro')}
              style={({pressed}) => [
                styles.skipIntro,
                {
                  // Con los controles a la vista sube por encima de la barra;
                  // sin ellos baja a la esquina, que es donde se busca.
                  bottom:
                    (controlsVisible ? 96 : 32) +
                    (fullscreen ? insets.bottom : 0),
                  right: 24 + (fullscreen ? insets.right : 0),
                },
                pressed && styles.skipIntroPressed,
              ]}
              onPress={() => {
                seekTo(currentChapter.end);
                touch();
              }}>
              <Text style={styles.skipIntroText}>{t('chapter.skipIntro')}</Text>
            </Pressable>
          )}

          {/* A continuación: los últimos segundos. Centrada y sin fondo, como
              Pluto: la miniatura con ▶ salta ya, la ✕ lo deja estar y el
              encabezado lleva la cuenta atrás. */}
          {showNextUp && nextUp && (
            <View
              pointerEvents="box-none"
              style={[
                styles.nextUpWrap,
                // En la mitad de abajo, justo encima de la barra de tiempo,
                // como Pluto; a la misma altura se vean o no los controles.
                {paddingBottom: 88 + (fullscreen ? insets.bottom : 0)},
              ]}>
              <View style={styles.nextUp}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('next.playNow')}
                  style={({pressed}) => [
                    styles.nextUpThumb,
                    pressed && styles.dimmed,
                  ]}
                  onPress={() => {
                    onNext?.();
                    touch();
                  }}>
                  {nextUp.image ? (
                    <Image
                      source={{uri: nextUp.image}}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.nextUpThumbPlay}>
                    <PlayIcon size={28} />
                  </View>
                </Pressable>
                <View style={styles.nextUpText}>
                  <Text style={styles.nextUpLabel}>
                    {t('next.countdown', {seconds: Math.ceil(remaining)})}
                  </Text>
                  <Text style={styles.nextUpTitle} numberOfLines={1}>
                    {nextUp.title}
                  </Text>
                  {nextUp.badge || nextUp.subtitle ? (
                    <Text style={styles.nextUpSubtitle} numberOfLines={1}>
                      {nextUp.badge ? (
                        <Text style={styles.nextUpBadge}>
                          {nextUp.badge}
                          {nextUp.subtitle ? '  ' : ''}
                        </Text>
                      ) : null}
                      {nextUp.subtitle}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('next.cancel')}
                  hitSlop={12}
                  style={({pressed}) => [
                    styles.nextUpClose,
                    pressed && styles.dimmed,
                  ]}
                  onPress={() => {
                    setNextCancelled(true);
                    touch();
                  }}>
                  <CloseIcon size={22} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Aceleración mientras se mantiene pulsado */}
          {boosting && (
            <View pointerEvents="none" style={styles.boostBadge}>
              <FastForwardIcon size={16} />
              <Text style={styles.boostText}>{`${boostRate}x`}</Text>
            </View>
          )}

          {/* Spinner de carga */}
          {(uiBuffering || !loaded) && !scrubbing && !playerError && (
            <View pointerEvents="none" style={styles.center}>
              {loadingIndicator ?? (
                <ActivityIndicator size="large" color="#fff" />
              )}
            </View>
          )}

          {/* Aviso de red caída (sin error todavía: ExoPlayer/AVPlayer siguen reintentando) */}
          {!online && !playerError && (
            <View pointerEvents="none" style={styles.offlineBanner}>
              <Text style={styles.offlineText}>{t('offline.banner')}</Text>
            </View>
          )}

          {/* Error con reintento */}
          {playerError && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorTitle}>
                {online ? t('error.title') : t('error.offlineTitle')}
              </Text>
              <Text style={styles.errorDetail} numberOfLines={2}>
                {online ? playerError : t('error.offlineDetail')}
              </Text>
              <Pressable
                style={({pressed}) => [
                  styles.retryButton,
                  pressed && styles.dimmed,
                ]}
                onPress={() => setRetryNow((n) => n + 1)}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.retry')}>
                <Text style={styles.retryText}>
                  {retryCountdown !== null
                    ? t('error.retryIn', {seconds: retryCountdown})
                    : t('error.retry')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Barra fina de progreso cuando los controles están ocultos. Hay que
          pedirla: por defecto no queda nada en pantalla. */}
          {seekBar &&
            idleProgressBar &&
            !controlsVisible &&
            !pipActive &&
            hasDvr &&
            timelineDuration > 0 && (
              <View pointerEvents="none" style={styles.miniTrack}>
                <Image
                  source={accentGradient ? {uri: accentGradient} : undefined}
                  resizeMode="stretch"
                  fadeDuration={0}
                  style={[
                    styles.miniProgress,
                    !accentGradient && {backgroundColor: accent},
                    {
                      width: `${Math.min(
                        100,
                        (currentTime / timelineDuration) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>
            )}

          {controlsVisible && !pipActive && !locked && placed && (
            <View
              style={[StyleSheet.absoluteFill, fullscreen && controlsInsets]}
              pointerEvents="box-none">
              {/* El overlay de error ya oscurece el fondo. */}
              {!playerError && <View pointerEvents="none" style={styles.dim} />}

              {/* Barra superior */}
              <View
                style={[styles.topBar, previewTile && styles.hidden]}
                pointerEvents={previewTile ? 'none' : 'box-none'}>
                {/* ← cerrar: en inmersivo no hay vertical al que volver, se sale del todo. */}
                {immersive && onClose && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.closePlayer')}
                    hitSlop={12}
                    style={styles.iconButton}
                    onPress={onClose}>
                    <ArrowBackIcon />
                  </Pressable>
                )}
                {/* ⌄ minimizar: siempre que la app ofrezca miniplayer, también
                a pantalla completa. Convive con el ⤢ porque no hacen lo mismo:
                ⤢ devuelve el vídeo a su hueco y ⌄ lo manda a la miniatura para
                seguir navegando, como en YouTube. Solo en directo: una
                película o un episodio llevan el suyo arriba a la derecha. */}
                {onMinimize && isLive && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.minimize')}
                    hitSlop={12}
                    style={styles.iconButton}
                    onPress={() => {
                      onMinimize();
                      touch();
                    }}>
                    <ChevronIcon direction="down" />
                  </Pressable>
                )}
                {/* ⤢ salir: la barra de abajo no se pinta hasta que hay
                    duración que enseñar, y ahí vive el ⤢. Sin esto, un vídeo
                    que tarda en arrancar deja a pantalla completa sin ninguna
                    salida (en iOS no hay botón atrás). Se va solo al cargar. */}
                {fullscreenButton && fullscreen && !immersive && !loaded && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.fullscreenExit')}
                    hitSlop={12}
                    style={styles.iconButton}
                    onPress={() => {
                      setFullscreen(false);
                      touch();
                    }}>
                    <FullscreenIcon exit />
                  </Pressable>
                )}
                <Text style={styles.title} numberOfLines={1}>
                  {title ?? ''}
                </Text>
                <View style={styles.topRight} pointerEvents="box-none">
                  {routeButtons && (
                    <>
                      {/* AirPlay (iOS): abre el selector de rutas del sistema. */}
                      <AirPlayButton
                        style={styles.routeButton}
                        iconColor="#fff"
                        activeIconColor={accent}
                      />
                      {/* Chromecast: el botón nativo se oculta solo si no hay
                          dispositivos; y si la app no trae google-cast, ni eso. */}
                      {CastButton && (
                        <CastButton
                          style={styles.routeButton}
                          tintColor="#fff"
                        />
                      )}
                    </>
                  )}
                  {/* Miniplayer de películas y series: su propio icono junto al
                      de PiP (el ⌄ junto al título queda para los directos). */}
                  {onMinimize && !isLive && (
                    <Pressable
                      hitSlop={12}
                      style={styles.iconButton}
                      onPress={() => {
                        onMinimize();
                        touch();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('a11y.minimize')}>
                      <MiniPlayerIcon />
                    </Pressable>
                  )}
                  {pipButton &&
                    pipSupported &&
                    !playerError &&
                    !casting &&
                    !airplay.active && (
                      <Pressable
                        hitSlop={12}
                        style={styles.iconButton}
                        onPress={() => {
                          videoRef.current?.enterPictureInPicture();
                          touch();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.pip')}>
                        <PipIcon />
                      </Pressable>
                    )}
                </View>
              </View>

              {/* Controles centrales. La fila siempre se renderiza (flex: 1 empuja la
              barra inferior al fondo); solo el botón de play se oculta mientras
              hace buffering, porque el spinner ocupa su sitio. */}
              <View
                style={[styles.centerRow, previewTile && styles.hidden]}
                pointerEvents={previewTile ? 'none' : 'box-none'}>
                {loaded && !playerError && !showNextUp && (
                  <>
                    {showTrackButtons && isLive && (
                      <Pressable
                        hitSlop={12}
                        style={[
                          styles.iconButton,
                          !hasPrevious &&
                            (isLive ||
                              currentTime <= PREVIOUS_RESTART_THRESHOLD_S) &&
                            styles.dimmed,
                        ]}
                        disabled={isLive && !hasPrevious}
                        onPress={goPrevious}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.previous')}>
                        <TrackIcon direction="previous" />
                      </Pressable>
                    )}
                    {skipButtons && (
                      <Pressable
                        hitSlop={12}
                        style={[styles.iconButton, !canSkip && styles.hidden]}
                        disabled={!canSkip}
                        onPress={() => skip('left', false)}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.back', {
                          seconds: SKIP_SECONDS,
                        })}>
                        <SkipIcon direction="back" seconds={SKIP_SECONDS} />
                      </Pressable>
                    )}
                    <Pressable
                      hitSlop={12}
                      style={[styles.playButton, uiBuffering && styles.hidden]}
                      disabled={uiBuffering}
                      onPress={togglePlay}
                      accessibilityRole="button"
                      accessibilityLabel={
                        ended && !casting
                          ? t('a11y.replay')
                          : uiPaused
                          ? t('a11y.play')
                          : t('a11y.pause')
                      }>
                      {ended && !casting ? (
                        <ReplayIcon size={40} />
                      ) : uiPaused ? (
                        <PlayIcon size={36} />
                      ) : (
                        <PauseIcon size={36} />
                      )}
                    </Pressable>
                    {skipButtons && (
                      <Pressable
                        hitSlop={12}
                        style={[styles.iconButton, !canSkip && styles.hidden]}
                        disabled={!canSkip}
                        onPress={() => skip('right', false)}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.forward', {
                          seconds: SKIP_SECONDS,
                        })}>
                        <SkipIcon direction="forward" seconds={SKIP_SECONDS} />
                      </Pressable>
                    )}
                    {showTrackButtons && isLive && (
                      <Pressable
                        hitSlop={12}
                        style={[styles.iconButton, !hasNext && styles.dimmed]}
                        disabled={!hasNext}
                        onPress={() => {
                          onNext?.();
                          touch();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.next')}>
                        <TrackIcon direction="next" />
                      </Pressable>
                    )}
                    {casting && (
                      <Pressable
                        hitSlop={12}
                        style={styles.iconButton}
                        onPress={() => {
                          cast.stop();
                          touch();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('a11y.stopCast')}>
                        <StopIcon size={22} />
                      </Pressable>
                    )}
                  </>
                )}
              </View>

              {/* Barra inferior. Sin `onLoad` no hay duración que enseñar ni
                  nada que arrastrar, así que tampoco se pinta. */}
              <View
                style={[styles.bottomBar, !loaded && styles.hidden]}
                pointerEvents={loaded ? 'box-none' : 'none'}>
                {previewTile && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.preview,
                      {left: previewLeft - PREVIEW_WIDTH / 2},
                    ]}>
                    <View
                      style={[
                        styles.previewFrame,
                        {
                          height: Math.round(
                            previewNaturalHeight * previewScale,
                          ),
                        },
                      ]}>
                      <View
                        style={[
                          styles.previewCrop,
                          {
                            width: previewNaturalWidth,
                            height: previewNaturalHeight,
                            transform: [{scale: previewScale}],
                          },
                        ]}>
                        <Image
                          source={previewTile.image}
                          style={{
                            width: previewTile.sheetWidth / density,
                            height: previewTile.sheetHeight / density,
                            marginLeft: -previewTile.x / density,
                            marginTop: -previewTile.y / density,
                          }}
                        />
                      </View>
                    </View>
                    <Text style={styles.previewTime}>
                      {formatTime(scrubTime)}
                    </Text>
                  </View>
                )}

                {/* Como en Netflix: la barra con lo que queda a su derecha; en
                    directo, la pastilla LIVE delante. */}
                <View style={styles.seekRow} pointerEvents="box-none">
                  {isLive && !playerError && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        atLiveEdge ? t('a11y.atLive') : t('a11y.goLive')
                      }
                      accessibilityState={{disabled: atLiveEdge}}
                      hitSlop={8}
                      disabled={atLiveEdge}
                      onPress={goToLive}
                      style={[
                        styles.liveBadge,
                        atLiveEdge && {backgroundColor: accent},
                      ]}>
                      <View
                        style={[
                          styles.liveDot,
                          atLiveEdge && styles.liveDotActive,
                        ]}
                      />
                      <Text style={styles.liveText}>{t('live.badge')}</Text>
                    </Pressable>
                  )}
                  <View style={styles.seekFlex} pointerEvents="box-none">
                    {seekBar && hasDvr && !playerError ? (
                      <SeekBar
                        accent={accent}
                        gradient={accentGradient}
                        chapters={chapters}
                        currentTime={displayTime}
                        duration={timelineDuration}
                        buffered={isLive ? timelineDuration : buffered}
                        scrubbing={scrubbing}
                        onScrubStart={(time) => {
                          setScrubbing(true);
                          setScrubTime(time);
                        }}
                        onScrub={setScrubTime}
                        onScrubEnd={(time) => {
                          setScrubbing(false);
                          // Soltar cerca de la posición live = volver al directo.
                          if (
                            isLive &&
                            livePosition - time <= LIVE_EDGE_TOLERANCE_S
                          ) {
                            goToLive();
                          } else {
                            seekTo(time);
                            touch();
                          }
                        }}
                      />
                    ) : (
                      <View style={styles.seekBarSpacer} />
                    )}
                  </View>
                  {!playerError && isLive
                    ? !atLiveEdge &&
                      displayLiveOffset >= 0 && (
                        <Text style={styles.time}>
                          -{formatTime(displayLiveOffset)}
                        </Text>
                      )
                    : !playerError && (
                        <Text
                          style={styles.time}
                          accessibilityLabel={t('a11y.position', {
                            position: formatTime(displayTime),
                            duration: formatTime(duration),
                          })}>
                          -{formatTime(Math.max(0, duration - displayTime))}
                        </Text>
                      )}
                  {fullscreenButton && !casting && (
                    <Pressable
                      hitSlop={12}
                      style={styles.iconButton}
                      onPress={() => {
                        setFullscreen((f) => !f);
                        touch();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        fullscreen
                          ? t('a11y.fullscreenExit')
                          : t('a11y.fullscreenEnter')
                      }>
                      <FullscreenIcon exit={fullscreen} size={20} />
                    </Pressable>
                  )}
                </View>

                {/* La fila de acciones de Netflix: icono y texto, repartidos. */}
                {!playerError && (
                  <View style={styles.actionsRow} pointerEvents="box-none">
                    {!isLive && !casting && (
                      <Action
                        icon={<SpeedIcon />}
                        label={t('action.speed', {rate: speedLabel(rate)})}
                        onPress={() => {
                          menuRoot.current = null;
                          setMenu('speed');
                          touch();
                        }}
                      />
                    )}
                    {lockButton && !casting && (
                      <Action
                        icon={<LockIcon size={20} />}
                        label={t('action.lock')}
                        onPress={lock}
                      />
                    )}
                    {!!episodes?.length && (
                      <Action
                        icon={<EpisodesIcon size={20} />}
                        label={t('action.episodes')}
                        onPress={() => {
                          setMenu('episodes');
                          touch();
                        }}
                      />
                    )}
                    {subtitlesButton &&
                      !casting &&
                      (textTracks.length > 0 || audioTracks.length > 1) && (
                        <Action
                          icon={<TracksIcon />}
                          label={t('action.tracks')}
                          onPress={() => {
                            menuRoot.current = null;
                            setMenu('tracks');
                            touch();
                          }}
                        />
                      )}
                    {settingsButton && loaded && (
                      <Action
                        icon={<SettingsIcon size={20} />}
                        label={t('action.settings')}
                        onPress={() => {
                          menuRoot.current = 'main';
                          setMenu('main');
                          touch();
                        }}
                      />
                    )}
                    {!isLive && !!onNext && hasNext && (
                      <Action
                        icon={<TrackIcon direction="next" size={18} />}
                        label={t('action.next')}
                        onPress={() => {
                          onNext();
                          touch();
                        }}
                      />
                    )}
                  </View>
                )}

                {/* Como en Netflix: el dispositivo abajo; al tocarlo se abre el
                controlador ampliado del SDK (volumen, audio/subtítulos del receptor). */}
                {airplay.active && !casting && (
                  <View style={styles.castDeviceRow} pointerEvents="none">
                    <AirPlayGlyph size={18} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.castDeviceRowText} numberOfLines={1}>
                      {airplay.deviceName ?? t('airplay.name')}
                    </Text>
                  </View>
                )}

                {casting && (
                  <Pressable
                    style={({pressed}) => [
                      styles.castDeviceRow,
                      pressed && styles.dimmed,
                    ]}
                    onPress={() => {
                      cast.showRemoteControls();
                      touch();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.castControls')}>
                    <CastIcon
                      size={18}
                      color="rgba(255,255,255,0.8)"
                      connected
                    />
                    <Text style={styles.castDeviceRowText} numberOfLines={1}>
                      {cast.loadError
                        ? t('cast.failed', {error: cast.loadError})
                        : cast.deviceName}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Menú ⚙ (Modal para no quedar recortado por el reproductor) */}
          <Modal
            visible={menu !== null}
            transparent
            animationType="slide"
            statusBarTranslucent
            // En iOS un Modal solo admite vertical si no se dice lo contrario,
            // y abrirlo en horizontal **mata la app**
            // («UIApplicationInvalidInterfaceOrientation»). Aquí se abre
            // justo ahí: el menú ⚙ del reproductor a pantalla completa.
            supportedOrientations={['portrait', 'landscape']}
            onRequestClose={() => setMenu(null)}>
            <Pressable
              style={styles.menuBackdrop}
              onPress={() => setMenu(null)}
            />
            {/* statusBarTranslucent hace el Modal edge-to-edge: respetar la barra de navegación */}
            <View
              style={[
                styles.menu,
                {
                  paddingBottom: 16 + insets.bottom,
                  paddingLeft: insets.left,
                  paddingRight: insets.right,
                },
              ]}>
              {/* La raya de arriba: dice que es una hoja que se cierra
                  bajándola (o tocando fuera), como las del sistema. */}
              <View style={styles.menuHandle} />
              {menu === 'main' && (
                <>
                  <MenuRow
                    label={t('menu.quality')}
                    value={
                      casting
                        ? t('value.castChooses')
                        : qualityOptions.length
                        ? qualityLabel(quality)
                        : t('value.unavailable')
                    }
                    disabled={casting || !qualityOptions.length}
                    onPress={() => setMenu('quality')}
                  />
                  <MenuRow
                    label={t('menu.saver')}
                    value={
                      casting
                        ? t('value.unavailableCasting')
                        : quality !== 'auto'
                        ? `${saverLabel(dataSaver)} · ${t('saver.noEffect')}`
                        : `${saverLabel(dataSaver)} · ${networkCap.network}: ${
                            networkCap.limit
                          }`
                    }
                    disabled={casting}
                    onPress={() => setMenu('saver')}
                  />
                  <MenuRow
                    label={t('menu.subtitles')}
                    value={
                      casting
                        ? t('value.unavailableCasting')
                        : textTracks.length
                        ? subtitleLabel()
                        : t('value.unavailable')
                    }
                    disabled={casting || !textTracks.length}
                    onPress={() => setMenu('subtitles')}
                  />
                  <MenuRow
                    label={t('menu.audio')}
                    value={
                      casting
                        ? t('value.unavailableCasting')
                        : audioTracks.length > 1
                        ? audioLabel()
                        : t('value.unavailable')
                    }
                    disabled={casting || audioTracks.length < 2}
                    onPress={() => setMenu('audio')}
                  />
                  <MenuRow
                    label={t('menu.speed')}
                    value={
                      casting
                        ? t('value.unavailableCasting')
                        : isLive
                        ? t('value.unavailableLive')
                        : speedLabel(rate)
                    }
                    disabled={casting || isLive}
                    onPress={() => setMenu('speed')}
                  />
                </>
              )}

              {menu === 'episodes' && (
                <>
                  <MenuHeader
                    title={t('menu.episodes')}
                    onBack={() => setMenu(null)}
                  />
                  <ScrollView style={styles.episodeList}>
                    {episodes?.map((episode) => (
                      <EpisodeRow
                        key={episode.id}
                        accent={accent}
                        episode={episode}
                        current={episode.id === currentEpisodeId}
                        onPress={() => {
                          setMenu(null);
                          if (episode.id !== currentEpisodeId) {
                            onSelectEpisode?.(episode.id);
                          }
                          touch();
                        }}
                      />
                    ))}
                  </ScrollView>
                </>
              )}

              {menu === 'quality' && (
                <>
                  <MenuHeader
                    title={t('menu.quality')}
                    onBack={() => setMenu(menuRoot.current)}
                  />
                  <Text style={styles.menuNote}>
                    {networkCap.network}: {networkCap.limit}
                    {bandwidth > 0
                      ? t('saver.bandwidth', {rate: mbps(bandwidth)})
                      : ''}
                  </Text>
                  {(['auto', ...qualityOptions] as Array<'auto' | number>).map(
                    (q) => (
                      <MenuOption
                        accent={accent}
                        key={q}
                        label={qualityLabel(q)}
                        selected={q === quality}
                        onPress={() => {
                          setQuality(q);
                          updatePrefs({quality: q});
                          setMenu(null);
                          touch();
                        }}
                      />
                    ),
                  )}
                </>
              )}

              {menu === 'saver' && (
                <>
                  <MenuHeader
                    title={t('menu.saver')}
                    onBack={() => setMenu(menuRoot.current)}
                  />
                  <Text style={styles.menuNote}>{t('menu.saverHint')}</Text>
                  {(['auto', 'on', 'off'] as DataSaver[]).map((mode) => (
                    <MenuOption
                      accent={accent}
                      key={mode}
                      label={saverLabel(mode)}
                      selected={mode === dataSaver}
                      onPress={() => {
                        onDataSaverChange?.(mode);
                        setMenu(null);
                        touch();
                      }}
                    />
                  ))}
                </>
              )}

              {menu === 'subtitles' && (
                <>
                  <MenuHeader
                    title={t('menu.subtitles')}
                    onBack={() => setMenu(menuRoot.current)}
                  />
                  <MenuOption
                    accent={accent}
                    label={t('subtitles.off')}
                    selected={subtitle === 'off'}
                    onPress={() => {
                      setSubtitle('off');
                      updatePrefs({subtitleLanguage: 'off'});
                      setMenu(null);
                      touch();
                    }}
                  />
                  {textTracks.map((track) => (
                    <MenuOption
                      accent={accent}
                      key={track.index}
                      label={trackLabel(track)}
                      selected={track.index === subtitle}
                      onPress={() => {
                        setSubtitle(track.index);
                        updatePrefs({
                          subtitleLanguage: track.language ?? 'off',
                        });
                        setMenu(null);
                        touch();
                      }}
                    />
                  ))}
                </>
              )}

              {menu === 'audio' && (
                <>
                  <MenuHeader
                    title={t('menu.audio')}
                    onBack={() => setMenu(menuRoot.current)}
                  />
                  <MenuOption
                    accent={accent}
                    label={t('audio.default')}
                    selected={audioTrack === 'auto'}
                    onPress={() => {
                      setAudioTrack('auto');
                      updatePrefs({audioLanguage: undefined});
                      setMenu(null);
                      touch();
                    }}
                  />
                  {audioTracks.map((track) => (
                    <MenuOption
                      accent={accent}
                      key={track.index}
                      label={trackLabel(track)}
                      selected={track.index === audioTrack}
                      onPress={() => {
                        setAudioTrack(track.index);
                        updatePrefs({audioLanguage: track.language});
                        setMenu(null);
                        touch();
                      }}
                    />
                  ))}
                </>
              )}

              {menu === 'tracks' && (
                <>
                  <MenuHeader
                    title={t('menu.tracks')}
                    onBack={() => setMenu(null)}
                  />
                  {/* Dos columnas, como la hoja de Netflix. */}
                  <View style={styles.tracksColumns}>
                    <ScrollView style={styles.tracksColumn}>
                      <Text style={styles.tracksTitle}>{t('menu.audio')}</Text>
                      <MenuOption
                        accent={accent}
                        label={t('audio.default')}
                        selected={audioTrack === 'auto'}
                        onPress={() => {
                          setAudioTrack('auto');
                          updatePrefs({audioLanguage: undefined});
                          setMenu(null);
                          touch();
                        }}
                      />
                      {audioTracks.map((track) => (
                        <MenuOption
                          accent={accent}
                          key={track.index}
                          label={trackLabel(track)}
                          selected={track.index === audioTrack}
                          onPress={() => {
                            setAudioTrack(track.index);
                            updatePrefs({audioLanguage: track.language});
                            setMenu(null);
                            touch();
                          }}
                        />
                      ))}
                    </ScrollView>
                    <ScrollView style={styles.tracksColumn}>
                      <Text style={styles.tracksTitle}>
                        {t('menu.subtitles')}
                      </Text>
                      <MenuOption
                        accent={accent}
                        label={t('subtitles.off')}
                        selected={subtitle === 'off'}
                        onPress={() => {
                          setSubtitle('off');
                          updatePrefs({subtitleLanguage: 'off'});
                          setMenu(null);
                          touch();
                        }}
                      />
                      {textTracks.map((track) => (
                        <MenuOption
                          accent={accent}
                          key={track.index}
                          label={trackLabel(track)}
                          selected={track.index === subtitle}
                          onPress={() => {
                            setSubtitle(track.index);
                            updatePrefs({
                              subtitleLanguage: track.language ?? 'off',
                            });
                            setMenu(null);
                            touch();
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {menu === 'speed' && (
                <>
                  <MenuHeader
                    title={t('menu.speed')}
                    onBack={() => setMenu(menuRoot.current)}
                  />
                  {SPEEDS.map((r) => (
                    <MenuOption
                      accent={accent}
                      key={r}
                      label={speedLabel(r)}
                      selected={r === rate}
                      onPress={() => {
                        setRate(r);
                        updatePrefs({speed: r});
                        setMenu(null);
                        touch();
                      }}
                    />
                  ))}
                </>
              )}
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

/** Una acción de la fila de abajo: icono y texto en línea, como en Netflix. */
function Action({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({pressed}) => [styles.action, pressed && styles.dimmed]}
      onPress={onPress}>
      {icon}
      <Text style={styles.actionText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function MenuRow({
  label,
  value,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[styles.menuItem, disabled && styles.dimmed]}
      onPress={onPress}>
      <Text style={styles.menuItemText} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.menuItemValue} numberOfLines={1}>
        {value} ›
      </Text>
    </Pressable>
  );
}

/** Fila de la hoja de episodios: título, línea de detalle y lo ya visto. */
/**
 * Una fila del listado de episodios, al estilo de Netflix: la miniatura con lo
 * ya visto en su borde inferior, el título, los datos y la sinopsis corta. El
 * que suena lleva «▶» sobre la imagen y el título en el color de acento.
 */
function EpisodeRow({
  episode,
  current,
  accent,
  onPress,
}: {
  episode: Episode;
  current: boolean;
  accent: string;
  onPress: () => void;
}) {
  const progress = Math.min(1, Math.max(0, episode.progress ?? 0));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: current}}
      style={({pressed}) => [
        styles.episodeRow,
        current && styles.episodeRowCurrent,
        pressed && styles.dimmed,
      ]}
      onPress={onPress}>
      <View style={styles.episodeThumb}>
        {episode.image ? (
          <Image
            source={{uri: episode.image}}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : episode.number !== undefined && !current ? (
          <Text style={styles.episodeNumber}>{episode.number}</Text>
        ) : null}
        {current ? (
          <View style={styles.episodeNow}>
            <PlayIcon size={22} />
          </View>
        ) : null}
        {progress > 0 ? (
          <View style={styles.episodeTrack}>
            <View
              style={[
                styles.episodeFill,
                {backgroundColor: accent, width: `${progress * 100}%`},
              ]}
            />
          </View>
        ) : null}
      </View>
      <View style={styles.episodeText}>
        <Text
          style={[styles.episodeTitle, current && {color: accent}]}
          numberOfLines={1}>
          {episode.title}
        </Text>
        {episode.subtitle ? (
          <Text style={styles.episodeSubtitle} numberOfLines={1}>
            {episode.subtitle}
          </Text>
        ) : null}
        {episode.description ? (
          <Text style={styles.episodeDescription} numberOfLines={2}>
            {episode.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function MenuHeader({title, onBack}: {title: string; onBack: () => void}) {
  return (
    <Pressable style={styles.menuHeader} onPress={onBack} hitSlop={8}>
      <Text style={styles.menuBack}>‹</Text>
      <Text style={styles.menuTitle}>{title}</Text>
    </Pressable>
  );
}

function MenuOption({
  label,
  selected,
  accent,
  onPress,
}: {
  label: string;
  selected: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text
        style={[
          styles.menuItemText,
          selected && styles.menuItemActive,
          selected && {color: accent},
        ]}>
        {label}
      </Text>
      {selected && <Text style={[styles.menuCheck, {color: accent}]}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  fullscreen: {
    // Ocupa el contenedor raíz (área útil, sin barra de navegación).
    ...FILL,
    zIndex: 100,
    elevation: 100,
  },
  dim: {
    ...FILL,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  center: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
    // En medio, como en Netflix.
    textAlign: 'center',
  },
  castDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  castDeviceRowText: {color: 'rgba(255,255,255,0.8)', fontSize: 12},
  centerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    // Con 6 botones (transmitiendo) el hueco fijo no cabe en pantallas estrechas.
    gap: 20,
  },
  iconButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    opacity: 0,
  },
  dimmed: {
    opacity: 0.4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  liveDotActive: {
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  seekBarSpacer: {
    height: 12,
  },
  offlineBanner: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  offlineText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  boostBadge: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  boostText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  dimVeil: {...FILL, backgroundColor: '#000'},
  hud: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    minWidth: 140,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  hudLabel: {color: '#fff', fontSize: 13, fontWeight: '700'},
  hudTrack: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  hudFill: {height: '100%'},
  skipIntro: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(20,20,22,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
    // Por encima del velo de los controles: si no, con ellos a la vista se
    // veía apagado, como deshabilitado.
    zIndex: 10,
  },
  skipIntroPressed: {backgroundColor: 'rgba(255,255,255,0.2)'},
  skipIntroText: {color: '#fff', fontSize: 14, fontWeight: '700'},
  nextUpWrap: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'flex-end',
    // Velo sobre el vídeo: los créditos suelen ser claros y el texto se perdía.
    backgroundColor: 'rgba(0,0,0,0.6)',
    // Por encima del velo de los controles (ver `skipIntro`).
    zIndex: 10,
  },
  nextUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    maxWidth: '82%',
    paddingHorizontal: 16,
  },
  nextUpThumb: {
    width: 112,
    aspectRatio: 16 / 9,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#2a2a2e',
  },
  nextUpThumbPlay: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpText: {flexShrink: 1, gap: 2},
  nextUpLabel: {color: 'rgba(255,255,255,0.72)', fontSize: 13},
  nextUpTitle: {color: '#fff', fontSize: 16, fontWeight: '800'},
  nextUpSubtitle: {color: '#fff', fontSize: 14},
  nextUpBadge: {fontWeight: '800'},
  nextUpClose: {padding: 6, marginLeft: 8},
  errorOverlay: {
    ...FILL,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorDetail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {color: '#000', fontWeight: '700'},
  bottomBar: {
    paddingHorizontal: BOTTOM_BAR_PADDING,
  },
  preview: {
    position: 'absolute',
    // Encima de la barra y de la fila de acciones.
    bottom: 84,
    alignItems: 'center',
    gap: 4,
  },
  previewFrame: {
    width: PREVIEW_WIDTH,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  previewCrop: {transformOrigin: 'top left', overflow: 'hidden'},
  previewTime: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
  },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seekFlex: {flex: 1},
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  actionText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  tracksColumns: {flexDirection: 'row', gap: 16},
  tracksColumn: {flex: 1, maxHeight: 300},
  tracksTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Los botones de AirPlay y de cast son vistas nativas: necesitan tamaño explícito.
  routeButton: {width: 26, height: 26},
  castOverlay: {
    ...FILL,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  castTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  castDevice: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  time: {
    color: '#fff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  miniTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  miniProgress: {
    height: '100%',
    backgroundColor: '#ff0000',
  },
  skipHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skipHintLeft: {
    left: 0,
    borderTopRightRadius: 200,
    borderBottomRightRadius: 200,
  },
  skipHintRight: {
    right: 0,
    borderTopLeftRadius: 200,
    borderBottomLeftRadius: 200,
  },
  skipHintArrows: {color: '#fff', fontSize: 22},
  skipHintText: {color: '#fff', fontSize: 13, marginTop: 4},
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menu: {
    backgroundColor: '#212121',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 6,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  menuBack: {color: '#fff', fontSize: 26, lineHeight: 28},
  menuTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuNote: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  menuItemText: {color: '#fff', fontSize: 15},
  // Con el candado o los episodios, la fila de abajo junta varios botones a la derecha.
  unlockPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  unlockText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  // La lista de episodios puede ser larga: en horizontal la hoja no puede crecer más.
  // Más alto que el resto de menús: aquí se elige mirando las imágenes.
  episodeList: {maxHeight: 340},
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  episodeRowCurrent: {backgroundColor: 'rgba(255,255,255,0.06)'},
  episodeThumb: {
    width: 136,
    aspectRatio: 16 / 9,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#2a2a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeNow: {
    ...FILL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  episodeTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  episodeFill: {height: '100%'},
  episodeNumber: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 26,
    fontWeight: '800',
  },
  episodeText: {flex: 1, gap: 3},
  episodeTitle: {color: '#fff', fontSize: 15, fontWeight: '700'},
  episodeSubtitle: {color: '#aaa', fontSize: 12},
  episodeDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 17,
  },
  menuItemActive: {fontWeight: '700'},
  menuCheck: {color: '#fff', fontSize: 16},
});
