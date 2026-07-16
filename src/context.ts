import { computed, inject, type ComputedRef, type CSSProperties, type InjectionKey } from 'vue';
import type { CboxWidgetAppearance, CboxWidgetUrls, CboxWidgetUser } from './types.js';

export interface CboxIdContext {
  user: CboxWidgetUser | null;
  urls: CboxWidgetUrls;
  appearance: CboxWidgetAppearance;
}

export const CboxIdKey: InjectionKey<ComputedRef<CboxIdContext>> = Symbol('cbox-id');

/** The reactive widget context. Throws when used outside a `<CboxIdProvider>`. */
export function useCboxId(): ComputedRef<CboxIdContext> {
  const context = inject(CboxIdKey);
  if (!context) {
    throw new Error('Cbox ID widgets must be rendered inside a <CboxIdProvider>.');
  }
  return context;
}

/** The signed-in user, or null (reactive). */
export function useCboxUser(): ComputedRef<CboxWidgetUser | null> {
  const context = useCboxId();
  return computed(() => context.value.user);
}

/** Build the inline style that applies an appearance's CSS variables. */
export function appearanceStyle(appearance: CboxWidgetAppearance): CSSProperties {
  const vars: Record<string, string> = {};
  if (appearance.accent) {
    vars['--cbox-id-accent'] = appearance.accent;
  }
  if (appearance.accentForeground) {
    vars['--cbox-id-accent-fg'] = appearance.accentForeground;
  }
  if (appearance.radius) {
    vars['--cbox-id-radius'] = appearance.radius;
  }
  if (appearance.fontFamily) {
    vars['--cbox-id-font'] = appearance.fontFamily;
  }
  return vars as CSSProperties;
}

/** Initials for the avatar fallback, from name or email. */
export function initials(user: CboxWidgetUser): string {
  const source = user.name?.trim() || user.email?.trim() || '';
  if (source === '') {
    return '?';
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
