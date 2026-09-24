import { defineComponent, h, onBeforeUnmount, onMounted, ref, useId, type PropType, type VNode } from 'vue';
import { appearanceStyle, initialsOf, useCboxId } from '../context.js';
import { useOrganization, useSupportSession } from '../organization.js';
import type { CboxWidgetActor, CboxWidgetOrganization, CboxWidgetUser } from '../types.js';

/** Props for {@link CboxOrganizationSwitcher}. */
export interface CboxOrganizationSwitcherProps {
  /** Heading above the organization list. Defaults to `"Organizations"`. */
  label?: string;
  /** Label for the create-organization footer (shown when `urls.createOrganization` is set). */
  createLabel?: string;
  /** Label for the hosted-picker footer (shown when `urls.selectOrganization` is set). */
  selectLabel?: string;
  /** Trigger text when the session is bound to no organization yet. */
  placeholder?: string;
}

/** Props for {@link CboxSupportSessionBanner}. Pass a default slot for your own wording. */
export interface CboxSupportSessionBannerProps {
  /**
   * Label for the end-session link, drawn when `urls.signOut` is set. Ending a support
   * session is signing out: the acted tokens have no refresh token and nothing to return to.
   */
  endLabel?: string;
  /**
   * Replaces the built-in `cbox-id-support` class, which drops its styling — the banner is
   * then an unstyled region carrying only your class.
   */
  className?: string;
}

/** The slot props {@link CboxSupportSessionBanner}'s default slot receives. */
export interface CboxSupportSessionSlotProps {
  /** Who is acting, when known; `sub` is null when the actor could not be read. */
  actor: CboxWidgetActor | null;
  /** The person being acted as. */
  user: CboxWidgetUser | null;
}

/** A square logo/initials tile for an organization. */
function orgAvatar(org: CboxWidgetOrganization): VNode {
  return h('span', { class: 'cbox-id-avatar cbox-id-avatar--org', 'aria-hidden': 'true' }, [
    org.imageUrl ? h('img', { src: org.imageUrl, alt: '' }) : initialsOf(org.name),
  ]);
}

const chevron = () =>
  h(
    'svg',
    {
      class: 'cbox-id-orgswitch__chev',
      width: 14,
      height: 14,
      viewBox: '0 0 16 16',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.6,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [h('path', { d: 'M4 6l4 4 4-4' })],
  );

const check = () =>
  h(
    'svg',
    {
      class: 'cbox-id-menu__check',
      width: 15,
      height: 15,
      viewBox: '0 0 16 16',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    [h('path', { d: 'M3.5 8.5l3 3 6-7' })],
  );

/**
 * The drop-in organization control: the active organization, opening a menu of the
 * user's organizations with a one-click switch. Switching is a redirect that starts a new
 * sign-in bound to the chosen organization (`organization=<id>`, via
 * `urls.switchOrganization`); without that URL the list is read-only.
 *
 * The list is `user.organizations`, which Cbox ID only sends when the sign-in requested
 * the `organizations` scope. Without it, and with `urls.selectOrganization` set, the
 * control is a single link to the hosted picker; with neither, it renders nothing.
 * Keyboard- and screen-reader-accessible; closes on outside click or Escape.
 */
export const CboxOrganizationSwitcher = defineComponent({
  name: 'CboxOrganizationSwitcher',
  props: {
    label: { type: String, default: 'Organizations' },
    createLabel: { type: String, default: 'Create organization' },
    selectLabel: { type: String, default: 'All organizations' },
    placeholder: { type: String, default: 'Select organization' },
  },
  setup(props) {
    const cbox = useCboxId();
    const { organization, organizations, switchUrl } = useOrganization();
    const open = ref(false);
    const anchor = ref<HTMLElement | null>(null);
    const menuId = useId();

    const onDocClick = (event: MouseEvent) => {
      if (anchor.value && !anchor.value.contains(event.target as Node)) {
        open.value = false;
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        open.value = false;
      }
    };
    onMounted(() => {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('keydown', onKey);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    });

    return () => {
      const { user, urls, appearance } = cbox.value;
      const active = organization.value;
      const orgs = organizations.value;

      if (!user) {
        return null;
      }

      // Not the first organization in the list when the session is bound to none: naming
      // one as current would show its name over data it does not own.
      const triggerLabel = active ? `Current organization: ${active.name}. Switch organization` : props.placeholder;
      const triggerContent = [
        active ? orgAvatar(active) : null,
        h('span', { class: 'cbox-id-orgswitch__name' }, active ? active.name : props.placeholder),
      ];

      if (orgs.length === 0) {
        // No list to draw — the sign-in did not ask for the `organizations` scope. The
        // hosted picker still knows every membership, so link to it rather than render
        // nothing.
        if (!urls.selectOrganization) {
          return null;
        }
        return h('span', { class: 'cbox-id-root', style: appearanceStyle(appearance) }, [
          h(
            'a',
            { class: 'cbox-id-orgswitch', href: urls.selectOrganization, 'aria-label': triggerLabel },
            triggerContent,
          ),
        ]);
      }

      const items = orgs.map((org) => {
        const isActive = org.id === active?.id;
        const href = switchUrl(org.id);
        const inner = [
          orgAvatar(org),
          h('span', { class: 'cbox-id-menu__label' }, [
            h('span', { class: 'cbox-id-menu__name' }, org.name),
            org.role ? h('span', { class: 'cbox-id-menu__itemsub' }, org.role) : null,
          ]),
          isActive ? check() : null,
        ];

        return href
          ? h('a', { key: org.id, class: 'cbox-id-menu__item', role: 'menuitem', href }, inner)
          : h(
              'div',
              {
                key: org.id,
                class: ['cbox-id-menu__item', isActive ? 'cbox-id-menu__item--active' : null],
                role: 'menuitem',
                'aria-current': isActive ? 'true' : undefined,
              },
              inner,
            );
      });

      const menu = open.value
        ? h('div', { class: 'cbox-id-menu', role: 'menu', id: menuId, 'aria-label': props.label }, [
            h('div', { class: 'cbox-id-menu__grouplabel' }, props.label),
            ...items,
            urls.selectOrganization || urls.createOrganization ? h('hr', { class: 'cbox-id-menu__sep' }) : null,
            urls.selectOrganization
              ? h('a', { class: 'cbox-id-menu__item', role: 'menuitem', href: urls.selectOrganization }, [
                  h('span', { class: 'cbox-id-menu__name' }, props.selectLabel),
                ])
              : null,
            urls.createOrganization
              ? h('a', { class: 'cbox-id-menu__item', role: 'menuitem', href: urls.createOrganization }, [
                  h(
                    'span',
                    { class: 'cbox-id-avatar cbox-id-avatar--org cbox-id-avatar--ghost', 'aria-hidden': 'true' },
                    '+',
                  ),
                  h('span', { class: 'cbox-id-menu__name' }, props.createLabel),
                ])
              : null,
          ])
        : null;

      return h('span', { class: 'cbox-id-root', style: appearanceStyle(appearance) }, [
        h('span', { class: 'cbox-id-anchor cbox-id-anchor--start', ref: anchor }, [
          h(
            'button',
            {
              type: 'button',
              class: 'cbox-id-orgswitch',
              'aria-haspopup': 'menu',
              'aria-expanded': String(open.value),
              'aria-controls': open.value ? menuId : undefined,
              'aria-label': triggerLabel,
              onClick: () => {
                open.value = !open.value;
              },
            },
            [...triggerContent, chevron()],
          ),
          menu,
        ]),
      ]);
    };
  },
});

/**
 * A banner that is drawn only in a SUPPORT SESSION — while a member of staff is signed in
 * as this person (the token carries the RFC 8693 `act` claim). Place it at the top of your
 * layout; it renders nothing in an ordinary session.
 *
 * The person at the keyboard is a member of staff inside somebody else's account. The
 * banner keeps that in front of them on every page, and makes any screenshot or screen
 * share of the session say whose account it was. It is a labelled region rather than a
 * live announcement, because it is there from the first paint and is not news.
 *
 * Fail-closed: a token whose `act` claim could not be read still draws it.
 *
 * The default slot replaces the built-in text and receives `{ actor, user }`, so you can
 * word it yourself or look the staff member up by `actor.sub`. Headless use:
 * `useSupportSession()` returns the same values this reads.
 */
export const CboxSupportSessionBanner = defineComponent({
  name: 'CboxSupportSessionBanner',
  props: {
    endLabel: { type: String, default: 'End support session' },
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    const cbox = useCboxId();
    const session = useSupportSession();

    return () => {
      if (!session.active.value) {
        return null;
      }

      const { urls, appearance } = cbox.value;
      const user = session.user.value;
      const who = user?.name?.trim() || user?.email?.trim() || 'this user';

      const content = slots.default
        ? slots.default({ actor: session.actor.value, user } satisfies CboxSupportSessionSlotProps)
        : [
            h('strong', 'Support session.'),
            ` You are signed in as ${who}. Everything you do here is audited.`,
          ];

      return h('div', { class: 'cbox-id-root cbox-id-root--block', style: appearanceStyle(appearance) }, [
        h('section', { class: props.className ?? 'cbox-id-support', 'aria-label': 'Support session' }, [
          h('span', { class: 'cbox-id-support__text' }, content),
          urls.signOut ? h('a', { class: 'cbox-id-support__end', href: urls.signOut }, props.endLabel) : null,
        ]),
      ]);
    };
  },
});
