import React from "react"

const AppView = ({ navbar, footer, checkingAuth, authMessage, children }) => {
  return (
    <div className="appRoot">
      {navbar}

      <main className="appMain">
        {checkingAuth ? (
          <section className="section">
            <div className="container">
              <p>{authMessage}</p>
            </div>
          </section>
        ) : (
          children
        )}
      </main>

      {footer || null}
    </div>
  )
}

export default AppView
