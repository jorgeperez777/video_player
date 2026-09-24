import React from 'react';
import type {AirPlayButtonProps} from './types';

// There is no AirPlay on the web: browsers that support it (Safari) expose their own
// control inside the <video> element.
const AirPlayButton = ({fallback = null}: AirPlayButtonProps) => (
  <>{fallback}</>
);

export default AirPlayButton;
