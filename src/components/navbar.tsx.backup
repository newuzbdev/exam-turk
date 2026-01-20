import { NavLink, useNavigate } from "react-router";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, User, LogOut, Coins } from "lucide-react";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BalanceTopUp from "@/components/payme/BalanceTopUp";
import AuthModal from "@/components/auth/AuthModal";
// removed unused paymeService import
import {
  NavigationMenu,

  NavigationMenuItem,

  NavigationMenuList,

} from "@/components/ui/navigation-menu";
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

const grammarLevels = [
  {
    title: "A1 Seviye",
    href: "/grammar/a1",
    description: "Temel Türkçe dilbilgisi ve günlük konuşma kalıpları.",
  },
  {
    title: "A2 Seviye",
    href: "/grammar/a2",
    description: "Basit cümle yapıları ve temel iletişim becerileri.",
  },
  {
    title: "B1 Seviye",
    href: "/grammar/b1",
    description: "Orta düzey dilbilgisi ve akıcı konuşma teknikleri.",
  },
  {
    title: "B2 Seviye",
    href: "/grammar/b2",
    description: "İleri düzey dilbilgisi ve akademik yazma becerileri.",
  },
  {
    title: "C1 Seviye",
    href: "/grammar/c1",
    description: "Profesyonel düzeyde Türkçe kullanımı ve edebi metinler.",
  },
];

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  // Get balance and coin from user object
  const balance = user?.balance || 0;
  const coin = user?.coin ?? 0;
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);

  // Function to refresh user data (including balance)
  const handleBalanceUpdate = async () => {
    await refreshUser();
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/", { replace: true });
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  return (
    <nav className="site-header bg-white/98 backdrop-blur-md border-b border-gray-100/60 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-14">
          <div
            className="flex items-center justify-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src="/logo11.svg"
              alt="TURKISHMOCK"
              className="h-10 sm:h-11 md:h-12 w-auto object-contain my-auto"
              onError={(e) => {
                console.error("Logo failed to load");
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          <div className="hidden lg:block">
            <div className="ml-4 sm:ml-6 lg:ml-10 flex items-baseline space-x-2 sm:space-x-4 lg:space-x-6">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                   
                   
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                 
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
           
           
              {/* <NavLink
                to="/results"
                className="text-gray-600 hover:text-red-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                Sonuçlar
              </NavLink> */}
            
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">  
            {/* Authentication buttons or user info */}
            {isAuthenticated && (
              <div className="hidden md:block">
                <BalanceTopUp 
                  currentBalance={balance} 
                  onBalanceUpdate={handleBalanceUpdate} 
                />
              </div>
            )}

            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center space-x-3">
                {/* Coin indicator */}
                <button
                  type="button"
                  onClick={() => setIsCoinModalOpen(true)}
                  className="flex items-center gap-2 text-gray-900 bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-2 rounded-lg hover:from-gray-100 hover:to-gray-200 shadow-sm hover:shadow transition-all duration-300 cursor-pointer border border-gray-200"
                >
                  <Coins className="h-4 w-4 text-gray-900" />
                  <span className="text-sm font-semibold">{coin}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 transition-all duration-300 rounded-lg px-2 pr-0"
                    >
                      <span className="text-gray-900 font-medium cursor-pointer">
                        {user.name}
                      </span>
                      <Avatar className="w-10 h-10 border-2 border-gray-200">
                        <AvatarImage
                          src={(user.avatarUrl || user.avatar)
                            ? ((user.avatarUrl || user.avatar)!.startsWith('http')
                                ? (user.avatarUrl || user.avatar)!
                                : `https://api.turkishmock.uz/${user.avatarUrl || user.avatar}`)
                            : undefined}
                          alt={user.name}
                        />
                        <AvatarFallback className="text-xs font-semibold text-red-700 bg-red-50">
                          {user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                    <DropdownMenuItem asChild>
                      <NavLink
                        to="/profile"
                        className="flex items-center w-full cursor-pointer"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profil
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogoutClick}
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Çıkış
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <nav className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setAuthModalMode("login");
                    setIsAuthModalOpen(true);
                  }}
                  className="text-sm font-medium text-gray-700 hover:text-red-600 transition-all duration-300 px-4 py-2"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode("register");
                    setIsAuthModalOpen(true);
                  }}
                  className="text-sm font-semibold bg-red-600 hover:bg-red-700 text-white py-2.5 px-6 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Kayıt Ol
                </button>
              </nav>
            )}

            {/* Mobile quick coin access */}
            {isAuthenticated && user && (
              <button
                type="button"
                onClick={() => setIsCoinModalOpen(true)}
                className="sm:hidden flex items-center gap-2 text-gray-900 bg-gradient-to-br from-gray-50 to-gray-100 px-3 py-2 rounded-lg hover:from-gray-100 hover:to-gray-200 shadow-sm hover:shadow transition-all duration-300 cursor-pointer border border-gray-200"
              >
                <Coins className="h-4 w-4 text-gray-900" />
                <span className="text-sm font-semibold">{coin}</span>
              </button>
            )}

            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer"
                  >
                    <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-white w-[80vw] sm:w-[60vw]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-3 mt-6">
                    {/* Mobile Authentication */}
                    {isAuthenticated && user ? (
                      <div className="px-3 py-2 border-b">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={(user.avatarUrl || user.avatar)
                                  ? ((user.avatarUrl || user.avatar)!.startsWith('http')
                                      ? (user.avatarUrl || user.avatar)!
                                  : `https://api.turkishmock.uz/${user.avatarUrl || user.avatar}`)
                                  : undefined}
                                alt={user.name}
                              />
                              <AvatarFallback className="text-xs font-semibold text-red-700">
                                {user.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-gray-900 font-medium truncate">{user.name}</span>
                            <span className="ml-auto flex items-center gap-1.5 text-gray-900 bg-gray-100 px-2 py-1 rounded-md ring-1 ring-gray-200">
                              <Coins className="h-4 w-4" />
                              <span className="text-xs font-semibold">{coin}</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => setIsCoinModalOpen(true)}
                              className="bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all"
                            >
                              Kredi Al
                            </Button>
                            <BalanceTopUp
                              currentBalance={balance}
                              onBalanceUpdate={handleBalanceUpdate}
                            />
                          </div>
                          <NavLink
                            to="/profile"
                            className="flex items-center w-full px-2 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <User className="h-4 w-4 mr-2" />
                            Profil
                          </NavLink>
                          <Button
                            variant="ghost"
                            onClick={handleLogoutClick}
                            className="w-full text-left justify-start text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Çıkış Yap
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex space-x-2 px-3 py-2">
                        <Button
                          variant="ghost"
                          className="flex-1 text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-all duration-300"
                          onClick={() => {
                            setAuthModalMode("login");
                            setIsAuthModalOpen(true);
                          }}
                        >
                          Giriş Yap
                        </Button>
                        <Button
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-300"
                          onClick={() => {
                            setAuthModalMode("register");
                            setIsAuthModalOpen(true);
                          }}
                        >
                          Kayıt Ol
                        </Button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {grammarLevels.map((level) => (
                        <NavLink
                          key={level.title}
                          to={level.href}
                          className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer block"
                        >
                          {level.title}
                        </NavLink>
                      ))}
                    </div>
                    <NavLink
                      to="/test"
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Test
                    </NavLink>
                    <NavLink
                      to="/lugat"
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Lügat
                    </NavLink>
                    <NavLink
                      to="/results"
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Sonuçlar
                    </NavLink>
                    <NavLink
                      to="/contact"
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      İletişim
                    </NavLink>
                    <NavLink
                      to="/price"
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Fiyatlar
                    </NavLink>
                    <div className="flex space-x-4 px-3 py-2">
                      <a
                        href="https://t.me/new_uzb_dev"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
                          alt="Telegram"
                          className="w-6 h-6 cursor-pointer"
                        />
                      </a>
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/3955/3955024.png"
                        alt="Instagram"
                        className="w-6 h-6 cursor-pointer"
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              Çıkış Yap
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Çıkış yapmak istediğinizden emin misiniz? Bu işlem sizi ana
              sayfaya yönlendirecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleLogoutCancel}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Çıkış Yap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Coin Purchase Modal */}
      <PaymeCheckoutModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        planName="Kredi Satın Al"
        planId="quick"
      />
      {/* Auth Modal */}
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        initialMode={authModalMode}
      />
    </nav>
  );
};
export default Navbar;
