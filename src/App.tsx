import { useState, useEffect } from "react"
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'
import Menu from '@/pages/Menu'
import { MenuBuilder } from '@/features/menu-builder/MenuBuilder'
import Community from '@/pages/Community'
import Feedback from '@/pages/Feedback'
import AdminApp from '@/pages/admin/AdminApp'
import { useCart } from '@/features/cart/useCart'
import { InstallToast } from '@/components/InstallToast'
import { CustomerAccount } from '@/features/account/CustomerAccount'
import { useCustomerAccount } from '@/features/account/useCustomerAccount'

export default function App() {
  const [isFeedback, setIsFeedback] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(() => window.location.hash === "#account")
  const cart = useCart()
  const isAdmin = window.location.pathname.startsWith("/admin")
  const isAccountPage = /^\/account\/?$/.test(window.location.pathname)
  const isMenuPage = /^\/menu\/?$/.test(window.location.pathname)
  const accountState = useCustomerAccount(!isAdmin && !isFeedback)

  useEffect(() => {
    if (!isAccountPage && isAccountOpen && accountState.account?.customer) {
      window.location.replace("/account")
    }
  }, [isAccountPage, isAccountOpen, accountState.account?.customer])

  useEffect(() => {
    const handleHashChange = () => {
      if (!isMenuPage && ["#menu", "#custom-menu", "#menu-calculator"].includes(window.location.hash)) {
        window.location.replace("/menu" + window.location.search + window.location.hash)
        return
      }
      setIsFeedback(window.location.hash === "#feedback")
      setIsAccountOpen(window.location.hash === "#account")
    }

    handleHashChange()

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [isMenuPage])

  if (isAdmin) {
    return <AdminApp />
  }

  if (isFeedback) {
    return (
      <div className="min-h-screen bg-brand-cream-100 text-brand-dark font-sans animate-fade-in">
        <Feedback />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-cream-100 text-brand-dark font-sans">
      <Navbar account={accountState.account} accountError={!!accountState.loadError} />
      {isMenuPage ? <main>
        <Menu cart={cart} />
        <MenuBuilder onAddToCart={cart.addProduct} cartError={cart.error} />
      </main> : !isAccountPage && <>
        <div id="home">
          <Home />
        </div>
        <Community />
      </>}
      <CustomerAccount state={accountState} isPage={isAccountPage} open={isAccountOpen} onOpen={() => {
        window.location.hash = "account"
      }} onClose={() => {
        setIsAccountOpen(false)
        if (window.location.hash === "#account") {
          window.history.replaceState(null, "", window.location.pathname + window.location.search)
        }
      }} />
      <Footer />
      {!isAccountPage && <InstallToast />}
    </div>
  )
}
