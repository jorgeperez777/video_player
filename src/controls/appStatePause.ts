import type {AppStateStatus} from 'react-native';

/**
 * Qué hacer con el vídeo cuando la app cambia de estado.
 *
 * Es una función aparte, sin React, porque la regla tiene miga y así se puede
 * probar: el reproductor nativo se pausa él solo cuando algo tapa la app, pero
 * no avisa a JS y no siempre vuelve a arrancar.
 *
 * - `inactive` (solo iOS): la persiana de notificaciones o el centro de control
 *   por encima. La app sigue delante, así que al quitarlos **se sigue
 *   reproduciendo** sin tocar nada.
 * - `background`: al escritorio o a otra app. Se queda pausado y los controles
 *   lo dicen; sigue con un toque en play.
 *
 * `pause` y `resume` son cambios del prop `paused`: tiene que ir y volver para
 * que el nativo —que se pausó por su cuenta— se entere de que hay que seguir.
 */
export type PauseAction = 'pause' | 'resume' | 'none';

export type PauseDecision = {
  action: PauseAction;
  /** Lo que vale a partir de ahora el «reanuda al volver». */
  resumeOnActive: boolean;
};

export function decideOnAppState(
  state: AppStateStatus,
  {
    paused,
    resumeOnActive,
    guarded,
  }: {
    /** Si el vídeo ya estaba en pausa (ahí no hay nada que hacer). */
    paused: boolean;
    /** Si se pausó solo por haber quedado tapado. */
    resumeOnActive: boolean;
    /**
     * PiP, enviando a una tele, `playInBackground` o `playWhenInactive`: casos
     * en los que el vídeo sigue a propósito y nadie toca nada.
     */
    guarded: boolean;
  },
): PauseDecision {
  if (guarded) {
    return {action: 'none', resumeOnActive};
  }
  if (state === 'active') {
    return resumeOnActive
      ? {action: 'resume', resumeOnActive: false}
      : {action: 'none', resumeOnActive};
  }
  if (!paused) {
    // Tapado un momento (iOS) sí se reanuda; irse al fondo, no.
    return {action: 'pause', resumeOnActive: state === 'inactive'};
  }
  // De `inactive` a `background`: esto ya no es taparlo un momento.
  return {
    action: 'none',
    resumeOnActive: state === 'background' ? false : resumeOnActive,
  };
}
