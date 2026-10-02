/** Pre-flight verdict text, localized on the main thread from the shared assessment. */
import { getLang, t } from '../i18n';
import { assessMission, type VerdictAssessment, type VerdictInput, type VerdictMessage } from './verdict-core';

export * from './verdict-core';

export interface Feasibility extends Omit<VerdictAssessment, 'messages'> {
  text: string;
}

function say(message: VerdictMessage): string {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(message.params ?? {})) {
    if (typeof value !== 'object') params[key] = value;
    else if ('key' in value) params[key] = say(value);
    else {
      try {
        params[key] = value.number.toLocaleString(getLang(), {
          minimumFractionDigits: value.digits, maximumFractionDigits: value.digits,
        });
      } catch {
        params[key] = value.number.toFixed(value.digits);
      }
    }
  }
  const text = t(message.key, params);
  return text === message.key ? (message.fallback ?? text) : text;
}

/** Localize a computed or structured-cloned result in the reader's current language. */
export function localizeVerdict(assessment: VerdictAssessment): Feasibility {
  const { messages, ...verdict } = assessment;
  return { ...verdict, text: messages.map(say).join(' ') };
}

/** The setup panel's public API: the same checks and words as the compute workers. */
export function missionVerdict(input: VerdictInput): Feasibility {
  return localizeVerdict(assessMission(input));
}
