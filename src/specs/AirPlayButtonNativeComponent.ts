import type {HostComponent, ViewProps} from 'react-native';
import {requireNativeComponent} from 'react-native';
import type {WithDefault} from 'react-native/Libraries/Types/CodegenTypes';

// -------- Types for the native component (see src/AirPlayButton.tsx for the react one) --------

export interface AirPlayButtonNativeProps extends ViewProps {
  iconColor?: number | null;
  activeIconColor?: number | null;
  prioritizesVideoDevices?: WithDefault<boolean, true>;
}

type NativeAirPlayButtonComponentType = HostComponent<AirPlayButtonNativeProps>;

export default requireNativeComponent<AirPlayButtonNativeProps>(
  'RCTAirPlayButton',
) as NativeAirPlayButtonComponentType;
