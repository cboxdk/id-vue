# @cboxdk/id-vue

Embeddable Vue 3 widgets for [Cbox ID](https://github.com/cboxdk/laravel-id) — a
drop-in **user button**, sign-in / sign-out buttons, a profile card, an
organization badge and switcher, and a support-session banner, wired to your Cbox ID
hosted flows. Themeable, accessible, and
zero-config (the stylesheet is injected for you).

The login itself runs on your server (e.g. with
[`@cboxdk/id-js`](https://github.com/cboxdk/id-js) or your Laravel/Nuxt backend);
these widgets render the signed-in user it produces. For Nuxt, see
[`@cboxdk/id-nuxt`](https://github.com/cboxdk/id-nuxt).

## Install

> **Where do `issuer`, `clientId` and `redirectUri` come from?**
> Register an application in your environment console — see
> [Integrate your app](https://github.com/cboxdk/cbox-id/blob/main/docs/getting-started/integrate-your-app.md).

```bash
npm install @cboxdk/id-vue
```

## Use

Wrap your app once with the user your server resolved and the flow URLs:

```vue
<script setup lang="ts">
import { CboxIdProvider, CboxUserButton, type CboxWidgetUser } from '@cboxdk/id-vue';

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
| `<CboxOrganizationBadge>` | The name of the organization the session is bound to. |
| `<CboxOrganizationSwitcher>` | The active organization, with a menu to switch to another. |
| `<CboxSupportSessionBanner>` | A banner shown only while a member of staff is signed in as the user. |

Composables: `useCboxUser()` (a `ComputedRef<CboxWidgetUser | null>`), `useCboxId()` (a
`ComputedRef` of the full context — user, urls, appearance), `useOrganization()` and
`useSupportSession()`. All throw when used outside a `<CboxIdProvider>`.

The provider keeps only the fields a widget draws. `CboxWidgetUser` is shape-compatible
with id-js's `CboxUser`, which also carries the access, refresh and ID tokens; pass the
whole thing and those never reach the widgets or Vue DevTools. Still: do not serialize a
`CboxUser` into the page yourself (an SSR payload, a `useState`) — send the fields below.

Every component's props type is exported (`CboxIdProviderProps`,
`CboxSignInButtonProps`, `CboxSignOutButtonProps`, `CboxUserButtonProps`,
`CboxOrganizationBadgeProps`, `CboxOrganizationSwitcherProps`,
`CboxSupportSessionBannerProps`), alongside `CboxWidgetUser`, `CboxWidgetOrganization`,
`CboxWidgetActiveOrganization`, `CboxWidgetActor`, `CboxWidgetUrls` and
`CboxWidgetAppearance`. Buttons take their label from a prop **or** a default slot —
`<CboxSignInButton>Log ind</CboxSignInButton>`.

Using SSR without the provider component (e.g. a custom integration)? `ensureStyles()`
injects the stylesheet client-side, and `STYLE_ID` / `CSS` are exported if you'd
rather render the `<style>` yourself. `@cboxdk/id-nuxt` uses these to wire the widgets
app-wide for you.

## Organizations

> **Requires `@cboxdk/id-js` 0.17 or later** on your server, and a Cbox ID instance that
> supports organization selection (laravel-id 1.19). id-js 0.17 is what sends the
> `organization` parameter and fills `organization`, `organizations` and `actor` on the
> user. It is declared as an optional peer dependency (`^0.17.0`): these widgets never
> import it, but the fields they draw come from it. On Nuxt,
> [`@cboxdk/id-nuxt`](https://github.com/cboxdk/id-nuxt) wires all of this for you.

Switching organization is a new sign-in bound to the other organization. Give the switcher
a route in your app that starts one, and the person's organizations:

```vue
<script setup lang="ts">
import {
  CboxIdProvider,
  CboxOrganizationSwitcher,
  CboxSupportSessionBanner,
  CboxUserButton,
  type CboxWidgetUser,
} from '@cboxdk/id-vue';

// `user` is what your server resolved with id-js — send only these fields to the page.
const props = defineProps<{ user: CboxWidgetUser | null }>();
const urls = {
  signOut: '/auth/sign-out',
  switchOrganization: (id: string) => `/auth/switch-organization?org=${encodeURIComponent(id)}`,
  selectOrganization: '/auth/select-organization', // optional: the hosted picker
  createOrganization: '/auth/create-organization', // optional: the hosted "create a team" step
};
</script>

<template>
  <CboxIdProvider :user="props.user" :urls="urls">
    <CboxSupportSessionBanner />
    <header><CboxOrganizationSwitcher /> <CboxUserButton /></header>
    <slot />
  </CboxIdProvider>
</template>
```

The user fields the widgets read, all produced by id-js 0.17's `CboxUser`:

```ts
{
  id, email, name, organizationId,
  organization,  // { id, name, role } — the tier comes from the org_role claim
  organizations, // needs the `organizations` scope, see below
  actor,         // set in a support session
}
```

Each route is a one-liner on your server with id-js: `switchOrganization(id)` (sends
`organization=<id>`), and `createAuthorizationRequest({ prompt: 'select_organization' })` /
`({ prompt: 'create_organization' })`. Cbox ID holds the person's session, so a switch
normally comes straight back without a sign-in form. id-js verifies at the callback that the
tokens are for the organization asked for; a person who is not an active member of it comes
back with `error=access_denied`.

**Where the list comes from.** `user.organizations` is filled from UserInfo only when the
sign-in requested the `organizations` scope — it discloses every organization the person is
in, so a plain `profile` sign-in does not get it. Without the list, the switcher is a single
link to `urls.selectOrganization` (the hosted picker still knows every membership); without
that too, it renders nothing. A session bound to no organization reads "Select
organization" rather than naming the first one in the list as current.

### `useOrganization()`

The headless half of the switcher, for building your own. Every value is a `ComputedRef`:

```ts
const { organization, role, organizations, canSwitch, switchOrganization } = useOrganization();

organization.value; // { id, name, role, imageUrl? } | null — the organization the session is bound to
role.value;         // 'owner' | 'admin' | 'developer' | 'member' | 'viewer' | null (org_role)
switchOrganization('org_2x…'); // navigates to urls.switchOrganization(id)
```

`role` is the person's tier in the **organization** — who may invite, bill or delete it.
What they may do in your app is `roles` / `permissions`, which your server reads from the
token.

### Support sessions

A member of staff can be signed in as one of your users for a limited time, with a recorded
reason — the tokens carry the RFC 8693 `act` claim, which id-js exposes as `user.actor`.
Put the banner at the top of your layout; it renders nothing in an ordinary session:

```vue
<CboxSupportSessionBanner />
<!-- "Support session. You are signed in as Ada Lovelace. Everything you do here is audited."
     plus an "End support session" link to urls.signOut -->
```

Pass `class-name` to drop the built-in styling (the element then carries only your class),
and a default slot to word it yourself:

```vue
<CboxSupportSessionBanner class-name="my-banner" v-slot="{ actor, user }">
  Acting as {{ user?.email }} (agent {{ actor?.sub ?? 'unknown' }})
</CboxSupportSessionBanner>
```

`useSupportSession()` returns the same `{ active, actor, user }` (as `ComputedRef`s) for
hiding what a helper should never do on somebody's behalf. Both are fail-closed: an `act`
claim id-js could not read (`actor.sub === null`) still counts as a support session.

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
