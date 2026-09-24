# Changelog

All notable changes to `@cboxdk/id-vue` are recorded here. Earlier releases are described
in their [GitHub releases](https://github.com/cboxdk/id-vue/releases).

## [0.3.0] - 2026-09-24

Organization selection and support sessions, at parity with `@cboxdk/id-react`. **Requires
`@cboxdk/id-js` 0.17 or later** on your server, which sends the `organization` parameter and
fills the `organization`, `organizations` and `actor` fields these widgets read, against a
Cbox ID instance that supports organization selection (laravel-id 1.19).

### Added

- `<CboxOrganizationSwitcher>`: the active organization and a menu of the person's
  organizations with a one-click switch (`urls.switchOrganization`), the hosted picker
  (`urls.selectOrganization`) and the hosted create step (`urls.createOrganization`) at its
  foot. Without the `organizations` list it is a single link to the hosted picker; with
  neither, it renders nothing. A session bound to no organization reads "Select
  organization" (`placeholder`) and marks nothing active.
- `useOrganization()`: the active organization, the person's membership tier in it
  (`org_role`), their organizations, `canSwitch`, and `switchUrl(id)` /
  `switchOrganization(id)`.
- `<CboxSupportSessionBanner>` and `useSupportSession()`: shown only while a member of staff
  is signed in as the user (the RFC 8693 `act` claim). Fail-closed: an actor id-js could not
  read still counts. `class-name` replaces the built-in styling; the default slot receives
  `{ actor, user }` for your own wording.
- `CboxWidgetUser.organization` (`{ id, name, role }`), `.actor` (`{ sub }`) and
  `.organizations`, shape-compatible with id-js 0.17's `CboxUser`; the exported types
  `CboxWidgetOrganization`, `CboxWidgetActiveOrganization` and `CboxWidgetActor`.
- `CboxWidgetUrls.switchOrganization`, `.selectOrganization` and `.createOrganization`.
- `@cboxdk/id-js` `^0.17.0` as an optional peer dependency. The widgets never import it; it
  states which version produces the fields they draw.

### Changed

- `<CboxIdProvider>` keeps only the fields a widget draws. Handed an id-js `CboxUser`, it
  used to inject the whole object — access, refresh and ID tokens and the full claim set —
  where every widget and Vue DevTools could read it. The actor is narrowed to its subject
  and the organization to its id, name and role.
- `<CboxOrganizationBadge>` shows the organization's name (from the list or the token's
  `org_name`) instead of its id, and falls back to the id only when no name is known.
- The control border is 40% of the text colour instead of 14%, which was about 1.2:1
  against the surface; WCAG 1.4.11 asks for 3:1 on the edge that identifies a control.

### Fixed

- The README's first example used `CboxWidgetUser` without importing it.
