/**
 * Type-safe route definitions for Expo Router
 *
 * This eliminates the need for `router.push(... as any)` throughout the app
 * and provides autocomplete for route names.
 */

// Tab routes
export type TabRoute =
  | '/(tabs)'
  | '/(tabs)/index'
  | '/(tabs)/portfolio'
  | '/(tabs)/profile';

// Auth routes
export type AuthRoute = '/auth';

// Onboarding routes
export type OnboardingRoute = '/onboarding';

// Portfolio sub-routes
export type PortfolioRoute =
  | '/portfolio/add'
  | '/portfolio/import'
  | '/portfolio/scan'
  | '/portfolio/analysis'
  | '/portfolio/alerts'
  | '/portfolio/add-alert'
  | '/portfolio/loans'
  | '/portfolio/dividends'
  | '/portfolio/voice-coach'
  | '/portfolio/receipt-scan'
  | '/portfolio/ask-before-buy'
  | '/portfolio/agent-activity'
  | '/portfolio/opik-dashboard'
  | `/portfolio/${string}`; // Dynamic route for holding details

// Creator routes
export type CreatorRoute = '/creator';

// Modal routes
export type ModalRoute = '/modal';

// All app routes
export type AppRoute =
  | TabRoute
  | AuthRoute
  | OnboardingRoute
  | PortfolioRoute
  | CreatorRoute
  | ModalRoute;

/**
 * Helper type for dynamic routes with parameters
 */
export function portfolioDetailRoute(id: string): `/portfolio/${string}` {
  return `/portfolio/${id}`;
}

/**
 * Type guard to check if a string is a valid route
 */
export function isValidRoute(route: string): route is AppRoute {
  const staticRoutes: string[] = [
    '/(tabs)',
    '/(tabs)/index',
    '/(tabs)/portfolio',
    '/(tabs)/profile',
    '/auth',
    '/onboarding',
    '/portfolio/add',
    '/portfolio/import',
    '/portfolio/scan',
    '/portfolio/analysis',
    '/portfolio/alerts',
    '/portfolio/add-alert',
    '/portfolio/loans',
    '/portfolio/dividends',
    '/portfolio/voice-coach',
    '/portfolio/receipt-scan',
    '/portfolio/ask-before-buy',
    '/portfolio/agent-activity',
    '/portfolio/opik-dashboard',
    '/creator',
    '/modal',
  ];

  if (staticRoutes.includes(route)) return true;
  if (route.startsWith('/portfolio/') && route.split('/').length === 3) return true;

  return false;
}
