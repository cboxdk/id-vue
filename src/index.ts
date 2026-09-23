export { CboxIdProvider, type CboxIdProviderProps } from './components/CboxIdProvider.js';
export {
  CboxSignInButton,
  CboxSignOutButton,
  CboxOrganizationBadge,
  CboxUserProfileCard,
  CboxUserButton,
  type CboxSignInButtonProps,
  type CboxSignOutButtonProps,
  type CboxOrganizationBadgeProps,
  type CboxUserButtonProps,
} from './components/widgets.js';
export {
  CboxOrganizationSwitcher,
  CboxSupportSessionBanner,
  type CboxOrganizationSwitcherProps,
  type CboxSupportSessionBannerProps,
  type CboxSupportSessionSlotProps,
} from './components/organization.js';
export {
  useOrganization,
  useSupportSession,
  type UseOrganizationResult,
  type UseSupportSessionResult,
} from './organization.js';
export { useCboxId, useCboxUser, CboxIdKey, type CboxIdContext } from './context.js';
export { ensureStyles, STYLE_ID, CSS } from './styles.js';
export type {
  CboxWidgetUser,
  CboxWidgetOrganization,
  CboxWidgetActiveOrganization,
  CboxWidgetActor,
  CboxWidgetUrls,
  CboxWidgetAppearance,
} from './types.js';
