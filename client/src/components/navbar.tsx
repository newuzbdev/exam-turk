import { NavLink } from "react-router";
import { Button } from "./ui/button";

const Navbar = () => {
  return (
    <div>
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <NavLink to="/" className="text-3xl font-bold text-red-600">
                TürkTest
              </NavLink>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-10">
                <div className="relative group">
                  <NavLink
                    to="/grammar"
                    className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Gramer
                  </NavLink>
                  <div className="absolute hidden group-hover:block w-48 bg-white shadow-lg rounded-md mt-2">
                    <NavLink
                      to="/grammar/a1"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50"
                    >
                      A1 Seviye
                    </NavLink>
                    <NavLink
                      to="/grammar/a2"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50"
                    >
                      A2 Seviye
                    </NavLink>
                    <NavLink
                      to="/grammar/b1"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50"
                    >
                      B1 Seviye
                    </NavLink>
                    <NavLink
                      to="/grammar/b2"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50"
                    >
                      B2 Seviye
                    </NavLink>
                    <NavLink
                      to="/grammar/c1"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50"
                    >
                      C1 Seviye
                    </NavLink>
                  </div>
                </div>
                <NavLink
                  to="/test"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Test
                </NavLink>
                <NavLink
                  to="/lugat"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Lügat
                </NavLink>
                <NavLink
                  to="/results"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Sonuçlar
                </NavLink>
                <NavLink
                  to="/contact"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  İletişim
                </NavLink>
                <NavLink
                  to="/pricing"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                >
                  Fiyatlar
                </NavLink>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-gray-600 hover:text-red-600"
              >
                Giriş Yap
              </Button>
              <NavLink to="/test-selection">
                <Button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200">
                  Teste Başla
                </Button>
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
