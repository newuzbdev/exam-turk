import { NavLink, useNavigate } from "react-router";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, User, LogOut, Coins } from "lucide-react";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toApiUrl } from "@/config/runtime";
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

const navLinks = [
  { title: "Ana Sayfa", href: "/" },
  { title: "Testler", href: "/test" },
  { title: "Nasıl Çalışır", href: "/how-it-works" },
  { title: "Fiyatlar", href: "/price" },
];

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-red-50 text-red-600"
      : "text-gray-700 hover:bg-gray-50 hover:text-red-600"
  }`;

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const coin = user?.coin ?? 0;

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

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    setMobileMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <nav className="site-header sticky top-0 z-50 w-full border-b border-gray-100/70 bg-white/98 backdrop-blur-md">
      <div className="mx-auto h-14 w-full max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-2">
          <button
            type="button"
            className="flex shrink-0 items-center justify-center"
            onClick={() => navigate("/")}
            aria-label="Ana sayfaya dön"
          >
            <img
              src="/logo11.svg"
              alt="TURKISHMOCK"
              className="h-9 w-auto object-contain sm:h-10 md:h-11"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="hidden items-center gap-3 lg:flex">
                <button
                  type="button"
                  onClick={() => setIsCoinModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-2 text-gray-900 shadow-sm transition-all duration-300 hover:from-gray-100 hover:to-gray-200 hover:shadow"
                >
                  <Coins className="h-4 w-4 text-gray-900" />
                  <span className="text-sm font-semibold">{coin}</span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 rounded-lg px-2 pr-0 text-sm transition-all duration-300 hover:bg-gray-50"
                    >
                      <span className="max-w-[180px] truncate font-medium text-gray-900">{user.name}</span>
                      <Avatar className="h-10 w-10 border-2 border-gray-200">
                        <AvatarImage src={getAvatarSrc()} alt={user.name} />
                        <AvatarFallback className="bg-red-50 text-xs font-semibold text-red-700">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border border-gray-200 bg-white shadow-lg">
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
                  className="theme-important rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-red-700 hover:shadow-md"
                  onClick={() => navigate("/login")}
                >
                  Oturum Aç
                </Button>
              </div>
            )}

            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[86vw] max-w-[360px] bg-white">
                  <SheetHeader>
                    <SheetTitle>Menü</SheetTitle>
                  </SheetHeader>

                  <div className="mt-4 flex flex-col gap-3 px-2 pb-6">
                    {isAuthenticated && user && (
                      <div className="flex flex-col gap-2">
                        <SheetClose asChild>
                          <NavLink
                            to="/profile"
                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 transition-colors hover:bg-gray-100"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={getAvatarSrc()} alt={user.name} />
                                <AvatarFallback className="text-xs font-semibold text-red-700">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">Profil sayfasına git</p>
                              </div>
                            </div>
                          </NavLink>
                        </SheetClose>

                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              setIsCoinModalOpen(true);
                            }}
                            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <Coins className="h-3.5 w-3.5" />
                              {coin}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 pt-1">
                      {navLinks.map((item) => (
                        <SheetClose key={item.href} asChild>
                          <NavLink to={item.href} className={mobileLinkClass}>
                            {item.title}
                          </NavLink>
                        </SheetClose>
                      ))}

                      {isAuthenticated && (
                        <SheetClose asChild>
                          <NavLink to="/profile" className={mobileLinkClass}>
                            Profil
                          </NavLink>
                        </SheetClose>
                      )}
                    </div>

                    {!isAuthenticated && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          className="theme-important bg-red-600 text-white hover:bg-red-700"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate("/login");
                          }}
                        >
                          Oturum Aç
                        </Button>
                      </div>
                    )}

                    {isAuthenticated && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setShowLogoutDialog(true);
                        }}
                        className="mt-2 justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Çıkış Yap
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Çıkış Yap</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Çıkış yapmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm} className="bg-red-600 text-white hover:bg-red-700">
              Çıkış Yap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymeCheckoutModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        planName="Kredi Satın Al"
        planId="quick"
        onSuccess={handleCoinUpdate}
      />
    </nav>
  );
};

export default Navbar;
