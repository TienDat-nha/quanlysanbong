import { useEffect, useState } from "react"
import { getMe } from "../models/api"
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  persistAuthToken,
} from "../models/authModel"

export const useAppController = () => {
  const [authToken, setAuthToken] = useState(() => getStoredAuthToken())
  const [currentUser, setCurrentUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null)
      setCheckingAuth(false)
      return
    }

    let mounted = true

    const loadUser = async () => {
      try {
        const data = await getMe(authToken)
        if (mounted) {
          setCurrentUser(data.user || null)
        }
      } catch (error) {
        if (mounted) {
          setAuthToken("")
          setCurrentUser(null)
          clearStoredAuthToken()
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false)
        }
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [authToken])

  const handleLoginSuccess = (token, user) => {
    setAuthToken(token)
    setCurrentUser(user || null)
    persistAuthToken(token)
    setCheckingAuth(false)
  }

  const handleLogout = () => {
    setAuthToken("")
    setCurrentUser(null)
    clearStoredAuthToken()
    setCheckingAuth(false)
  }

  return {
    authToken,
    currentUser,
    checkingAuth,
    handleLoginSuccess,
    handleLogout,
  }
}
