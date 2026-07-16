# @cboxdk/id-vue

Embeddable Vue 3 widgets for [Cbox ID](https://github.com/cboxdk/laravel-id) — a
drop-in **user button**, sign-in / sign-out buttons, a profile card and an
organization badge, wired to your Cbox ID hosted flows. Themeable, accessible, and
zero-config (the stylesheet is injected for you).

The login itself runs on your server (e.g. with
[`@cboxdk/id-js`](https://github.com/cboxdk/id-js) or your Laravel/Nuxt backend);
these widgets render the signed-in user it produces. For Nuxt, see
[`@cboxdk/id-nuxt`](https://github.com/cboxdk/id-nuxt).

## Install

```bash
npm install @cboxdk/id-vue
```

## Use

Wrap your app once with the user your server resolved and the flow URLs:

```vue
<script setup lang="ts">
import { CboxIdProvider, CboxUserButton } from '@cboxdk/id-vue';

const props = defineProps<{ user: CboxWidgetUser | null }>();
const urls = { signIn: '/auth/sign-in', signOut: '/auth/sign-out', profile: '/account' };
</script>

<template>
  <CboxIdProvider :user="props.user" :urls="urls">
    <header>
      <CboxUserButton />
    </header>
    <slot />
  </CboxIdProvider>
</template>
```

`<CboxUserButton>` shows the user's avatar and opens a menu with **Manage account**
(hosted profile management) and **Sign out**; when signed out it renders a sign-in
button. It's keyboard- and screen-reader-accessible and closes on outside click or
Escape.

## Components & composables

| Component | Renders |
|---|---|
| `<CboxUserButton>` | Avatar + account menu; a sign-in button when signed out. |
| `<CboxSignInButton>` / `<CboxSignOutButton>` | Standalone flow buttons. |
| `<CboxUserProfileCard>` | Avatar, name, email, manage-account link. |
| `<CboxOrganizationBadge>` | The user's current organization. |

Composables: `useCboxUser()` and `useCboxId()` (both reactive).

## Theming

```vue
<CboxIdProvider :user="user" :urls="urls" :appearance="{ accent: '#0ea5e9', radius: '12px' }">
```

Or override the `--cbox-id-*` CSS variables directly.

## Scope

Presentational widgets over Cbox ID's **hosted** flows. Password, MFA, passkeys and
sessions are managed on the Cbox ID instance's account page (where `urls.profile`
points); the widgets route users there rather than reimplementing it.

## License

MIT © Cbox.
