// =============================================================================
// VANTA OS — App Shell (Section 5.1, Section 24, Section 25, Section 49)
// Wraps every authenticated /app/* route. Provides:
//   - Polaris AppProvider with theme + locale sync (Section 24)
//   - Top nav with logo, navigation, notification bell (Section 78)
//   - Command palette trigger (Section 25)
//   - Toast provider (Section 49)
//   - Feedback widget (Section 82)
//   - App Bridge integration (Section 5.1)
// =============================================================================

import { useState } from "react";
import { Link, NavLink, Outlet, useLoaderData, useNavigate, type LoaderFunctionArgs } from "@remix-run/react";
import { json, type HeadersArgs } from "@remix-run/node";
import { AppProvider, Frame, Navigation, TopBar, Text } from "@shopify/polaris";
import { HomeIcon, ChatIcon, ClockIcon, SettingsIcon, NotificationIcon, QuestionCircleIcon, CashDollarIcon, StarFilledIcon, ShieldCheckMarkIcon } from "@shopify/polaris-icons";
import { PolarisProvider } from "~/components/PolarisProvider";
import { ToastProvider } from "~/components/ui/Toaster";
import { CommandPalette } from "~/components/CommandPalette";
import { NotificationBell } from "~/components/NotificationBell";
import { FeedbackWidget } from "~/components/FeedbackWidget";
import { useLogoUrl } from "~/hooks/useTheme";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { getWhitelabelConfig } from "~/lib/whitelabel.config";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { cn } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  // FIX: Do NOT wrap in try/catch. shopify.authenticate.admin() throws
  // a Response (redirect) when the user is not authenticated. If we catch
  // that Response and do our own redirect, we break the embedded auth flow
  // and the app shows a blank screen.
  //
  // The correct pattern: let the Response propagate. Remix handles it
  // automatically and performs the correct OAuth redirect.
  const ctx = await requireAdmin(args);
  const wl = getWhitelabelConfig();
  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage as Locale,
    completedOnboarding: ctx.shop.completedOnboarding,
    killSwitchEnabled: ctx.shop.killSwitchEnabled,
    whitelabelAppName: wl.appName,
    lightLogoUrl: wl.logoUrl,
    darkLogoUrl: wl.logoDarkUrl,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function AppShellLayout() {
  const data = useLoaderData<typeof loader>();
  const locale = (data?.locale ?? "en") as Locale;
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { t } = useTranslation(locale);
  const logoUrl = useLogoUrl(data?.lightLogoUrl ?? "/icons/vanta-logo-light.svg", data?.darkLogoUrl ?? "/icons/vanta-logo-dark.svg");

  return (
    <PolarisProvider locale={locale}>
      <AppProvider
        i18n={{
          Polaris: {
            Frame: {
              skipToContent: "Skip to content",
              navigationLabel: "Navigation",
            },
          },
        }}
      >
        <ToastProvider>
          <Frame
            topBar={
              <TopBar
                showNavigationToggle
                userMenu={
                  <div className="flex items-center gap-2">
                    <NotificationBell locale={locale} />
                  </div>
                }
                secondaryMenu={
                  <Link to="/app/canvas" className="flex items-center gap-2">
                    <img src={logoUrl} alt={data?.whitelabelAppName ?? "VANTA OS"} className="h-7" />
                  </Link>
                }
              />
            }
            navigation={
              <Navigation location="/">
                <Navigation.Section
                  items={[
                    {
                      label: t("nav.dashboard"),
                      icon: HomeIcon,
                      url: "/app",
                    },
                    {
                      label: t("nav.canvas"),
                      icon: ChatIcon,
                      url: "/app/canvas",
                    },
                    {
                      label: "Future Chat",
                      icon: ChatIcon,
                      url: "/app/chat",
                    },
                    {
                      label: t("nav.history"),
                      icon: ClockIcon,
                      url: "/app/history",
                    },
                    {
                      label: t("nav.automations"),
                      icon: StarFilledIcon,
                      url: "/app/automations",
                    },
                    {
                      label: t("nav.guardian"),
                      icon: ShieldCheckMarkIcon,
                      url: "/app/guardian",
                    },
                    {
                      label: "Predictive AI",
                      icon: StarFilledIcon,
                      url: "/app/predictive",
                    },
                    {
                      label: "Autonomous Agents",
                      icon: StarFilledIcon,
                      url: "/app/agents",
                    },
                    {
                      label: "Goals & Plans",
                      icon: StarFilledIcon,
                      url: "/app/goals",
                    },
                    {
                      label: "Autonomous Ops",
                      icon: StarFilledIcon,
                      url: "/app/autonomous",
                    },
                    {
                      label: "Connected Accounts",
                      icon: StarFilledIcon,
                      url: "/app/connected-accounts",
                    },
                    {
                      label: "Browser Agent",
                      icon: StarFilledIcon,
                      url: "/app/browser-agent",
                    },
                  ]}
                />
                <Navigation.Section
                  separator
                  title="Account"
                  items={[
                    {
                      label: t("nav.settings"),
                      icon: SettingsIcon,
                      url: "/app/settings",
                    },
                    {
                      label: t("nav.billing"),
                      icon: CashDollarIcon,
                      url: "/app/billing",
                    },
                    {
                      label: t("nav.data"),
                      icon: NotificationIcon,
                      url: "/app/data-controls",
                    },
                    {
                      label: t("nav.help"),
                      icon: QuestionCircleIcon,
                      url: "/app/help",
                    },
                    {
                      label: "Reviewer Access",
                      icon: QuestionCircleIcon,
                      url: "/app/test-credentials",
                    },
                  ]}
                />
              </Navigation>
            }
          >
            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
              <Outlet />
            </div>
            <FeedbackWidget locale={locale} />
            <CommandPalette locale={locale} />
          </Frame>
        </ToastProvider>
      </AppProvider>
    </PolarisProvider>
  );
}

/** Mobile-friendly bottom nav for small screens (Section 51). */
export function MobileTabBar({ locale }: { locale: Locale }) {
  const { t } = useTranslation(locale);
  const navigate = useNavigate();
  const items = [
    { to: "/app", label: t("nav.dashboard"), icon: HomeIcon },
    { to: "/app/canvas", label: t("nav.canvas"), icon: ChatIcon },
    { to: "/app/history", label: t("nav.history"), icon: ClockIcon },
    { to: "/app/settings", label: t("nav.settings"), icon: SettingsIcon },
  ];
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 flex bg-white dark:bg-vanta-900 border-t border-vanta-border"
      aria-label="Mobile navigation"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px]",
              isActive ? "text-vanta-600 dark:text-vanta-300" : "text-vanta-muted",
            )
          }
        >
          <Text as="span" variant="bodySm">
            {item.label}
          </Text>
        </NavLink>
      ))}
    </nav>
  );
}
