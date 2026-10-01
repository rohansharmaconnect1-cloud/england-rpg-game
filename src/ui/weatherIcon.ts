import type { IconName } from '../assets/icons';
import type { WeatherKind } from '../state/types';

export const WEATHER_ICON: Record<WeatherKind, IconName> = {
  clear: 'sun',
  overcast: 'cloud',
  rain: 'rain',
  storm: 'storm',
  fog: 'fog',
  snow: 'snow',
};
