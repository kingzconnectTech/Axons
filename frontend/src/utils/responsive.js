import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width (iPhone 11/Pro/X)
const BASE_WIDTH = 375;

const scale = SCREEN_WIDTH / BASE_WIDTH;

export const IS_TABLET = SCREEN_WIDTH > 600;

/**
 * Normalizes font size based on screen width
 * @param {number} size - The font size to normalize
 * @returns {number} - The responsive font size
 */
export function normalize(size) {
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
}

/**
 * Returns width percentage
 * @param {string|number} percentage 
 */
export const wp = (percentage) => {
    const value = (parseFloat(percentage) * SCREEN_WIDTH) / 100;
    return PixelRatio.roundToNearestPixel(value);
};

/**
 * Returns height percentage
 * @param {string|number} percentage 
 */
export const hp = (percentage) => {
    const value = (parseFloat(percentage) * SCREEN_HEIGHT) / 100;
    return PixelRatio.roundToNearestPixel(value);
};

export default normalize;
