import { NavLink, useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "./ui/button";
import { User, LogOut, Coins } from "lucide-react";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toApiUrl } from "@/config/runtime";
import { setPostLoginRedirect } from "@/utils/postLoginRedirect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { LogoCoffeeSurprise, useLogoEasterEgg } from "@/components/logo-easter-egg";
import { isSubscriptionBillingEnabled } from "@/config/billing";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const { registerLogoClick, isEasterEggVisible } = useLogoEasterEgg();

  const coin = user?.coin ?? 0;
  const displayName = String(user?.username || user?.userName || user?.name || "Kullanıcı");

  const getInitials = (fullName?: string) => {
    const value = String(fullName || "").trim();
    if (!value) return "U";

    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("");
  };

  const getAvatarSrc = () => {
    if (!user) return undefined;
    const avatar = user.avatarUrl || user.avatar;
    if (!avatar) return undefined;
    return toApiUrl(avatar);
  };

  const handleCoinUpdate = async () => {
    await refreshUser();
  };

  const navigateToLogin = () => {
    const currentPath =
      `${location.pathname}${location.search}${location.hash}` || "/";
    const redirectTo = currentPath === "/" ? "/app" : currentPath;
    setPostLoginRedirect(redirectTo);
    navigate("/login", {
      state: {
        mode: "login",
        redirectTo,
      },
    });
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/", { replace: true });
  };

  const handleLogoClick = () => {
    registerLogoClick();
    navigate(isAuthenticated ? "/app" : "/");
  };

  return (
    <nav className="site-header sticky top-0 z-50 w-full border-b border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)]/95 backdrop-blur-md">
      <div className="mx-auto h-14 w-full max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-2">
          <button
            type="button"
            className="flex shrink-0 items-center justify-center"
            onClick={handleLogoClick}
            aria-label="Ana sayfaya dön"
          >
            {isEasterEggVisible ? (
              <LogoCoffeeSurprise />
            ) : (
              <img
                src="/logo11.svg"
                alt="TURKISHMOCK"
                className="block h-9 w-auto object-contain sm:h-10 md:h-[44px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </button>

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="hidden items-center gap-3 lg:flex">
                {!isSubscriptionBillingEnabled && <button
                  type="button"
                  onClick={() => setIsCoinModalOpen(true)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[var(--tm-text-primary)] transition-colors hover:bg-[var(--tm-bg-hover)]"
                >
                  <Coins className="h-4 w-4 text-[var(--tm-text-secondary)]" strokeWidth={2.4} />
                  <span className="text-sm font-medium">{coin}</span>
                </button>}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 rounded-md px-2 pr-0 text-sm transition-colors hover:bg-[var(--tm-bg-hover)]"
                    >
                      <span className="max-w-[180px] truncate font-medium text-[var(--tm-text-primary)]">{displayName}</span>
                      <Avatar className="h-9 w-9 border border-[var(--tm-border-subtle)]">
                        <AvatarImage src={getAvatarSrc()} alt={displayName} />
                        <AvatarFallback className="bg-red-50 text-xs font-semibold text-red-700">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border border-[var(--tm-border-subtle)] bg-white shadow-[var(--tm-shadow-popover)]">
                    <DropdownMenuItem asChild>
                      <NavLink to="/profile" className="flex w-full items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profil
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowLogoutDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Çıkış
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden items-center gap-3 lg:flex">
                <Button
                  type="button"
                  className={`${tm.primaryButton} px-4 py-2 text-sm font-medium`}
                  onClick={navigateToLogin}
                >
                  Oturum Aç
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 lg:hidden">
              {isAuthenticated && user ? (
                <>
                  {!isSubscriptionBillingEnabled && <button
                    type="button"
                    onClick={() => setIsCoinModalOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--tm-text-primary)] hover:bg-[var(--tm-bg-hover)]"
                    aria-label="Kredi bakiyesi"
                  >
                    <Coins className="h-3.5 w-3.5 text-[var(--tm-text-secondary)]" strokeWidth={2.4} />
                    <span>{coin}</span>
                  </button>}

                  <button
                    type="button"
                    onClick={() => navigate("/app/profil")}
                    className="inline-flex items-center justify-center rounded-full"
                    aria-label="Profil sayfasına git"
                  >
                    <Avatar className="h-9 w-9 border border-[var(--tm-border-subtle)]">
                      <AvatarImage src={getAvatarSrc()} alt={displayName} />
                      <AvatarFallback className="bg-red-50 text-xs font-semibold text-red-700">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className={`${tm.primaryButton} h-9 px-3 text-xs font-medium`}
                  onClick={navigateToLogin}
                >
                  Oturum Aç
                </Button>
              )}
            </div>


          </div>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="border-[var(--tm-border-subtle)] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--tm-text-primary)]">Çıkış Yap</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--tm-text-secondary)]">
              Çıkış yapmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={tm.subtleButton}>
              İptal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm} className={tm.primaryButton}>
              Çıkış Yap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isSubscriptionBillingEnabled && <PaymeCheckoutModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        planName="Kredi Satın Al"
        planId="quick"
        onSuccess={handleCoinUpdate}
      />}
    </nav>
  );
};

export default Navbar;
