/**
 * Textos de los controles.
 *
 * La librería trae los suyos —español e inglés— para que `<VideoControls>`
 * funcione sin montar un sistema de traducción: se elige idioma con
 * `setControlsLanguage` y se puede cambiar cualquier texto suelto con
 * `setControlsStrings`. Los parámetros van entre llaves: `{seconds}`.
 *
 * No se llama a `t()` al cargar un módulo: el idioma cambia en caliente y ese
 * texto se quedaría congelado. Para repintar, `useControlsLanguage()`.
 */
import {useSyncExternalStore} from 'react';

const es = {
  'a11y.atLive': 'Estás en directo',
  'a11y.back': 'Retroceder {seconds} segundos',
  'a11y.castControls': 'Controles del dispositivo',
  'a11y.closePlayer': 'Cerrar el reproductor',
  'a11y.episodes': 'Episodios',
  'a11y.forward': 'Avanzar {seconds} segundos',
  'a11y.fullscreenEnter': 'Pantalla completa',
  'a11y.fullscreenExit': 'Salir de pantalla completa',
  'a11y.goLive': 'Volver al directo',
  'a11y.lock': 'Bloquear la pantalla',
  'a11y.locked': 'Pantalla bloqueada. Toca para desbloquear',
  'a11y.minimize': 'Minimizar el reproductor',
  'a11y.next': 'Vídeo siguiente',
  'a11y.pause': 'Pausar',
  'a11y.pip': 'Ver en ventana flotante',
  'a11y.play': 'Reproducir',
  'a11y.position': '{position} de {duration}',
  'a11y.previous': 'Vídeo anterior',
  'a11y.replay': 'Volver a reproducir',
  'a11y.retry': 'Reintentar la reproducción',
  'a11y.seekBar': 'Barra de reproducción',
  'a11y.seekBarHint': 'Desliza arriba o abajo para avanzar o retroceder',
  'a11y.settings': 'Ajustes',
  'a11y.stopCast': 'Dejar de transmitir',
  'a11y.subtitlesOff': 'Activar subtítulos',
  'a11y.subtitlesOn': 'Desactivar subtítulos',
  'a11y.surface': 'Vídeo. Toca para mostrar los controles',
  'a11y.unlock': 'Desbloquear la pantalla',
  'airplay.name': 'AirPlay',
  'airplay.playingOn': 'Reproduciendo en {device}',
  'audio.default': 'Predeterminado',
  'cast.failed': 'No se pudo transmitir: {error}',
  'cast.playingOn': 'Transmitiendo a {device}',
  'chapter.skipIntro': 'Saltar intro',
  'error.offlineDetail': 'Se reintentará automáticamente al recuperar la red',
  'error.offlineTitle': 'Sin conexión a internet',
  'error.retry': 'Reintentar',
  'error.retryIn': 'Reintentar ({seconds} s)',
  'error.title': 'No se pudo reproducir el vídeo',
  'gesture.brightness': 'Brillo',
  'gesture.fill': 'Rellenar',
  'gesture.fit': 'Ajustar',
  'gesture.volume': 'Volumen',
  'length.hours': '{hours} h {minutes} min',
  'length.minutes': '{count} min',
  'live.badge': 'EN VIVO',
  'lock.unlock': 'Desbloquear',
  'menu.audio': 'Audio',
  'menu.episodes': 'Episodios',
  'menu.quality': 'Calidad',
  'menu.saver': 'Ahorro de datos',
  'menu.saverHint':
    'Limita el bitrate cuando no estás en Wi-Fi. La calidad sigue ajustándose sola por debajo de ese tope.',
  'menu.speed': 'Velocidad de reproducción',
  'menu.subtitles': 'Subtítulos',
  'menu.tracks': 'Audio y subtítulos',
  'action.episodes': 'Episodios',
  'action.lock': 'Bloquear',
  'action.next': 'Siguiente ep.',
  'action.settings': 'Ajustes',
  'action.speed': 'Velocidad ({rate})',
  'action.tracks': 'Audio y subtítulos',
  'network.cellular': 'Datos móviles',
  'network.ethernet': 'Cable',
  'network.limit': 'hasta {rate}',
  'network.noLimit': 'sin límite',
  'network.unknown': 'Red desconocida',
  'network.wifi': 'Wi-Fi',
  'next.cancel': 'Cancelar',
  'next.countdown': 'Siguiente en {seconds}',
  'next.playNow': 'Reproducir ya',
  'offline.banner': 'Sin conexión · reconectando…',
  'quality.auto': 'Auto',
  'quality.autoAt': 'Auto ({height}p)',
  'quality.height': '{height}p',
  'saver.auto': 'Automático',
  'saver.bandwidth': ' · red estimada en {rate}',
  'saver.noEffect': 'sin efecto: calidad fija',
  'saver.off': 'Desactivado',
  'saver.on': 'Siempre activado',
  'speed.normal': 'Normal',
  'speed.rate': '{rate}x',
  'subtitles.off': 'Desactivados',
  'time.days': 'hace {count} d',
  'time.hours': 'hace {count} h',
  'time.minutes': 'hace {count} min',
  'time.now': 'ahora',
  'track.fallback': 'Pista {number}',
  'value.castChooses': 'La elige el Chromecast',
  'value.unavailable': 'No disponible',
  'value.unavailableCasting': 'No disponible al transmitir',
  'value.unavailableLive': 'No disponible en directo',
};

const en: Record<keyof typeof es, string> = {
  'a11y.atLive': 'You are watching live',
  'a11y.back': 'Go back {seconds} seconds',
  'a11y.castControls': 'Device controls',
  'a11y.closePlayer': 'Close the player',
  'a11y.episodes': 'Episodes',
  'a11y.forward': 'Go forward {seconds} seconds',
  'a11y.fullscreenEnter': 'Full screen',
  'a11y.fullscreenExit': 'Exit full screen',
  'a11y.goLive': 'Back to live',
  'a11y.lock': 'Lock the screen',
  'a11y.locked': 'Screen locked. Tap to unlock',
  'a11y.minimize': 'Minimise the player',
  'a11y.next': 'Next video',
  'a11y.pause': 'Pause',
  'a11y.pip': 'Play in a floating window',
  'a11y.play': 'Play',
  'a11y.position': '{position} of {duration}',
  'a11y.previous': 'Previous video',
  'a11y.replay': 'Play again',
  'a11y.retry': 'Retry playback',
  'a11y.seekBar': 'Playback bar',
  'a11y.seekBarHint': 'Swipe up or down to seek',
  'a11y.settings': 'Settings',
  'a11y.stopCast': 'Stop casting',
  'a11y.subtitlesOff': 'Turn subtitles on',
  'a11y.subtitlesOn': 'Turn subtitles off',
  'a11y.surface': 'Video. Tap to show the controls',
  'a11y.unlock': 'Unlock the screen',
  'airplay.name': 'AirPlay',
  'airplay.playingOn': 'Playing on {device}',
  'audio.default': 'Default',
  'cast.failed': 'Could not cast: {error}',
  'cast.playingOn': 'Casting to {device}',
  'chapter.skipIntro': 'Skip intro',
  'error.offlineDetail': 'It will retry automatically once the network is back',
  'error.offlineTitle': 'No internet connection',
  'error.retry': 'Retry',
  'error.retryIn': 'Retry ({seconds} s)',
  'error.title': 'This video could not be played',
  'gesture.brightness': 'Brightness',
  'gesture.fill': 'Fill',
  'gesture.fit': 'Fit',
  'gesture.volume': 'Volume',
  'length.hours': '{hours} h {minutes} min',
  'length.minutes': '{count} min',
  'live.badge': 'LIVE',
  'lock.unlock': 'Unlock',
  'menu.audio': 'Audio',
  'menu.episodes': 'Episodes',
  'menu.quality': 'Quality',
  'menu.saver': 'Data saver',
  'menu.saverHint':
    'Caps the bitrate when you are off Wi-Fi. Quality still adapts on its own below that cap.',
  'menu.speed': 'Playback speed',
  'menu.subtitles': 'Subtitles',
  'menu.tracks': 'Audio & Subtitles',
  'action.episodes': 'Episodes',
  'action.lock': 'Lock',
  'action.next': 'Next Ep.',
  'action.settings': 'Settings',
  'action.speed': 'Speed ({rate})',
  'action.tracks': 'Audio & Subtitles',
  'network.cellular': 'Mobile data',
  'network.ethernet': 'Ethernet',
  'network.limit': 'up to {rate}',
  'network.noLimit': 'no cap',
  'network.unknown': 'Unknown network',
  'network.wifi': 'Wi-Fi',
  'next.cancel': 'Cancel',
  'next.countdown': 'Next in {seconds}',
  'next.playNow': 'Play now',
  'offline.banner': 'Offline · reconnecting…',
  'quality.auto': 'Auto',
  'quality.autoAt': 'Auto ({height}p)',
  'quality.height': '{height}p',
  'saver.auto': 'Automatic',
  'saver.bandwidth': ' · network estimated at {rate}',
  'saver.noEffect': 'no effect: quality is fixed',
  'saver.off': 'Off',
  'saver.on': 'Always on',
  'speed.normal': 'Normal',
  'speed.rate': '{rate}x',
  'subtitles.off': 'Off',
  'time.days': '{count} d ago',
  'time.hours': '{count} h ago',
  'time.minutes': '{count} min ago',
  'time.now': 'now',
  'track.fallback': 'Track {number}',
  'value.castChooses': 'The Chromecast picks it',
  'value.unavailable': 'Not available',
  'value.unavailableCasting': 'Not available while casting',
  'value.unavailableLive': 'Not available on live',
};

export type ControlsTextKey = keyof typeof es;
export type ControlsLanguage = 'es' | 'en';

const DICTS: Record<ControlsLanguage, Record<ControlsTextKey, string>> = {
  es,
  en,
};

/** Idioma del dispositivo, si lo sabemos; si no, español. */
function deviceLanguage(): ControlsLanguage {
  try {
    const locale =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : '';
    return locale.toLowerCase().startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

let language: ControlsLanguage = deviceLanguage();
let overrides: Partial<Record<ControlsTextKey, string>> = {};
const listeners = new Set<() => void>();

const changed = () => listeners.forEach((listener) => listener());

/** Cambia el idioma de los controles y repinta lo que esté en pantalla. */
export function setControlsLanguage(next: ControlsLanguage) {
  language = next;
  changed();
}

export const getControlsLanguage = () => language;

/**
 * Cambia textos sueltos sin tocar el resto, por ejemplo para adaptarlos al tono
 * de la app o para añadir un idioma que la librería no trae. `{}` los restaura.
 */
export function setControlsStrings(
  next: Partial<Record<ControlsTextKey, string>>,
) {
  overrides = next;
  changed();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Repinta el componente cuando cambia el idioma o los textos. */
export function useControlsLanguage(): ControlsLanguage {
  return useSyncExternalStore(
    subscribe,
    getControlsLanguage,
    getControlsLanguage,
  );
}

/** Texto traducido, con `{parámetros}` sustituidos. */
export function t(
  key: ControlsTextKey,
  params?: Record<string, string | number>,
): string {
  const template = overrides[key] ?? DICTS[language][key] ?? es[key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(params[name] ?? ''),
  );
}

export default t;
