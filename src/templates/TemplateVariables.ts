/**
 * Template Variable Substitution
 *
 * Replaces template variables with actual values
 */

/**
 * Available template variables and their descriptions
 */
export const TEMPLATE_VARIABLES = {
  '{{date}}': 'Current date (YYYY-MM-DD)',
  '{{time}}': 'Current time (HH:mm:ss)',
  '{{datetime}}': 'Current date and time (YYYY-MM-DD HH:mm:ss)',
  '{{year}}': 'Current year (YYYY)',
  '{{month}}': 'Current month (MM)',
  '{{day}}': 'Current day (DD)',
} as const;

/**
 * Pad a number with leading zeros
 */
function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, '0');
}

/**
 * Get variable values for the current date/time
 */
function getVariableValues(): Record<string, string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return {
    '{{date}}': `${year}-${month}-${day}`,
    '{{time}}': `${hours}:${minutes}:${seconds}`,
    '{{datetime}}': `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    '{{year}}': year,
    '{{month}}': month,
    '{{day}}': day,
  };
}

/**
 * Substitute all template variables in content
 */
export function substituteVariables(content: string): string {
  const values = getVariableValues();

  let result = content;
  for (const [variable, value] of Object.entries(values)) {
    // Replace all occurrences (case-sensitive)
    result = result.split(variable).join(value);
  }

  return result;
}
