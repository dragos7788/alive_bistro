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

export default function App() {
  const [isFeedback, setIsFeedback] = useState(false)
  const cart = useCart()
  const isAdmin = window.location.pathname.startsWith("/admin")

  useEffect(() => {
    const handleHashChange = () => {
      setIsFeedback(window.location.hash === "#feedback")
    }

    handleHashChange()

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

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
      <Navbar />
      <div id="home">
        <Home />
      </div>
      <Menu cart={cart} />
      <MenuBuilder onAddToCart={cart.addProduct} cartError={cart.error} />
      <Community />
      <Footer />
      <InstallToast />
    </div>
  )
}
