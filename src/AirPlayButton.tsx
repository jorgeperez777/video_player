import React from 'react';
import {Platform, processColor} from 'react-native';
import NativeAirPlayButton from './specs/AirPlayButtonNativeComponent';
import type {AirPlayButtonProps} from './types';

/**
 * AirPlay route picker. Only iOS has AirPlay, so on every other platform this renders
 * `fallback` (nothing by default).
 *
 * The button opens the system picker; AVPlayer moves the playback to the chosen route
 * on its own as long as the `<Video>` keeps `allowsExternalPlayback` enabled. Listen to
 * `onExternalPlaybackChange` on the `<Video>` to know when playback went external.
 */
const AirPlayButton = ({
  style,
  iconColor = 'white',
  activeIconColor,
  prioritizesVideoDevices = true,
  fallback = null,
}: AirPlayButtonProps) => {
  if (Platform.OS !== 'ios') {
    return <>{fallback}</>;
  }

  return (
    <NativeAirPlayButton
      style={style}
      iconColor={processColor(iconColor) as number | null}
      activeIconColor={
        activeIconColor
          ? (processColor(activeIconColor) as number | null)
          : undefined
      }
      prioritizesVideoDevices={prioritizesVideoDevices}
    />
  );
};

export default AirPlayButton;
