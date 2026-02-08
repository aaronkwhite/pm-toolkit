/**
 * Lucide Icon Helpers
 *
 * Renders Lucide SVG icons inline for the kanban board
 */

import { createElement as lucideCreateElement, EllipsisVertical, Check } from 'lucide';

interface IconOptions {
  size?: number;
  strokeWidth?: number;
  class?: string;
}

/**
 * MoreVertical icon (kebab menu)
 * Three vertical dots
 */
export function MoreVertical(options: IconOptions = {}): SVGSVGElement {
  const { size = 16, strokeWidth = 2, class: className } = options;
  const svg = lucideCreateElement(EllipsisVertical) as SVGSVGElement;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('stroke-width', String(strokeWidth));
  if (className) {
    svg.setAttribute('class', className);
  }
  return svg;
}

/**
 * Check icon (checkmark)
 */
export function CheckIcon(options: IconOptions = {}): SVGSVGElement {
  const { size = 16, strokeWidth = 2, class: className } = options;
  const svg = lucideCreateElement(Check) as SVGSVGElement;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('stroke-width', String(strokeWidth));
  if (className) {
    svg.setAttribute('class', className);
  }
  return svg;
}
