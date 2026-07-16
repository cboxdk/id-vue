import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, type Component } from 'vue';
import {
  CboxIdProvider,
  CboxOrganizationBadge,
  CboxSignInButton,
  CboxUserButton,
  CboxUserProfileCard,
  type CboxWidgetUrls,
  type CboxWidgetUser,
} from '../src/index.js';

const user: CboxWidgetUser = {
  id: 'user-1',
  email: 'ada@acme.com',
  name: 'Ada Lovelace',
  organizationId: 'Acme Inc',
};

const urls: CboxWidgetUrls = {
  signIn: '/auth/sign-in',
  signOut: '/auth/sign-out',
  profile: '/account',
};

function harness(widget: Component, props: { user?: CboxWidgetUser | null; urls?: CboxWidgetUrls }) {
  const Host = defineComponent({
    render() {
      return h(CboxIdProvider, { user: props.user ?? null, urls: props.urls ?? {} }, () => h(widget));
    },
  });
  return mount(Host, { attachTo: document.body });
}

describe('CboxSignInButton', () => {
  it('links to the sign-in route', () => {
    const wrapper = harness(CboxSignInButton, { urls });
    const link = wrapper.get('a');
    expect(link.text()).toBe('Sign in');
    expect(link.attributes('href')).toBe('/auth/sign-in');
  });
});

describe('CboxUserButton', () => {
  it('falls back to a sign-in button when signed out', () => {
    const wrapper = harness(CboxUserButton, { user: null, urls });
    expect(wrapper.get('a').text()).toBe('Sign in');
  });

  it('opens a menu with profile and sign-out links when signed in', async () => {
    const wrapper = harness(CboxUserButton, { user, urls });
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);

    const trigger = wrapper.get('button');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    await trigger.trigger('click');

    expect(trigger.attributes('aria-expanded')).toBe('true');
    const items = wrapper.findAll('[role="menuitem"]');
    expect(items.map((i) => i.text())).toEqual(['Manage account', 'Sign out']);
    expect(items[0]!.attributes('href')).toBe('/account');
    expect(items[1]!.attributes('href')).toBe('/auth/sign-out');
    expect(wrapper.text()).toContain('ada@acme.com');
  });

  it('closes the menu on Escape', async () => {
    const wrapper = harness(CboxUserButton, { user, urls });
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('[role="menu"]').exists()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
  });
});

describe('CboxUserProfileCard', () => {
  it('shows name and email with a manage link', () => {
    const wrapper = harness(CboxUserProfileCard, { user, urls });
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.text()).toContain('ada@acme.com');
    expect(wrapper.get('a').attributes('href')).toBe('/account');
  });

  it('renders nothing when signed out', () => {
    const wrapper = harness(CboxUserProfileCard, { user: null, urls });
    expect(wrapper.find('.cbox-id-card').exists()).toBe(false);
  });
});

describe('CboxOrganizationBadge', () => {
  it('shows the organization id', () => {
    const wrapper = harness(CboxOrganizationBadge, { user, urls });
    expect(wrapper.text()).toContain('Acme Inc');
  });

  it('renders nothing without an organization', () => {
    const wrapper = harness(CboxOrganizationBadge, { user: { id: 'u', email: 'x@y.z' }, urls });
    expect(wrapper.find('.cbox-id-orgbadge').exists()).toBe(false);
  });
});
