import {useEffect, useState} from 'react';
import {fetchNetwork, onNetworkChange, type NetworkState} from './optional';
import {t} from './strings';
import type {DataSaver} from './types';

// El ahorro de datos ('auto' solo fuera del Wi-Fi, 'on' siempre, 'off' nunca)
// no sustituye al ABR del reproductor —que ya baja la calidad cuando el ancho
// de banda real no da—, sino que limita cuánto se gasta.
export type {DataSaver};

/** Topes de bitrate en bits/s. 0 = sin tope (ABR libre). */
const UNLIMITED = 0;
const CAP_HD = 2_500_000; // ~720p
const CAP_SD = 800_000; // ~360p
const CAP_LOW = 400_000; // ~240p

/**
 * Tope mientras el vídeo va encogido en el miniplayer.
 *
 * Ahí la imagen ocupa una miniatura (unos 128x72 dp), así que decodificar la
 * calidad grande es gastar CPU en píxeles que nadie va a ver. Y se gasta justo
 * cuando más falta hace: con el miniplayer puesto se está navegando por la
 * app, y el decodificador le quita tiempo al hilo que dibuja las pantallas.
 */
export const MINI_CAP = CAP_LOW;

export type NetworkCap = {
  /** Valor para la prop `maxBitRate` de <Video>; 0 = sin tope. */
  bitrate: number;
  /** Red detectada, corta para caber en el menú: «Wi-Fi», «5G», «Cable»… */
  network: string;
  /** Efecto del tope, para el menú: «sin límite», «hasta 2,5 Mb/s». */
  limit: string;
};

/** «2,5 Mb/s» (una cifra decimal, formato español). */
export const mbps = (bits: number) =>
  `${(bits / 1_000_000).toLocaleString('es-ES', {
    maximumFractionDigits: 1,
  })} Mb/s`;

function networkName(state: NetworkState | null) {
  if (!state) {
    return t('network.unknown');
  }
  switch (state.type) {
    case 'wifi':
      return t('network.wifi');
    case 'ethernet':
      return t('network.ethernet');
    case 'cellular': {
      const gen = state.details?.cellularGeneration;
      return gen ? gen.toUpperCase() : t('network.cellular');
    }
    default:
      return t('network.unknown');
  }
}

/** Tope que toca según el modo y la red. */
function capFor(mode: DataSaver, state: NetworkState | null) {
  if (mode === 'off') {
    return UNLIMITED;
  }
  if (mode === 'on') {
    return CAP_SD;
  }
  if (!state || state.type === 'wifi' || state.type === 'ethernet') {
    return UNLIMITED;
  }
  if (state.type === 'cellular') {
    switch (state.details?.cellularGeneration) {
      case '2g':
        return CAP_LOW;
      case '3g':
        return CAP_SD;
      default:
        // 4g, 5g o desconocida: se gasta menos que en Wi-Fi, pero sin ahogar el vídeo.
        return CAP_HD;
    }
  }
  // Tipos raros (bluetooth, wimax, vpn…): si el sistema dice que la conexión
  // es cara, se trata como móvil.
  return state.details &&
    'isConnectionExpensive' in state.details &&
    state.details.isConnectionExpensive
    ? CAP_HD
    : UNLIMITED;
}

/**
 * Traduce el tipo de red a un tope de bitrate. El reproductor sigue eligiendo
 * calidad por su cuenta (ABR) por debajo de ese tope.
 */
export default function useNetworkCap(mode: DataSaver): NetworkCap {
  const [state, setState] = useState<NetworkState | null>(null);

  useEffect(() => {
    fetchNetwork().then(setState);
    return onNetworkChange(setState);
  }, []);

  const bitrate = capFor(mode, state);
  return {
    bitrate,
    network: networkName(state),
    limit:
      bitrate === UNLIMITED
        ? t('network.noLimit')
        : t('network.limit', {rate: mbps(bitrate)}),
  };
}
