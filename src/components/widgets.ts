import { defineComponent, h, onBeforeUnmount, onMounted, ref, useId, type VNode } from 'vue';
import { appearanceStyle, initials, useCboxId } from '../context.js';
import type { CboxWidgetUser } from '../types.js';

function avatar(user: CboxWidgetUser): VNode {
  return h('span', { class: 'cbox-id-avatar', 'aria-hidden': 'true' }, [
    user.imageUrl ? h('img', { src: user.imageUrl, alt: '' }) : initials(user),
  ]);
}

/** A primary button linking to your app's sign-in route. */
export const CboxSignInButton = defineComponent({
  name: 'CboxSignInButton',
  props: { label: { type: String, default: 'Sign in' } },
  setup(props, { slots }) {
    const cbox = useCboxId();
    return () =>
      h('span', { class: 'cbox-id-root', style: appearanceStyle(cbox.value.appearance) }, [
        h(
          'a',
          { class: 'cbox-id-btn cbox-id-btn--primary', href: cbox.value.urls.signIn ?? '#' },
          slots.default ? slots.default() : props.label,
        ),
      ]);
  },
});

/** A button linking to your app's sign-out route. */
export const CboxSignOutButton = defineComponent({
  name: 'CboxSignOutButton',
  props: { label: { type: String, default: 'Sign out' } },
  setup(props, { slots }) {
    const cbox = useCboxId();
    return () =>
      h('span', { class: 'cbox-id-root', style: appearanceStyle(cbox.value.appearance) }, [
        h(
          'a',
          { class: 'cbox-id-btn', href: cbox.value.urls.signOut ?? '#' },
          slots.default ? slots.default() : props.label,
        ),
      ]);
  },
});

/** The user's current organization as a badge; renders nothing when absent. */
export const CboxOrganizationBadge = defineComponent({
  name: 'CboxOrganizationBadge',
  props: { label: { type: String, default: '' } },
  setup(props) {
    const cbox = useCboxId();
    return () => {
      const text = props.label || cbox.value.user?.organizationId || '';
      if (!text) {
        return null;
      }
      return h('span', { class: 'cbox-id-root', style: appearanceStyle(cbox.value.appearance) }, [
        h('span', { class: 'cbox-id-orgbadge' }, text),
      ]);
    };
  },
});

/** Avatar, name, email and a manage-account link. Renders nothing when signed out. */
export const CboxUserProfileCard = defineComponent({
  name: 'CboxUserProfileCard',
  setup() {
    const cbox = useCboxId();
    return () => {
      const { user, urls, appearance } = cbox.value;
      if (!user) {
        return null;
      }
      return h('span', { class: 'cbox-id-root', style: appearanceStyle(appearance) }, [
        h('div', { class: 'cbox-id-card' }, [
          avatar(user),
          h('div', [
            h('div', { class: 'cbox-id-card__name' }, user.name ?? user.email ?? user.id),
            user.email ? h('div', { class: 'cbox-id-card__email' }, user.email) : null,
            urls.profile
              ? h('a', { class: 'cbox-id-menu__item', style: { paddingLeft: 0 }, href: urls.profile }, 'Manage account →')
              : null,
          ]),
        ]),
      ]);
    };
  },
});

/**
 * The drop-in account control: a signed-in user's avatar that opens a menu with
 * hosted profile management and sign-out. When signed out, it renders a sign-in
 * button. Keyboard- and screen-reader-accessible; closes on outside click or Escape.
 */
export const CboxUserButton = defineComponent({
  name: 'CboxUserButton',
  props: {
    manageLabel: { type: String, default: 'Manage account' },
    signOutLabel: { type: String, default: 'Sign out' },
  },
  setup(props) {
    const cbox = useCboxId();
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
      if (!user) {
        return h(CboxSignInButton);
      }

      const menu = open.value
        ? h('div', { class: 'cbox-id-menu', role: 'menu', id: menuId }, [
            h('div', { class: 'cbox-id-menu__head' }, [
              avatar(user),
              h('div', [
                h('div', { class: 'cbox-id-menu__name' }, user.name ?? user.email ?? user.id),
                user.email ? h('div', { class: 'cbox-id-menu__email' }, user.email) : null,
              ]),
            ]),
            h('hr', { class: 'cbox-id-menu__sep' }),
            urls.profile
              ? h('a', { class: 'cbox-id-menu__item', role: 'menuitem', href: urls.profile }, props.manageLabel)
              : null,
            urls.signOut
              ? h('a', { class: 'cbox-id-menu__item', role: 'menuitem', href: urls.signOut }, props.signOutLabel)
              : null,
          ])
        : null;

      return h('span', { class: 'cbox-id-root', style: appearanceStyle(appearance) }, [
        h('span', { class: 'cbox-id-anchor', ref: anchor }, [
          h(
            'button',
            {
              type: 'button',
              class: 'cbox-id-userbtn',
              'aria-haspopup': 'menu',
              'aria-expanded': String(open.value),
              'aria-controls': open.value ? menuId : undefined,
              'aria-label': user.name ?? user.email ?? 'Account menu',
              onClick: () => {
                open.value = !open.value;
              },
            },
            [avatar(user)],
          ),
          menu,
        ]),
      ]);
    };
  },
});
