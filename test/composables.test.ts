import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import {
  CboxIdProvider,
  STYLE_ID,
  ensureStyles,
  useCboxId,
  useCboxUser,
  type CboxWidgetUser,
} from '../src/index.js';

const user: CboxWidgetUser = { id: 'user-1', email: 'ada@acme.com', name: 'Ada Lovelace' };

describe('useCboxId / useCboxUser', () => {
  it('expose the provided context reactively', async () => {
    const current = ref<CboxWidgetUser | null>(null);

    const Probe = defineComponent({
      setup() {
        const ctx = useCboxId();
        const u = useCboxUser();
        return () =>
          h('div', [
            h('span', { class: 'sign-in' }, ctx.value.urls.signIn ?? ''),
            h('span', { class: 'name' }, u.value?.name ?? 'anon'),
          ]);
      },
    });

    const Host = defineComponent({
      setup() {
        return () =>
          h(CboxIdProvider, { user: current.value, urls: { signIn: '/in' } }, () => h(Probe));
      },
    });

    const wrapper = mount(Host);
    expect(wrapper.get('.sign-in').text()).toBe('/in');
    expect(wrapper.get('.name').text()).toBe('anon');

    current.value = user;
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.name').text()).toBe('Ada Lovelace');
  });

  it('useCboxId throws outside a provider', () => {
    const Orphan = defineComponent({
      setup() {
        useCboxId();
        return () => h('div');
      },
    });
    expect(() => mount(Orphan)).toThrow(/CboxIdProvider/);
  });
});

describe('ensureStyles', () => {
  it('injects the widget stylesheet once', () => {
    document.getElementById(STYLE_ID)?.remove();
    ensureStyles();
    ensureStyles();
    expect(document.querySelectorAll(`#${STYLE_ID}`)).toHaveLength(1);
  });
});
