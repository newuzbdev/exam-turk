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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

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
  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <NavLink to="/" className="text-3xl font-bold text-red-600">
              TürkTest
            </NavLink>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-gray-600 hover:text-red-600">
                      Gramer
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid grid-cols-2 w-[500px] gap-3 p-4 bg-white">
                        {grammarLevels.map((level) => (
                          <li key={level.title}>
                            <NavigationMenuLink asChild>
                              <NavLink
                                to={level.href}
                                className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-red-50 focus:bg-red-50"
                              >
                                <div className="text-sm font-medium leading-none text-gray-900 mb-2">
                                  {level.title}
                                </div>
                                <p className="text-sm leading-snug text-gray-600 line-clamp-2">
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
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Fiyatlar
                    </NavLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
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
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-600">Bakiye: </span>
              <span className="font-semibold text-yellow-600">15U</span>
            </div>

            <NavLink
              to="/profile"
              className="flex items-center space-x-2 cursor-pointer"
            >
              <Avatar className="h-10 w-10 rounded-full">
                <AvatarImage src="/placeholder.svg?height=32&width=32" />
                <AvatarFallback>
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=JO"
                    alt="Random Avatar"
                  />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">
                JAXONGIRMIRZO OCHILOV
              </span>
            </NavLink>

            <div className="flex space-x-2">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Telegram_2019_Logo.svg/512px-Telegram_2019_Logo.svg.png"
                alt="Telegram"
                width="24"
                height="24"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg"
                alt="Instagram"
                width="24"
                height="24"
              />
            </div>
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-white">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-4 mt-6">
                    <NavLink
                      to="/grammar"
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Gramer
                    </NavLink>
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
                      to="/pricing"
                      className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                    >
                      Fiyatlar
                    </NavLink>
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
