import { computed, defineComponent, h, onMounted, provide, type PropType } from 'vue';
import { CboxIdKey } from '../context.js';
import { ensureStyles } from '../styles.js';
import type { CboxWidgetAppearance, CboxWidgetUrls, CboxWidgetUser } from '../types.js';

/** Props for {@link CboxIdProvider}. */
export interface CboxIdProviderProps {
  /** The signed-in user, or null when signed out. */
  user?: CboxWidgetUser | null;
  /** URLs the widgets link to (sign-in / sign-out routes and the hosted profile). */
  urls?: CboxWidgetUrls;
  /** Optional theming. */
  appearance?: CboxWidgetAppearance;
}

/**
 * Only the fields a widget draws, whatever was handed in.
 *
 * A SECURITY CONTROL, not tidiness. `CboxWidgetUser` is shape-compatible with id-js's
 * `CboxUser`, which also carries `accessToken`, `refreshToken`, `idToken` and the full
 * claim set, and TypeScript's excess-property check does not fire on a variable — so the
 * whole object compiles clean as a prop. Everything injected here is reachable from every
 * widget and from Vue DevTools. The new fields are narrowed too: the organization to id,
 * name and role, the actor to its subject alone (id-js also chains prior actors, which no
 * widget draws). An actor whose subject could not be read stays an actor — it is still a
 * support session, and the banner must still show.
 */
function narrow(user: CboxWidgetUser | null | undefined): CboxWidgetUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    organizationId: user.organizationId ?? null,
    imageUrl: user.imageUrl ?? null,
    organization: user.organization
      ? { id: user.organization.id, name: user.organization.name ?? null, role: user.organization.role ?? null }
      : null,
    actor: user.actor ? { sub: typeof user.actor.sub === 'string' ? user.actor.sub : null } : null,
    ...(user.organizations
      ? {
          organizations: user.organizations.map((org) => ({
            id: org.id,
            name: org.name,
            role: org.role ?? null,
            imageUrl: org.imageUrl ?? null,
          })),
        }
      : {}),
  };
}

/**
 * Wrap the part of your app that uses Cbox ID widgets. Supplies the current user and
 * the flow URLs, and injects the (scoped, themeable) widget stylesheet once.
 */
export const CboxIdProvider = defineComponent({
  name: 'CboxIdProvider',
  props: {
    user: { type: Object as PropType<CboxWidgetUser | null>, default: null },
    urls: { type: Object as PropType<CboxWidgetUrls>, default: () => ({}) },
    appearance: { type: Object as PropType<CboxWidgetAppearance>, default: () => ({}) },
  },
  setup(props, { slots }) {
    provide(
      CboxIdKey,
      computed(() => ({
        user: narrow(props.user),
        urls: props.urls,
        appearance: props.appearance,
      })),
    );
    onMounted(ensureStyles);
    return () => (slots.default ? slots.default() : h('template'));
  },
});
