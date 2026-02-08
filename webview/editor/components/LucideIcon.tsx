/**
 * LucideIcon React Wrapper
 *
 * Thin component that converts lucide IconNode tuples to JSX.
 * Usage: <LucideIcon icon={Bold} size={16} strokeWidth={2.5} />
 */

import { createElement as h } from 'react';
import type { IconNode } from 'lucide';

interface LucideIconProps {
  icon: IconNode;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function LucideIcon({ icon, size = 24, strokeWidth = 2, className }: LucideIconProps) {
  const [, defaultAttrs, children] = icon;
  return (
    <svg
      {...defaultAttrs}
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
    >
      {children?.map(([tag, attrs], i) => h(tag, { ...attrs, key: i }))}
    </svg>
  );
}
