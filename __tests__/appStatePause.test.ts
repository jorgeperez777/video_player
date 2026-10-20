import {decideOnAppState} from '../src/controls/appStatePause';

const playing = {paused: false, resumeOnActive: false, guarded: false};

describe('qué hacer con el vídeo al cambiar de estado la app', () => {
  it('la persiana de notificaciones (iOS) lo pausa y lo deja marcado para seguir', () => {
    expect(decideOnAppState('inactive', playing)).toEqual({
      action: 'pause',
      resumeOnActive: true,
    });
  });

  it('al quitarla, vuelve a reproducir solo', () => {
    expect(
      decideOnAppState('active', {
        paused: true,
        resumeOnActive: true,
        guarded: false,
      }),
    ).toEqual({action: 'resume', resumeOnActive: false});
  });

  it('irse al fondo lo pausa y ahí se queda', () => {
    const left = decideOnAppState('background', playing);
    expect(left).toEqual({action: 'pause', resumeOnActive: false});
    expect(
      decideOnAppState('active', {
        paused: true,
        resumeOnActive: left.resumeOnActive,
        guarded: false,
      }),
    ).toEqual({action: 'none', resumeOnActive: false});
  });

  it('pasar por inactive camino del fondo no cuenta como taparlo un momento', () => {
    const covered = decideOnAppState('inactive', playing);
    const away = decideOnAppState('background', {
      paused: true,
      resumeOnActive: covered.resumeOnActive,
      guarded: false,
    });
    expect(away).toEqual({action: 'none', resumeOnActive: false});
  });

  it('lo que ya estaba en pausa sigue en pausa', () => {
    expect(
      decideOnAppState('inactive', {
        paused: true,
        resumeOnActive: false,
        guarded: false,
      }),
    ).toEqual({action: 'none', resumeOnActive: false});
  });

  it('en PiP, enviando a una tele o sonando de fondo no se toca nada', () => {
    expect(decideOnAppState('background', {...playing, guarded: true})).toEqual(
      {
        action: 'none',
        resumeOnActive: false,
      },
    );
  });
});
