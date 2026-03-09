import React from "react"
import { createFooterModel } from "../../models/layout/footerModel"
import FooterView from "../../views/layout/FooterView"

const FooterController = () => {
  return <FooterView {...createFooterModel()} />
}

export default FooterController
