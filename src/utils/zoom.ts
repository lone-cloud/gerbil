import { ZOOM } from '@/constants';

export const zoomLevelToPercentage = (zoomLevel: number): number =>
  Math.round(Math.pow(1.2, zoomLevel) * 100);

export const percentageToZoomLevel = (percentage: number): number =>
  Math.log(percentage / 100) / Math.log(1.2);

export const isValidZoomPercentage = (percentage: number): boolean =>
  percentage >= ZOOM.MIN_PERCENTAGE && percentage <= ZOOM.MAX_PERCENTAGE;
