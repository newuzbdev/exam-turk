import { NavLink } from "react-router";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useCurrentUser } from "@/config/query/user";

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

const loginWithGoogle = () => {
  window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
};

const Navbar = () => {
  const { data: user } = useCurrentUser();

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center">
            {/* <img src="/turk-test.png" alt="logo" className="h-14 w-auto" /> */}
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
            <div className="text-xs sm:text-sm hidden sm:block">
              <span className="text-gray-600">Bakiye: </span>
              <span className="font-semibold text-yellow-600">15U</span>
            </div>
            {user ? (
              "Loading..."
            ) : user ? (
              <div>Hello, {user.displayName}</div>
            ) : (
              <Button onClick={loginWithGoogle}>Login with Google</Button>
            )}

            <div className="hidden sm:flex space-x-2">
              <a
                href="https://t.me/new_uzb_dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png"
                  alt="Telegram"
                  className="w-6 h-6 sm:w-8 sm:h-8 cursor-pointer"
                />
              </a>
              <img
                src="https://cdn-icons-png.flaticon.com/512/3955/3955024.png"
                alt="Instagram"
                className="w-6 h-6 sm:w-8 sm:h-8 cursor-pointer"
              />
            </div>

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
    </nav>
  );
};
export default Navbar;
