import { NavLink } from "react-router-dom";
import { Instagram, Youtube, Send } from "lucide-react";

export const Footer = () => {
  return (
    <div className="site-footer">
      <footer id="contact" className="bg-gray-50 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Main footer content */}
          <div className="grid md:grid-cols-4 gap-12 items-start">
            <div className="space-y-4">
              <div className="text-2xl font-bold text-red-600">
                TURKISHMOCK
              </div>
              <p className="text-gray-600 leading-relaxed">
                Türkçe CEFR seviyenizi belirlemek, sınavlara hazırlanmak ve
                gelişiminizi takip etmek için tasarlanmış yapay zekâ destekli
                platform.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Hızlı Bağlantılar</h3>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <NavLink
                    to="/"
                    className="hover:text-red-600 transition-colors"
                  >
                    Ana Sayfa
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/profile"
                    className="hover:text-red-600 transition-colors"
                  >
                    Profil
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/test"
                    className="hover:text-red-600 transition-colors"
                  >
                    Test
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink
                    to="/about"
                    className="hover:text-red-600 transition-colors"
                  >
                    Hakkımızda
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to="#features"
                    className="hover:text-red-600 transition-colors"
                  >
                    Özellikler
                  </NavLink>
                </li> */}
                <li>
                  <NavLink
                    to="/price"
                    className="hover:text-red-600 transition-colors"
                  >
                    Fiyatlar
                  </NavLink>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Test Türleri</h3>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Dinleme Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Okuma Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Yazma Testi
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#"
                    className="hover:text-red-600 transition-colors"
                  >
                    Konuşma Testi
                  </NavLink>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Sosyal Medya</h3>
              <div className="flex gap-4">
                <a
                  href="https://t.me/turkishmock"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:border-red-200 transition-all hover:-translate-y-1 shadow-sm"
                  aria-label="Telegram"
                >
                  <Send className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:border-red-200 transition-all hover:-translate-y-1 shadow-sm"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-red-600 hover:border-red-200 transition-all hover:-translate-y-1 shadow-sm"
                  aria-label="YouTube"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-6 text-center text-gray-500 flex items-center justify-between flex-col sm:flex-row gap-3">
            <p>
              &copy; {new Date().getFullYear()} TURKISHMOCK. Tüm hakları saklıdır.
            </p>
            <div className="text-sm text-gray-500">
              <p>
                <a
                  href="https://t.me/timur_makarov"
                  className="hover:text-red-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Founded and led by Timur Makarov
                </a>
                .
              </p>
              <p>
                {/* <a
                  href="https://t.me/new_uzb_dev"
                  className="hover:text-red-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Development by Ochilov Jahongirmirzo
                </a> */}
                .
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
