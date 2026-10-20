/**
 * Lo que los controles necesitan **de fuera**: preferencias que alguien guarda
 * por nosotros y eventos que alguien apunta por nosotros.
 *
 * La librería no escribe en disco ni manda métricas a ningún sitio: eso es de
 * la app. Aquí solo está la forma de los datos, para que las dos partes hablen
 * del mismo objeto.
 */

/** Ahorro de datos: 'auto' solo fuera del Wi-Fi, 'on' siempre, 'off' nunca. */
export type DataSaver = 'auto' | 'on' | 'off';

/**
 * Lo que el usuario elige y espera encontrarse igual la próxima vez. El
 * reproductor lo recibe por props y avisa de cada cambio con `onPrefsChange`;
 * guardarlo (o no) es cosa de quien lo use.
 */
export type Prefs = {
  /**
   * Subtítulos elegidos, por **idioma**, o 'off'. Se guarda el idioma y no el
   * índice porque los índices cambian de un stream a otro.
   */
  subtitleLanguage?: string | 'off';
  audioLanguage?: string;
  quality?: 'auto' | number;
  speed?: number;
  dataSaver?: DataSaver;
};

/** Cada cuánto conviene guardar la posición: ni en cada fotograma ni al final. */
export const SAVE_EVERY_MS = 5000;

/**
 * Lo que va pasando durante la reproducción, para quien quiera medir calidad de
 * experiencia (arranque, rebuffers, errores, bitrate).
 */
export type PlaybackEvent =
  /** Se pide una fuente nueva: empieza a contar el arranque. */
  | {type: 'start'; title: string}
  /** Primer fotograma en pantalla. */
  | {type: 'ready'; live: boolean}
  | {type: 'buffer'; buffering: boolean}
  | {type: 'progress'; seconds: number}
  | {type: 'seek'}
  | {type: 'error'; message: string}
  | {type: 'bitrate'; bps: number}
  | {type: 'end'};
