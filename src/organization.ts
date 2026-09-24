import { computed, type ComputedRef } from 'vue';
import { useCboxId } from './context.js';
import type { CboxWidgetActor, CboxWidgetOrganization, CboxWidgetUser } from './types.js';

/** What {@link useOrganization} returns. Every value is reactive. */
export interface UseOrganizationResult {
  /**
   * The organization the session is bound to, or null when it is bound to none. Its
   * name and logo come from the `organizations` list when that carries it, and from the
   * token's `org_name` otherwise; when neither has a name, it is the id.
   */
  organization: ComputedRef<CboxWidgetOrganization | null>;
  /**
   * The person's membership tier in that organization (`org_role`: `owner`, `admin`,
   * `developer`, `member`, `viewer`), or null. Who may administer the organization — not
   * what they may do in your app; that is `roles` / `permissions` on the server.
   */
  role: ComputedRef<string | null>;
  /** Every organization the person is an active member of; empty without the `organizations` scope. */
  organizations: ComputedRef<CboxWidgetOrganization[]>;
  /** Whether there is another organization to switch to and a route to do it with. */
  canSwitch: ComputedRef<boolean>;
  /**
   * The route that switches to `organizationId` (`urls.switchOrganization`), or null when
   * there is none, or when it is the organization the session is already bound to.
   */
  switchUrl(organizationId: string): string | null;
  /**
   * Navigate to {@link switchUrl}. Does nothing when it is null. The switch is a full
   * sign-in bound to the other organization, so the page is replaced — the new
   * organization's role and permissions arrive with the tokens, not in this tab's state.
   */
  switchOrganization(organizationId: string): void;
}

/**
 * The active organization, the person's role in it, and the means to switch — the
 * headless half of `<CboxOrganizationSwitcher>`, for building your own.
 *
 * ```ts
 * const { organization, role, organizations, switchOrganization } = useOrganization();
 * ```
 */
export function useOrganization(): UseOrganizationResult {
  const context = useCboxId();

  const organizations = computed(() => context.value.user?.organizations ?? []);
  const organization = computed(() => activeOrganization(context.value.user));

  const switchUrl = (organizationId: string): string | null => {
    const route = context.value.urls.switchOrganization;

    return route && organizationId !== (organization.value?.id ?? null) ? route(organizationId) : null;
  };

  return {
    organization,
    role: computed(() => organization.value?.role ?? null),
    organizations,
    canSwitch: computed(
      () =>
        context.value.urls.switchOrganization !== undefined &&
        organizations.value.some((org) => org.id !== (organization.value?.id ?? null)),
    ),
    switchUrl,
    switchOrganization(organizationId) {
      const url = switchUrl(organizationId);
      if (url !== null) {
        window.location.assign(url);
      }
    },
  };
}

/** What {@link useSupportSession} returns. Every value is reactive. */
export interface UseSupportSessionResult {
  /** Whether a member of staff is signed in as this person. */
  active: ComputedRef<boolean>;
  /** Who, when known; null when the session is not acted, or the actor could not be read. */
  actor: ComputedRef<CboxWidgetActor | null>;
  /** The person being acted as. */
  user: ComputedRef<CboxWidgetUser | null>;
}

/**
 * Whether this is a support session — a member of staff signed in as the person, with a
 * recorded reason and a time limit. The headless half of `<CboxSupportSessionBanner>`; use
 * it to hide what a helper should never do on somebody's behalf.
 *
 * Reads `user.actor`, which `@cboxdk/id-js` 0.17+ sets from the token's `act` claim. Pass
 * a user without it and this reports `active: false` — it cannot see a claim it was not
 * given. Fail-closed on what it is given: an actor whose subject could not be read still
 * counts.
 */
export function useSupportSession(): UseSupportSessionResult {
  const context = useCboxId();
  const actor = computed(() => context.value.user?.actor ?? null);

  return {
    active: computed(() => actor.value !== null),
    actor,
    user: computed(() => context.value.user),
  };
}

function activeOrganization(user: CboxWidgetUser | null): CboxWidgetOrganization | null {
  const id = user?.organization?.id ?? user?.organizationId ?? null;

  // Never the first listed organization when the session is bound to none: naming one as
  // current would show its name over data it does not own.
  if (user === null || id === null || id === '') {
    return null;
  }

  const listed = user.organizations?.find((org) => org.id === id);

  return {
    ...listed,
    id,
    name: listed?.name ?? user.organization?.name ?? id,
    // org_role on the token is authoritative for the organization it is bound to; the
    // list can come from a sign-in older than a promotion.
    role: user.organization?.role ?? listed?.role ?? null,
  };
}
