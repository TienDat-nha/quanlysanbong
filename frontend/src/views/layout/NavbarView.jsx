import React from "react"
import { NavLink } from "react-router-dom"
import { MdTravelExplore } from "react-icons/md"
import { AiFillCloseCircle } from "react-icons/ai"
import { TbGridDots } from "react-icons/tb"
import "./navbar.scss"

const navLinkClass = ({ isActive }) => (isActive ? "navLink active" : "navLink")

const NavbarView = ({
  homePath,
  navItems,
  guestActions,
  isAuthenticated,
  currentUserName,
  isMenuOpen,
  closeMenu,
  openMenu,
  onLogoutClick,
}) => {
  return (
    <section className="navBarSection">
      <header className="header flex">
        <div className="logoDiv">
          <NavLink to={homePath} className="logo flex" onClick={closeMenu}>
            <h1>
              <MdTravelExplore className="icon" />
              SanBong.
            </h1>
          </NavLink>
        </div>

        <div className={isMenuOpen ? "navBar activeNavbar" : "navBar"}>
          <ul className="navLists flex">
            {navItems.map((item) => (
              <li className="navItem" key={item.key}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}

            {isAuthenticated ? (
              <>
                <li className="navItem authUser">
                  <span>{currentUserName}</span>
                </li>
                <li className="navItem">
                  <button className="btn outlineBtn" type="button" onClick={onLogoutClick}>
                    Đăng xuất
                  </button>
                </li>
              </>
            ) : (
              guestActions.map((action) => (
                <li className="navItem" key={action.key}>
                  <NavLink className={action.className} to={action.to} onClick={closeMenu}>
                    {action.label}
                  </NavLink>
                </li>
              ))
            )}
          </ul>

          <button className="closeNavBar" onClick={closeMenu} type="button" aria-label="Đóng menu">
            <AiFillCloseCircle className="icon" />
          </button>
        </div>

        <button className="toggleNavbar" onClick={openMenu} type="button" aria-label="Mở menu">
          <TbGridDots className="icon" />
        </button>
      </header>
    </section>
  )
}

export default NavbarView
