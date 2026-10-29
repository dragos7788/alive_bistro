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
import { CalorieJournalPage } from '@/features/calorie-journal/CalorieJournalPage'
import { getMenu } from '@/features/menu/api'
import { menuData } from '@/features/menu/seed'
import type { MenuGroup } from '@/features/menu/types'
import { useCommerceSettings } from '@/features/commerce/useCommerceSettings'
import { LegalPage } from '@/features/legal/LegalPage'
import { legalPageFromPath } from '@/features/legal/company'
import { useTranslation } from "react-i18next"

export default function App() {
  const [isFeedback, setIsFeedback] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(() => window.location.hash === "#account")
  const { t } = useTranslation()
  const isAdmin = window.location.pathname.startsWith("/admin")
  const isAccountPage = /^\/account\/?$/.test(window.location.pathname)
  const isCalorieJournalPage = /^\/calorie-journal\/?$/.test(window.location.pathname)
  const isMenuPage = /^\/menu\/?$/.test(window.location.pathname)
  const legalPageId = legalPageFromPath(window.location.pathname)
  const commerce = useCommerceSettings(isMenuPage)
  const cart = useCart(commerce.salesEnabled)
  const accountState = useCustomerAccount(!isAdmin && !isFeedback)
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>(menuData)

  useEffect(() => {
    if (!isMenuPage) return
    let current = true
    void getMenu().then(groups => { if (current) setMenuGroups(groups) })
    return () => { current = false }
  }, [isMenuPage])

  useEffect(() => {
    if (!isAccountPage && isAccountOpen && accountState.account?.customer) {
      window.location.replace("/account")
    }
  }, [isAccountPage, isAccountOpen, accountState.account?.customer])

  useEffect(() => {
    const handleHashChange = () => {
      if (!isMenuPage && ["#menu", "#custom-menu", "#menu-calculator", "#halloween-menu"].includes(window.location.hash)) {
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
      {legalPageId ? <LegalPage pageId={legalPageId} /> : isCalorieJournalPage ? <CalorieJournalPage
        key={accountState.account?.customer?.referralCode ?? "guest"}
        customerName={accountState.account?.customer?.name ?? null}
        isChecking={!accountState.account && !accountState.loadError}
      /> : isMenuPage ? <main>
        {commerce.error && <p role="alert" className="mx-auto max-w-4xl px-6 pt-24 text-sm text-red-800">{t(commerce.error)}</p>}
        <Menu cart={cart} menuGroups={menuGroups} isSalesEnabled={commerce.salesEnabled} />
        <MenuBuilder onAddToCart={cart.addProduct} cartError={cart.error} isSalesEnabled={commerce.salesEnabled}
          discountPercent={menuGroups.find(group => group.id === "food")?.performanceDiscountPercent ?? 0} />
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
