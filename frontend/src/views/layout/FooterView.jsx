import React from "react"
import { Link } from "react-router-dom"
import { MdTravelExplore } from "react-icons/md"
import { IoCallOutline, IoMailOutline, IoLocationOutline } from "react-icons/io5"
import "./footer.scss"

const renderContactIcon = (key) => {
  switch (key) {
    case "phone":
      return <IoCallOutline />
    case "email":
      return <IoMailOutline />
    default:
      return <IoLocationOutline />
  }
}

const FooterView = ({
  brandName,
  brandDescription,
  navigationTitle,
  infoTitle,
  links,
  contacts,
  copyrightText,
}) => {
  return (
    <footer className="footer" id="contact">
      <div className="container footerTop">
        <div className="footerBrand">
          <Link to="/" className="logo flex">
            <h2>
              <MdTravelExplore className="icon" />
              {brandName}
            </h2>
          </Link>
          <p>{brandDescription}</p>
        </div>

        <div>
          <h3>{navigationTitle}</h3>
          <ul className="footerLinks">
            {links.map((link) => (
              <li key={link.key}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>{infoTitle}</h3>
          <ul className="footerInfo">
            {contacts.map((contact) => (
              <li key={contact.key}>
                {renderContactIcon(contact.key)}
                {contact.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container footerBottom">
        <p>{copyrightText}</p>
      </div>
    </footer>
  )
}

export default FooterView
