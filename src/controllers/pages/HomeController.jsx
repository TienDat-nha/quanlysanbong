import React from "react"
import { createHomeModel } from "../../models/homeModel"
import HomeView from "../../views/pages/HomeView"

const HomeController = () => {
  return <HomeView {...createHomeModel()} />
}

export default HomeController
