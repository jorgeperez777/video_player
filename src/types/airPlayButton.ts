import type {ColorValue, StyleProp, ViewStyle} from 'react-native';

export interface AirPlayButtonProps {
  style?: StyleProp<ViewStyle>;
  /** Icon color while no external route is selected. Defaults to white. */
  iconColor?: ColorValue;
  /** Icon color while playing on an external route. Defaults to the system tint. */
  activeIconColor?: ColorValue;
  /** List video devices (TVs, AirPlay 2 displays) before audio-only ones. Defaults to true. */
  prioritizesVideoDevices?: boolean;
  /** Rendered instead of the picker on platforms without AirPlay (Android, web, tvOS). */
  fallback?: React.ReactNode;
}
