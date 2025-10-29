import type { BreakType } from '@/types/attendance';

export type LegacyBreakType = BreakType | 'micro' | 'bathroom' | 'scheduled' | 'emergency';

export const normalizeBreakType = (
  type: LegacyBreakType | string | null | undefined
): BreakType => {
  switch (type) {
    case 'coffee':
    case 'wc':
    case 'lunch':
      return type;
    case 'bathroom':
      return 'wc';
    case 'micro':
    case 'scheduled':
    case 'emergency':
      return 'coffee';
    default:
      return 'coffee';
  }
};

export const isLegacyBreakTypeError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error ? (error as { message?: string }).message : undefined;
  if (!message) {
    return false;
  }

  return message.includes('break_type_enum') && message.includes('"micro"');
};
