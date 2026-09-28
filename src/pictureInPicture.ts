import {Platform} from 'react-native';

import NativeVideoManager from './specs/NativeVideoManager';

/**
 * ¿Puede este dispositivo hacer Picture in Picture?
 *
 * Conviene preguntarlo antes de ofrecer el botón: el simulador de iOS no lo
 * soporta (`AVPictureInPictureController.isPictureInPictureSupported()` es
 * `false`), y en Android hace falta Android 8 y que el dispositivo declare
 * `FEATURE_PICTURE_IN_PICTURE`, que algunos emuladores y televisores no traen.
 * Sin soporte, entrar en PiP no falla: simplemente no hace nada.
 */
export async function isPictureInPictureSupported(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }
  try {
    return await NativeVideoManager.isPictureInPictureSupported();
  } catch {
    return false;
  }
}
