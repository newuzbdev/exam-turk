import {useStudentLessonsEnabled} from "@/config/studentFeatures";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { tm } from "@/components/tm";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useStudentOnboarding } from "@/pages/dashboard/onboarding-api";
import {
  isStudentAppNavigationActive,
  getStudentAppNavigation,
} from "./student-app-navigation";
import { StudentProfileMenu } from "./student-profile-menu";
import { FocusTimerPanel } from "./focus-timer-panel";
import { LogoCoffeeSurprise, useLogoEasterEgg } from "@/components/logo-easter-egg";
import {
  isReadingPracticeSessionPath,
  PRACTICE_PRESENTATION_EVENT,
  requestPracticeNavigation,
} from "@/pages/reading-practice/practice-presentation";

function interceptPracticeNavigation(
  event: ReactMouseEvent<HTMLElement>,
  pathname: string,
) {
  if (!isReadingPracticeSessionPath(pathname)) return;
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return;
  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;
  event.preventDefault();
  requestPracticeNavigation(
    `${destination.pathname}${destination.search}${destination.hash}`,
  );
}

export default function StudentAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const onboarding = useStudentOnboarding();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [focusSidebarDock, setFocusSidebarDock] = useState<HTMLDivElement | null>(null);
  const [focusMobileDock, setFocusMobileDock] = useState<HTMLDivElement | null>(null);
  const [practiceFocused, setPracticeFocused] = useState(() =>
    isReadingPracticeSessionPath(location.pathname),
  );
  const { registerLogoClick, isEasterEggVisible } = useLogoEasterEgg();

  useEffect(() => {
    const openFocusPanel = () => setFocusOpen(true);
    window.addEventListener("tm:open-focus", openFocusPanel);
    return () => window.removeEventListener("tm:open-focus", openFocusPanel);
  }, []);

  useLayoutEffect(() => {
    setPracticeFocused(isReadingPracticeSessionPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    const handlePracticePresentation = (event: Event) => {
      if (!isReadingPracticeSessionPath(location.pathname)) return;
      setPracticeFocused(
        Boolean((event as CustomEvent<{ focused?: boolean }>).detail?.focused),
      );
    };

    window.addEventListener(
      PRACTICE_PRESENTATION_EVENT,
      handlePracticePresentation,
    );
    return () =>
      window.removeEventListener(
        PRACTICE_PRESENTATION_EVENT,
        handlePracticePresentation,
      );
  }, [location.pathname]);

  const confirmLogout = () => {
    logout();
    setLogoutOpen(false);
    navigate("/", { replace: true });
  };

  const handleLogoClick = () => {
    registerLogoClick();
    if (isReadingPracticeSessionPath(location.pathname)) {
      requestPracticeNavigation("/app");
      return;
    }
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-[var(--tm-bg-app)] text-[var(--tm-text-primary)]">
      <aside
        onClickCapture={(event) =>
          interceptPracticeNavigation(event, location.pathname)
        }
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--tm-border-subtle)] bg-[var(--tm-bg-sidebar)] transition-[width] duration-200 lg:flex",
          practiceFocused && "lg:!hidden",
          sidebarCollapsed ? "w-[72px]" : "w-60",
        )}
      >
        <StudentAppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          onLogoClick={handleLogoClick}
          profileMenu={
            <StudentProfileMenu
              user={user}
              profile={onboarding.data}
              compact={sidebarCollapsed}
              onLogout={() => setLogoutOpen(true)}
            />
          }
          onFocusDockRef={setFocusSidebarDock}
          showLogoSurprise={isEasterEggVisible}
        />
      </aside>

      <header className={cn(
        "sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--tm-border-subtle)] bg-white/95 px-4 backdrop-blur-md lg:hidden",
        practiceFocused && "hidden",
      )}>
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center"
          aria-label="Dashboard'a git"
        >
          {isEasterEggVisible ? (
            <LogoCoffeeSurprise className="h-9" />
          ) : (
            <img
              src="/logo11.svg"
              alt="TURKISHMOCK"
              className="h-9 w-auto object-contain"
            />
          )}
        </button>

        <div className="flex items-center gap-1">
          <div ref={setFocusMobileDock} />
          <StudentProfileMenu
            user={user}
            profile={onboarding.data}
            compact
            mobile
            onLogout={() => setLogoutOpen(true)}
          />
        </div>
      </header>

      <div
        className={cn(
          "min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] transition-[padding] duration-200 lg:pb-0",
          practiceFocused
            ? "!pb-0 lg:!pl-0"
            : sidebarCollapsed
              ? "lg:pl-[72px]"
              : "lg:pl-60",
        )}
      >
        <main className="min-h-[calc(100dvh-3.5rem)] min-w-0 lg:min-h-screen">
          <Outlet />
        </main>
      </div>

      {!practiceFocused ? <StudentAppBottomNavigation /> : null}
      <FocusTimerPanel
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        onOpen={() => setFocusOpen(true)}
        docks={{ sidebar: focusSidebarDock, mobile: focusMobileDock }}
        collapsed={sidebarCollapsed}
      />
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="border-[var(--tm-border-subtle)] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Çıkış yap</AlertDialogTitle>
            <AlertDialogDescription>
              Öğrenci çalışma alanından çıkmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={tm.subtleButton}>
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className={tm.primaryButton}
            >
              Çıkış yap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StudentAppSidebar({
  collapsed = false,
  onToggleCollapse,
  onLogoClick,
  profileMenu,
  onFocusDockRef,
  showLogoSurprise,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogoClick: () => void;
  profileMenu: ReactNode;
  onFocusDockRef: (element: HTMLDivElement | null) => void;
  showLogoSurprise: boolean;
}) {
  const lessons=useStudentLessonsEnabled();
  const location = useLocation();
  const content = (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <button
          type="button"
          onClick={collapsed ? onToggleCollapse : onLogoClick}
          className={cn(
            "flex min-w-0 items-center rounded-md transition hover:bg-[var(--tm-bg-hover)]",
            collapsed && "group relative h-10 w-10 shrink-0 cursor-e-resize justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-text-secondary)]",
          )}
          aria-label={collapsed ? "Dashboard panelini aç" : "Dashboard'a git"}
          aria-expanded={collapsed ? false : undefined}
        >
          {collapsed ? (
            <>
              <span aria-hidden="true" className="text-[18px] font-black leading-none tracking-[-0.06em] text-[var(--tm-accent)] group-hover:opacity-0 group-focus-visible:opacity-0">
                TM
              </span>
              <PanelLeftOpen aria-hidden="true" className="absolute h-[18px] w-[18px] text-[var(--tm-text-secondary)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" strokeWidth={2.1} />
              <span aria-hidden="true" className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-neutral-900 px-3 py-2 text-sm font-medium text-white group-hover:visible group-focus-visible:visible">
                Kenar çubuğunu aç
              </span>
            </>
          ) : (
            showLogoSurprise ? (
              <LogoCoffeeSurprise />
            ) : (
              <img
                src="/logo11.svg"
                alt="TURKISHMOCK"
                className="h-10 w-auto object-contain"
              />
            )
          )}
        </button>
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group relative inline-flex h-8 w-8 shrink-0 cursor-w-resize items-center justify-center rounded-md text-[var(--tm-text-secondary)] transition hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]"
            aria-label="Dashboard panelini kapat"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={2.1} />
            <span aria-hidden="true" className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-neutral-900 px-3 py-2 text-sm font-medium text-white group-hover:visible group-focus-visible:visible">
              Kenar çubuğunu kapat
            </span>
          </button>
        ) : null}
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto py-3",
          collapsed ? "px-2" : "px-2",
        )}
        aria-label="Öğrenci menüsü"
      >
        <div className="space-y-1">
          {getStudentAppNavigation(lessons.enabled).map((item) => {
            const Icon = item.icon;
            const active = isStudentAppNavigationActive(
              location.pathname,
              item.to,
            );

            if (item.disabled) {
              return (
                <button
                  key={item.to}
                  type="button"
                  disabled
                  className={cn(
                    "flex h-10 w-full cursor-not-allowed items-center gap-3 rounded-md text-left text-sm text-[var(--tm-text-tertiary)]",
                    collapsed ? "justify-center px-0" : "px-3",
                  )}
                  aria-disabled="true"
                  aria-label={collapsed ? [item.label, item.badge].filter(Boolean).join(" · ") : undefined}
                  title={collapsed ? [item.label, item.badge].filter(Boolean).join(" · ") : undefined}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
                  {!collapsed ? (
                    <span className="min-w-0 flex-1">{item.label}</span>
                  ) : null}
                  {item.badge && !collapsed ? (
                    <span className="text-[11px] font-medium">{item.badge}</span>
                  ) : null}
                </button>
              );
            }

            const link = (
              <NavLink
                to={item.to}
                end={item.to === "/app"}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-[var(--tm-bg-active)] text-[var(--tm-text-primary)]"
                    : "text-[var(--tm-text-secondary)] hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]",
                )}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            );

            return <div key={item.to}>{link}</div>;
          })}
          <div ref={onFocusDockRef} />
        </div>
      </nav>

      <div className="flex shrink-0 justify-center border-t border-[var(--tm-border-subtle)] p-3">
        {profileMenu}
      </div>
    </div>
  );

  return content;
}

function StudentAppBottomNavigation() {
  const lessons=useStudentLessonsEnabled();
  const location = useLocation();

  return (
    <nav
      onClickCapture={(event) =>
        interceptPracticeNavigation(event, location.pathname)
      }
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--tm-border-subtle)] bg-white/95 backdrop-blur-md lg:hidden"
      aria-label="Mobil öğrenci menüsü"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 grid-cols-6">
        {getStudentAppNavigation(lessons.enabled).map((item) => {
          const Icon = item.icon;
          const active = isStudentAppNavigationActive(
            location.pathname,
            item.to,
          );

          if (item.disabled) {
            return (
              <button
                key={item.to}
                type="button"
                disabled
                aria-disabled="true"
                className="flex min-w-0 cursor-not-allowed flex-col items-center justify-center gap-0.5 border-t-2 border-transparent px-1 text-[10px] text-[var(--tm-text-tertiary)] sm:text-[11px]"
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
                <span className="max-w-full text-center leading-3">{item.mobileLabel || item.label}</span>
                {item.badge && <span className="text-[9px] leading-3">{item.badge}</span>}
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 border-t-2 px-1 text-[10px] font-medium transition-colors sm:text-[11px]",
                active
                  ? "border-[var(--tm-accent)] text-[var(--tm-accent)]"
                  : "border-transparent text-[var(--tm-text-secondary)] hover:bg-[var(--tm-bg-hover)] hover:text-[var(--tm-text-primary)]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
              <span className="max-w-full text-center leading-3">
                {item.mobileLabel || item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
