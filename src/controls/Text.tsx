import React from 'react';
import {Text as NativeText, type TextProps} from 'react-native';

/**
 * La familia de letra de los controles. Sin fijar, la del sistema (Roboto en
 * Android, SF Pro en iOS); la app pone la suya con `setControlsFont`, igual
 * que el idioma con `setControlsLanguage`.
 */
let family: string | undefined;

export function setControlsFont(next: string | undefined) {
  family = next;
}

/**
 * `<Text>` de React Native con la familia de los controles delante: un estilo
 * que traiga su propio `fontFamily` sigue mandando.
 */
export default function Text({style, ...props}: TextProps) {
  return (
    <NativeText
      {...props}
      style={family ? [{fontFamily: family}, style] : style}
    />
  );
}
