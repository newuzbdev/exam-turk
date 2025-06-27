import { Footer } from "./footer";
import Navbar from "./navbar";
import { Outlet } from "react-router";

const Layout = () => {
  return (
    <div className=" bg-white">
      <Navbar />
      <main>
        <Outlet />
        <Footer />
      </main>
    </div>
  );
};

export default Layout;
