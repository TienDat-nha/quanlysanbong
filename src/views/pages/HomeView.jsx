import React from "react"
import { Link } from "react-router-dom"
import {
  IoLocationOutline,
  IoFlashOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5"
import "./home.scss"

const renderStatIcon = (iconKey) => {
  switch (iconKey) {
    case "location":
      return <IoLocationOutline />
    case "flash":
      return <IoFlashOutline />
    default:
      return <IoShieldCheckmarkOutline />
  }
}

const HomeView = ({
  tagline,
  title,
  description,
  primaryAction,
  secondaryAction,
  panelTitle,
  hotSlots,
  stats,
}) => {
  return (
    <section className="home section" id="home">
      <div className="container homeWrapper">
        <div className="homeText">
          <span className="tagline">{tagline}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="homeActions">
            <Link to={primaryAction.to} className="btn">
              {primaryAction.label}
            </Link>
            <Link to={secondaryAction.to} className="ghostBtn">
              {secondaryAction.label}
            </Link>
          </div>
        </div>

        <div className="homePanel">
          <h3>{panelTitle}</h3>
          <ul>
            {hotSlots.map((slot) => (
              <li key={slot.id}>
                <span>{slot.time}</span>
                <strong>{slot.fieldName}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container statGrid">
        {stats.map((stat) => (
          <article key={stat.id} className="statCard">
            <span className="statIcon">{renderStatIcon(stat.iconKey)}</span>
            <div>
              <h4>{stat.value}</h4>
              <p>{stat.label}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default HomeView
