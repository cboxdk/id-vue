import { computed, defineComponent, h, onMounted, provide, type PropType } from 'vue';
import { CboxIdKey } from '../context.js';
import { ensureStyles } from '../styles.js';
import type { CboxWidgetAppearance, CboxWidgetUrls, CboxWidgetUser } from '../types.js';

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
        user: props.user ?? null,
        urls: props.urls,
        appearance: props.appearance,
      })),
    );
    onMounted(ensureStyles);
    return () => (slots.default ? slots.default() : h('template'));
  },
});
