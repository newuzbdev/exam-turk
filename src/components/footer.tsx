import { NavLink } from "react-router";

export const Footer = () => {
  return (
    <div className="site-footer">
      <footer id="contact" className="bg-gray-50 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-red-600 mb-4">
                TürkTest
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Türkçe dil yeterlilik seviyenizi belirlemek ve geliştirmek için
                profesyonel platform.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Hızlı Bağlantılar
              </h3>
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
                    to="#about"
                    className="hover:text-red-600 transition-colors"
                  >
                    Hakkımızda
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="#features"
                    className="hover:text-red-600 transition-colors"
                  >
                    Özellikler
                  </NavLink>
                </li>
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

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Test Türleri</h3>
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

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">İletişim</h3>
              <div className="text-gray-600 space-y-3">
                <p>destek@turktest.com</p>
                <p>+90 (212) 123-4567</p>
                <p>
                  Türkiye Caddesi No:123
                  <br />
                  İstanbul, Türkiye 34000
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-500 flex items-center justify-between flex-col sm:flex-row">
            <p>
              &copy; {new Date().getFullYear()} TürkTest. Tüm hakları saklıdır.
            </p>
            <a href="https:t.me/new_uzb_dev">Created and designed by Ochilov Jaxongirmirzo</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
