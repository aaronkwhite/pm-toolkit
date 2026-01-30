/**
 * Lucide Icon Helpers
 *
 * Renders Lucide SVG icons inline for the kanban board
 */

interface IconOptions {
  size?: number;
  strokeWidth?: number;
  class?: string;
}

/**
 * Create an SVG element with common Lucide attributes
 */
function createSvgElement(options: IconOptions = {}): SVGSVGElement {
  const { size = 16, strokeWidth = 2, class: className } = options;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (className) {
    svg.setAttribute('class', className);
  }

  return svg;
}

/**
 * Create a path element
 */
function createPath(d: string): SVGPathElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  return path;
}

/**
 * Create a circle element
 */
function createCircle(cx: number, cy: number, r: number): SVGCircleElement {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', String(cx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', String(r));
  return circle;
}

/**
 * MoreVertical icon (kebab menu)
 * Three vertical dots
 */
export function MoreVertical(options: IconOptions = {}): SVGSVGElement {
  const svg = createSvgElement({ ...options, strokeWidth: 0 });
  // Circles need fill instead of stroke for dots
  const circle1 = createCircle(12, 12, 1.5);
  circle1.setAttribute('fill', 'currentColor');
  const circle2 = createCircle(12, 5.5, 1.5);
  circle2.setAttribute('fill', 'currentColor');
  const circle3 = createCircle(12, 18.5, 1.5);
  circle3.setAttribute('fill', 'currentColor');
  svg.appendChild(circle1);
  svg.appendChild(circle2);
  svg.appendChild(circle3);
  return svg;
}

/**
 * Check icon (checkmark)
 */
export function Check(options: IconOptions = {}): SVGSVGElement {
  const svg = createSvgElement(options);
  svg.appendChild(createPath('M20 6 9 17l-5-5'));
  return svg;
}
