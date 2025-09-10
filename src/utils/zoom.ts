import { ZOOM } from '@/constants';

export const zoomLevelToPercentage = (zoomLevel: number) =>
  Math.round(Math.pow(1.2, zoomLevel) * 100);

export const percentageToZoomLevel = (percentage: number) =>
  Math.log(percentage / 100) / Math.log(1.2);

export const isValidZoomPercentage = (percentage: number) =>
  percentage >= ZOOM.MIN_PERCENTAGE && percentage <= ZOOM.MAX_PERCENTAGE;
