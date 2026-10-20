/**
 * Las librerías que los controles usan **si están instaladas**.
 *
 * `react-native-video` no pedía nada hasta ahora, y los controles no van a
 * cambiar eso: las cinco que necesitan (iconos, notch, giro, Chromecast y red)
 * se declaran como `peerDependencies` opcionales y se cargan aquí con un
 * `require` protegido. Si falta alguna, la función que dependía de ella se
 * apaga sola y el reproductor sigue funcionando:
 *
 * | Sin… | Qué pasa |
 * |---|---|
 * | `react-native-svg` | Los iconos se dibujan con caracteres (▶, ⏸) en vez de vectores |
 * | `react-native-safe-area-context` | Los controles no esquivan el notch (márgenes a 0) |
 * | `react-native-orientation-locker` | Pantalla completa no gira sola; manda la orientación del sistema |
 * | `react-native-google-cast` | No hay botón de enviar a la tele |
 * | `@react-native-community/netinfo` | Se da por buena la red: ni aviso de «sin conexión» ni ahorro de datos |
 *
 * El nombre de cada módulo va **escrito a mano** dentro de un `try`: así Metro
 * lo ve al empaquetar y lo marca como dependencia opcional
 * (`allowOptionalDependencies`, que viene activado de serie). Con un
 * `require(variable)` no compilaría, y con un `import` normal fallaría el
 * bundle de quien no tenga el paquete.
 *
 * El `require` va una vez, al cargar el módulo, y lo que se elige con él no
 * cambia a mitad de ejecución: por eso se puede elegir aquí qué hook se usa sin
 * romper el orden de los hooks de React.
 *
 * Estas librerías no están instaladas al compilar la nuestra, así que no hay
 * tipos suyos que importar: lo que sale de aquí es `any` a propósito, y se usa
 * solo en los puntos que documenta la tabla.
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */

// Nada de envolver el `require` en una función auxiliar: Metro solo marca la
// dependencia como opcional si la llamada está **dentro** del try.

export type Insets = {top: number; bottom: number; left: number; right: number};
const NO_INSETS: Insets = {top: 0, bottom: 0, left: 0, right: 0};

type SvgModule = {
  default: any;
  Path: any;
  Defs: any;
  LinearGradient: any;
  Stop: any;
  Rect: any;
};

let svgModule: SvgModule | null = null;
try {
  svgModule = require('react-native-svg');
} catch {
  svgModule = null;
}
export const svg = svgModule;
export const hasSvg = !!svg;

type SafeAreaModule = {useSafeAreaInsets: () => Insets};
let safeArea: SafeAreaModule | null = null;
try {
  safeArea = require('react-native-safe-area-context');
} catch {
  safeArea = null;
}

/** Márgenes seguros, o ceros si la app no trae safe-area-context. */
export const useInsets: () => Insets =
  safeArea?.useSafeAreaInsets ?? (() => NO_INSETS);

type OrientationModule = {
  lockToLandscape: () => void;
  lockToPortrait: () => void;
};
let orientation: OrientationModule | null = null;
try {
  // El API de orientation-locker cuelga del export por defecto; con `require`
  // lo que llega es el módulo entero, así que hay que desenvolverlo.
  const mod = require('react-native-orientation-locker');
  orientation = mod?.default ?? mod;
} catch {
  orientation = null;
}

export const lockToLandscape = () => orientation?.lockToLandscape();
export const lockToPortrait = () => orientation?.lockToPortrait();

let cast: any = null;
try {
  cast = require('react-native-google-cast');
} catch {
  cast = null;
}
export const googleCast = cast;
/** El botón nativo de Chromecast, o `null` si la app no lo tiene. */
export const CastButton: any = googleCast?.CastButton ?? null;

export type NetworkState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type?: string;
  details?: {cellularGeneration?: string | null} | null;
};

type NetInfoModule = {
  fetch: () => Promise<NetworkState>;
  addEventListener: (_listener: (_state: NetworkState) => void) => () => void;
};
let netInfo: NetInfoModule | null = null;
try {
  // Igual que orientation-locker: `fetch` y `addEventListener` están en el
  // export por defecto.
  const mod = require('@react-native-community/netinfo');
  netInfo = mod?.default ?? mod;
} catch {
  netInfo = null;
}

export const hasNetInfo = !!netInfo;

/** Red actual. Sin netinfo se contesta «conectado y no sé de qué tipo». */
export const ONLINE_UNKNOWN: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'unknown',
  details: null,
};

export const fetchNetwork = (): Promise<NetworkState> =>
  netInfo ? netInfo.fetch() : Promise.resolve(ONLINE_UNKNOWN);

/** Devuelve la función para dejar de escuchar, como la de netinfo. */
export function onNetworkChange(listener: (state: NetworkState) => void) {
  if (!netInfo) {
    return () => {};
  }
  return netInfo.addEventListener(listener);
}
