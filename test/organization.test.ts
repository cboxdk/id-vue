import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type Component } from 'vue';
import {
  CboxIdProvider,
  CboxOrganizationBadge,
  CboxOrganizationSwitcher,
  CboxSupportSessionBanner,
  useCboxId,
  useOrganization,
  type CboxSupportSessionSlotProps,
  type CboxWidgetUrls,
  type CboxWidgetUser,
  type UseOrganizationResult,
} from '../src/index.js';

const urls: CboxWidgetUrls = {
  signIn: '/auth/sign-in',
  signOut: '/auth/sign-out',
  switchOrganization: (id) => `/auth/switch-organization?org=${encodeURIComponent(id)}`,
};

const member: CboxWidgetUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@acme.com',
  organizationId: 'org-acme',
  organization: { id: 'org-acme', name: 'Acme Inc', role: 'owner' },
  organizations: [
    { id: 'org-acme', name: 'Acme Inc', role: 'member', imageUrl: 'https://cdn.test/acme.png' },
    { id: 'org-globex', name: 'Globex', role: 'viewer' },
  ],
};

function wrap(render: () => ReturnType<typeof h>, props: { user?: CboxWidgetUser | null; urls?: CboxWidgetUrls }) {
  const Host = defineComponent({
    render() {
      return h(CboxIdProvider, { user: props.user ?? null, urls: props.urls ?? {} }, render);
    },
  });
  return mount(Host, { attachTo: document.body });
}

function mountWidget(widget: Component, props: { user?: CboxWidgetUser | null; urls?: CboxWidgetUrls }) {
  return wrap(() => h(widget), props);
}

function probeOrganization(props: { user?: CboxWidgetUser | null; urls?: CboxWidgetUrls }): UseOrganizationResult {
  let seen: UseOrganizationResult | undefined;
  const Probe = defineComponent({
    setup() {
      seen = useOrganization();
      return () => null;
    },
  });
  wrap(() => h(Probe), props);
  if (seen === undefined) {
    throw new Error('the probe did not render');
  }
  return seen;
}

function probeUser(user: CboxWidgetUser): CboxWidgetUser | null {
  let seen: CboxWidgetUser | null = null;
  const Probe = defineComponent({
    setup() {
      seen = useCboxId().value.user;
      return () => null;
    },
  });
  wrap(() => h(Probe), { user });
  return seen;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('useOrganization', () => {
  it('merges the listed organization with the token, and takes the role from the token', () => {
    const result = probeOrganization({ user: member, urls });

    expect(result.organization.value).toEqual({
      id: 'org-acme',
      name: 'Acme Inc',
      role: 'owner',
      imageUrl: 'https://cdn.test/acme.png',
    });
    // org_role on the token is authoritative for the organization it is bound to; the
    // list can be a sign-in older than a promotion.
    expect(result.role.value).toBe('owner');
    expect(result.organizations.value).toHaveLength(2);
  });

  it('falls back to the list role, then to the id for a name', () => {
    expect(probeOrganization({ user: { ...member, organization: null }, urls }).role.value).toBe('member');

    const unlisted = probeOrganization({
      user: { id: 'u', organizationId: 'org-9', organization: { id: 'org-9' } },
      urls,
    });
    expect(unlisted.organization.value).toEqual({ id: 'org-9', name: 'org-9', role: null });
  });

  it('reports no organization for a session bound to none, even with a list', () => {
    const result = probeOrganization({ user: { ...member, organizationId: null, organization: null }, urls });

    expect(result.organization.value).toBeNull();
    expect(result.role.value).toBeNull();
    expect(result.canSwitch.value).toBe(true);
    expect(result.switchUrl('org-acme')).toBe('/auth/switch-organization?org=org-acme');
  });

  it('builds a switch route for the others, never for the active one', () => {
    const result = probeOrganization({ user: member, urls });

    expect(result.canSwitch.value).toBe(true);
    expect(result.switchUrl('org-globex')).toBe('/auth/switch-organization?org=org-globex');
    expect(result.switchUrl('org-acme')).toBeNull();
  });

  it('cannot switch without a route', () => {
    const result = probeOrganization({ user: member, urls: { signOut: '/auth/sign-out' } });

    expect(result.canSwitch.value).toBe(false);
    expect(result.switchUrl('org-globex')).toBeNull();
  });

  it('navigates to the switch route, and does nothing for the active organization', () => {
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, assign });

    const result = probeOrganization({ user: member, urls });

    result.switchOrganization('org-acme');
    expect(assign).not.toHaveBeenCalled();

    result.switchOrganization('org-globex');
    expect(assign).toHaveBeenCalledWith('/auth/switch-organization?org=org-globex');
  });
});

describe('CboxOrganizationSwitcher', () => {
  it('opens a menu that switches to the others and marks the active one', async () => {
    const wrapper = mountWidget(CboxOrganizationSwitcher, { user: member, urls });

    const trigger = wrapper.get('button');
    expect(trigger.attributes('aria-label')).toBe('Current organization: Acme Inc. Switch organization');
    await trigger.trigger('click');

    const items = wrapper.findAll('[role="menuitem"]');
    expect(items.map((i) => i.find('.cbox-id-menu__name').text())).toEqual(['Acme Inc', 'Globex']);
    // The active one is not a link to itself.
    expect(items[0]!.element.tagName).toBe('DIV');
    expect(items[0]!.attributes('aria-current')).toBe('true');
    expect(items[1]!.attributes('href')).toBe('/auth/switch-organization?org=org-globex');
  });

  it('lists read-only without a switch route', async () => {
    const wrapper = mountWidget(CboxOrganizationSwitcher, { user: member, urls: { signOut: '/auth/sign-out' } });
    await wrapper.get('button').trigger('click');

    expect(wrapper.findAll('[role="menuitem"] ').every((i) => i.attributes('href') === undefined)).toBe(true);
  });

  it('does not name an organization as current when the session is bound to none', async () => {
    const wrapper = mountWidget(CboxOrganizationSwitcher, {
      user: { ...member, organizationId: null, organization: null },
      urls,
    });

    const trigger = wrapper.get('button');
    expect(trigger.attributes('aria-label')).toBe('Select organization');
    expect(trigger.text()).toBe('Select organization');

    await trigger.trigger('click');
    for (const item of wrapper.findAll('[role="menuitem"]')) {
      expect(item.attributes('aria-current')).toBeUndefined();
    }
    expect(wrapper.findAll('[role="menuitem"]')[0]!.attributes('href')).toBe('/auth/switch-organization?org=org-acme');
  });

  it('offers the hosted picker and the create step at the foot of the menu', async () => {
    const wrapper = mountWidget(CboxOrganizationSwitcher, {
      user: member,
      urls: { ...urls, selectOrganization: '/auth/select-organization', createOrganization: '/auth/create-organization' },
    });
    await wrapper.get('button').trigger('click');

    const items = wrapper.findAll('[role="menuitem"]');
    expect(items.map((i) => i.text())).toEqual(
      expect.arrayContaining(['All organizations', '+Create organization']),
    );
    expect(wrapper.get('a[href="/auth/select-organization"]').text()).toBe('All organizations');
    expect(wrapper.find('a[href="/auth/create-organization"]').exists()).toBe(true);
  });

  it('links to the hosted picker when there is no list to draw', () => {
    // A sign-in without the `organizations` scope: the id and name, but no memberships.
    const wrapper = mountWidget(CboxOrganizationSwitcher, {
      user: { id: 'u', organizationId: 'org-acme', organization: { id: 'org-acme', name: 'Acme Inc' } },
      urls: { ...urls, selectOrganization: '/auth/select-organization' },
    });

    const link = wrapper.get('a.cbox-id-orgswitch');
    expect(link.attributes('href')).toBe('/auth/select-organization');
    expect(link.attributes('aria-label')).toBe('Current organization: Acme Inc. Switch organization');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('renders nothing without a list or a picker route', () => {
    const wrapper = mountWidget(CboxOrganizationSwitcher, { user: { id: 'u', organizationId: 'org-acme' }, urls });

    expect(wrapper.find('.cbox-id-root').exists()).toBe(false);
  });

  it('closes on Escape', async () => {
    const wrapper = mountWidget(CboxOrganizationSwitcher, { user: member, urls });
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });
});

describe('CboxOrganizationBadge', () => {
  it('shows the organization name, not its id', () => {
    const wrapper = mountWidget(CboxOrganizationBadge, { user: member, urls });

    expect(wrapper.get('.cbox-id-orgbadge').text()).toBe('Acme Inc');
  });
});

describe('CboxSupportSessionBanner', () => {
  it('renders nothing in an ordinary session', () => {
    const wrapper = mountWidget(CboxSupportSessionBanner, { user: member, urls });

    expect(wrapper.find('section').exists()).toBe(false);
  });

  it('names whose account the staff member is in, and offers to end the session', () => {
    const wrapper = mountWidget(CboxSupportSessionBanner, { user: { ...member, actor: { sub: 'staff-9' } }, urls });

    const banner = wrapper.get('section[aria-label="Support session"]');
    expect(banner.text()).toContain('You are signed in as Ada Lovelace.');
    expect(banner.classes()).toEqual(['cbox-id-support']);
    expect(banner.get('a').text()).toBe('End support session');
    expect(banner.get('a').attributes('href')).toBe('/auth/sign-out');
  });

  it('shows itself when the actor could not be read (fail-closed)', () => {
    const wrapper = mountWidget(CboxSupportSessionBanner, { user: { ...member, actor: { sub: null } }, urls });

    expect(wrapper.find('section[aria-label="Support session"]').exists()).toBe(true);
  });

  it('is unstyled with your own class, and takes your own words', () => {
    const wrapper = wrap(
      () =>
        h(
          CboxSupportSessionBanner,
          { className: 'my-banner' },
          { default: ({ actor }: CboxSupportSessionSlotProps) => `Acting as support agent ${actor?.sub ?? 'unknown'}` },
        ),
      { user: { ...member, actor: { sub: 'staff-9' } }, urls: {} },
    );

    const banner = wrapper.get('section[aria-label="Support session"]');
    expect(banner.attributes('class')).toBe('my-banner');
    expect(banner.text()).toBe('Acting as support agent staff-9');
    expect(banner.find('a').exists()).toBe(false);
  });
});

describe('CboxIdProvider narrows what it is handed', () => {
  it('keeps no credentials, only the actor subject and the organization id, name and role', () => {
    const fromIdJs = {
      id: 'user-1',
      organizationId: 'org-acme',
      organization: { id: 'org-acme', name: 'Acme Inc', role: 'admin', token: 'at_secret' },
      organizations: [{ id: 'org-acme', name: 'Acme Inc', secret: 'at_secret' }],
      actor: { sub: 'staff-9', actor: { sub: 'svc-1', actor: null }, reason: 'ticket 4411' },
      accessToken: 'at_secret',
      refreshToken: 'rt_secret',
      idToken: 'id_secret',
      claims: { sub: 'user-1', email: 'claims@secret' },
    } as unknown as CboxWidgetUser;

    const seen = probeUser(fromIdJs);

    expect(seen).toMatchObject({
      organization: { id: 'org-acme', name: 'Acme Inc', role: 'admin' },
      actor: { sub: 'staff-9' },
    });
    const serialized = JSON.stringify(seen);
    for (const leaked of ['at_secret', 'rt_secret', 'id_secret', 'claims@secret', 'svc-1', 'ticket 4411']) {
      expect(serialized).not.toContain(leaked);
    }
  });

  it('keeps an unreadable actor as an actor, so the banner still shows', () => {
    const seen = probeUser({ id: 'u', actor: { sub: 42 } } as unknown as CboxWidgetUser);

    expect(seen).toMatchObject({ actor: { sub: null } });
  });
});
