import { useState, useEffect, useLayoutEffect, useRef } from "react"
import { useLocation, useNavigate, useNavigationType } from "react-router"
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'
import Menu from '@/pages/Menu'
import PlateBuilder from '@/pages/PlateBuilder'
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
import { useHealthyDeal } from "@/features/healthy-deal/useHealthyDeal"
import { healthyDealItem } from "@/features/healthy-deal/schedule"

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const [isFeedback, setIsFeedback] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(() => window.location.hash === "#account")
  const { t } = useTranslation()
  const isAdmin = location.pathname.startsWith("/admin")
  const isAccountPage = /^\/account\/?$/.test(location.pathname)
  const isCalorieJournalPage = /^\/calorie-journal\/?$/.test(location.pathname)
  const isHealthyDealPreview = /^\/testhealtydeal\/?$/.test(location.pathname)
  const isMenuPage = /^\/menu\/?$/.test(location.pathname) || isHealthyDealPreview
  const isBuilderPage = /^\/build-your-plate\/?$/.test(location.pathname)
  const legalPageId = legalPageFromPath(location.pathname)
  const isStorefront = isMenuPage || isBuilderPage
  const commerce = useCommerceSettings(isStorefront)
  const cart = useCart(commerce.salesEnabled)
  const accountState = useCustomerAccount(!isAdmin && !isFeedback)
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>(menuData)
  const healthyDeal = useHealthyDeal(isHealthyDealPreview)
  const dealItem = healthyDeal.document
    ? healthyDealItem(healthyDeal.document.settings, healthyDeal.document.revision, healthyDeal.now) : null
  const liveMenuGroups = menuGroups.map(group => group.id === "food" ? {
    ...group, categories: [...(isHealthyDealPreview ? [{
      id: "healthy-deal", label: "Healthy Deal", iconKey: "fork-knife", items: dealItem ? [dealItem] : [],
    }] : []), ...group.categories.filter(category => category.id !== "healthy-deal")],
  } : group)

  useEffect(() => {
    if (!isStorefront) return
    let current = true
    void getMenu().then(groups => { if (current) setMenuGroups(groups) })
    return () => { current = false }
  }, [isStorefront])

  const scrollPositions = useRef(new Map<string, number>())
  const previousPath = useRef(location.pathname)
  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    return () => { window.history.scrollRestoration = previousRestoration }
  }, [])
  useLayoutEffect(() => {
    const pathChanged = previousPath.current !== location.pathname
    previousPath.current = location.pathname
    const restored = navigationType === "POP" ? scrollPositions.current.get(location.key) : undefined
    if (restored !== undefined) {
      window.scrollTo({ top: restored, behavior: "instant" })
    } else if (location.hash && location.hash !== "#account" && location.hash !== "#feedback") {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "instant" })
    } else if (pathChanged) {
      window.scrollTo({ top: 0, behavior: "instant" })
    }
    if (pathChanged) {
      const heading = document.querySelector<HTMLElement>("main h1, h1")
      if (heading) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }
    }
    const positions = scrollPositions.current
    const savePosition = () => positions.set(location.key, window.scrollY)
    window.addEventListener("scroll", savePosition, { passive: true })
    return () => {
      window.removeEventListener("scroll", savePosition)
      savePosition()
    }
  }, [location.key, location.pathname, location.hash, navigationType])

  useEffect(() => {
    if (!isAccountPage && isAccountOpen && accountState.account?.customer) {
      window.location.replace("/account")
    }
  }, [isAccountPage, isAccountOpen, accountState.account?.customer])

  useEffect(() => {
    const handleHashChange = () => {
      if (!isBuilderPage && ["#custom-menu", "#menu-calculator"].includes(window.location.hash)) {
        void navigate("/build-your-plate" + location.search + window.location.hash, { replace: true })
        return
      }
      if (!isMenuPage && ["#menu", "#halloween-menu", "#healthy-deal-menu"].includes(window.location.hash)) {
        void navigate("/menu" + location.search + window.location.hash, { replace: true })
        return
      }
      setIsFeedback(window.location.hash === "#feedback")
      setIsAccountOpen(window.location.hash === "#account")
    }

    handleHashChange()

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [isMenuPage, isBuilderPage, location.hash, location.search, navigate])

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
      <div key={location.pathname} className="public-page-transition">
      {legalPageId ? <LegalPage pageId={legalPageId} /> : isCalorieJournalPage ? <CalorieJournalPage
        key={accountState.account?.customer?.referralCode ?? "guest"}
        customerName={accountState.account?.customer?.name ?? null}
        isChecking={!accountState.account && !accountState.loadError}
      /> : isBuilderPage ? <main>
        {commerce.error && <p role="alert" className="mx-auto max-w-4xl px-6 pt-24 text-sm text-red-800">{t(commerce.error)}</p>}
        <PlateBuilder cart={cart} menuGroups={liveMenuGroups} isSalesEnabled={commerce.salesEnabled} />
      </main> : isMenuPage ? <main>
        {commerce.error && <p role="alert" className="mx-auto max-w-4xl px-6 pt-24 text-sm text-red-800">{t(commerce.error)}</p>}
        <Menu cart={cart} menuGroups={liveMenuGroups} isSalesEnabled={commerce.salesEnabled} healthyDeal={healthyDeal}
          isHealthyDealPreview={isHealthyDealPreview} />
      </main> : !isAccountPage && <>
        <div id="home">
          <Home />
        </div>
        <Community />
      </>}
      </div>
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
