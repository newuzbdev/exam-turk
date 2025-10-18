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
// removed unused paymeService import
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
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
    <nav className="site-header bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="text-red-600 font-bold text-2xl uppercase">TURKISHMOCK</div>
          </div>

          <div className="hidden lg:block">
            <div className="ml-4 sm:ml-6 lg:ml-10 flex items-baseline space-x-2 sm:space-x-4 lg:space-x-6">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-gray-600 hover:text-red-600">
                      Gramer
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 w-[300px] sm:w-[500px] gap-2 sm:gap-3 p-3 sm:p-4 bg-white">
                        {grammarLevels.map((level) => (
                          <li key={level.title}>
                            <NavigationMenuLink asChild>
                              <NavLink
                                to={level.href}
                                className="block select-none rounded-md p-2 sm:p-3 leading-none no-underline outline-none transition-colors hover:bg-red-50 focus:bg-red-50"
                              >
                                <div className="text-xs sm:text-sm font-medium leading-none text-gray-900 mb-1 sm:mb-2">
                                  {level.title}
                                </div>
                                <p className="text-xs sm:text-sm leading-snug text-gray-600 line-clamp-2">
                                  {level.description}
                                </p>
                              </NavLink>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavLink
                      to="/price"
                      className="text-gray-600 hover:text-red-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Fiyatlar
                    </NavLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              <NavLink
                to="/test"
                className="text-gray-600 hover:text-red-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                Test
              </NavLink>
              <NavLink
                to="/lugat"
                className="text-gray-600 hover:text-red-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                Lügat
              </NavLink>
              <NavLink
                to="/results"
                className="text-gray-600 hover:text-red-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                Sonuçlar
              </NavLink>
              <NavLink
                to="/contact"
                className="text-gray-600 hover:text-red-600 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                İletişim
              </NavLink>
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
                  className="flex items-center gap-1.5 text-gray-900 bg-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-300 shadow-sm cursor-pointer ring-1 ring-gray-300"
                >
                  <Coins className="h-4 w-4" />
                  <span className="text-sm font-semibold">{coin}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2 text-sm   cursor-pointer bg-white"
                    >
                       <span className="text-gray-900 font-medium cursor-pointer">
                        {user.name}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={(user.avatarUrl || user.avatar)
                            ? ((user.avatarUrl || user.avatar)!.startsWith('http')
                                ? (user.avatarUrl || user.avatar)!
                                : `https://api.turkcetest.uz/${user.avatarUrl || user.avatar}`)
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
                     
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border-none ">
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
              <div className="hidden sm:flex space-x-2">
                <NavLink to="/login">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-red-600"
                  >
                    Giriş Yap
                  </Button>
                </NavLink>
                <NavLink to="/signup">
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    Kayıt Ol
                  </Button>
                </NavLink>
              </div>
            )}

            {/* Mobile quick coin access */}
            {isAuthenticated && user && (
              <button
                type="button"
                onClick={() => setIsCoinModalOpen(true)}
                className="sm:hidden flex items-center gap-1.5 text-gray-900 bg-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-300 shadow-sm cursor-pointer ring-1 ring-gray-300"
              >
                <Coins className="h-4 w-4" />
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
                                      : `https://api.turkcetest.uz/${user.avatarUrl || user.avatar}`)
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
                          <Button
                            onClick={() => setIsCoinModalOpen(true)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                          >
                            Birim Satın Al
                          </Button>
                          <div className="rounded-lg ring-1 ring-gray-200 bg-white">
                            <div className="px-2 py-2">
                              <BalanceTopUp 
                                currentBalance={balance} 
                                onBalanceUpdate={handleBalanceUpdate} 
                              />
                            </div>
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
                        <NavLink to="/login" className="flex-1">
                          <Button
                            variant="ghost"
                            className="w-full text-gray-600 hover:text-red-600"
                          >
                            Giriş Yap
                          </Button>
                        </NavLink>
                        <NavLink to="/signup" className="flex-1">
                          <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                            Kayıt Ol
                          </Button>
                        </NavLink>
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
        planName="Birim Satın Al"
        planId="quick"
      />
    </nav>
  );
};
export default Navbar;
