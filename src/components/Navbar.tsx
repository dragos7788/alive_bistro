import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { List, X } from "@phosphor-icons/react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import Logo from "./Logo"
import { AccountAvatar } from "@/features/account/AccountAvatar"
import type { AccountData } from "@/features/account/api"

const navLinks = [
  { href: "#home", labelKey: "navbar.home" },
  { href: "/menu", labelKey: "navbar.menu" },
  { href: "/build-your-plate", labelKey: "navbar.customMenu" },
  { href: "#community", labelKey: "navbar.community" },
  { href: "#account", labelKey: "account.nav" },
]

export default function Navbar({ account, accountError }: { account: AccountData | null; accountError: boolean }) {
  const { t, i18n } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isHomePage = window.location.pathname === "/"
  const visibleNavLinks = account?.customer
    ? [...navLinks.slice(0, 3), { href: "/calorie-journal", labelKey: "calorieJournal.nav" }, ...navLinks.slice(3)]
    : navLinks
  const linkHref = (href: string) => href === "#account"
    ? account?.customer ? "/account" : "#account"
    : href.startsWith("#") && !isHomePage ? `/${href}` : href

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem("alive_bistro_lng", lng)
    setLangDropdownOpen(false)
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "bg-brand-cream-50/90 backdrop-blur-md border-b border-brand-green-200/50 shadow-sm" : "bg-transparent"
        )}
      >
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <a href={linkHref("#home")} className="hover:opacity-90 transition-opacity">
            <Logo variant="transparent" size="md" className="text-brand-green-700" />
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {visibleNavLinks.map((link) => (
              <a
                key={link.href}
                href={linkHref(link.href)}
                className={cn(
                  "text-sm font-semibold tracking-wider transition-colors duration-200",
                  link.href === "/build-your-plate"
                    ? "performance-link inline-flex min-h-11 items-center rounded-full px-4 py-2"
                    : "text-brand-green-700/80 hover:text-brand-green-900"
                )}
              >
                {t(link.labelKey)}
              </a>
            ))}
            
            {/* Desktop Language Switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-green-700/10 text-brand-green-700 hover:border-brand-green-700/25 hover:bg-brand-green-700/5 text-xs font-bold transition-all"
                aria-label={t("navbar.toggleMenu")}
              >
                <span>{i18n.language === "ro" ? "🇷🇴 RO" : "🇬🇧 EN"}</span>
                <span className="text-[9px] opacity-60">▼</span>
              </button>
              <AnimatePresence>
                {langDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-32 bg-brand-cream-50 border border-brand-green-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden"
                  >
                    <button
                      onClick={() => changeLanguage("ro")}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-brand-green-700/5 transition-colors flex items-center gap-2",
                        i18n.language === "ro" ? "text-brand-green-800 bg-brand-green-700/10" : "text-brand-green-700"
                      )}
                    >
                      <span>🇷🇴 Română</span>
                    </button>
                    <button
                      onClick={() => changeLanguage("en")}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-brand-green-700/5 transition-colors flex items-center gap-2",
                        i18n.language === "en" ? "text-brand-green-800 bg-brand-green-700/10" : "text-brand-green-700"
                      )}
                    >
                      <span>🇬🇧 English</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-4">
            <AccountAvatar account={account} hasError={accountError} />
            {/* Mobile Language Switcher (compact) */}
            <div className="md:hidden flex gap-1 border border-brand-green-700/10 rounded-full p-1 bg-brand-cream-50/50">
              <button
                onClick={() => changeLanguage("ro")}
                className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold transition-colors",
                  i18n.language === "ro" ? "bg-brand-green-700 text-brand-cream-50" : "text-brand-green-700/60"
                )}
              >
                RO
              </button>
              <button
                onClick={() => changeLanguage("en")}
                className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold transition-colors",
                  i18n.language === "en" ? "bg-brand-green-700 text-brand-cream-50" : "text-brand-green-700/60"
                )}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden text-brand-green-700 p-1"
              aria-label={t("navbar.toggleMenu")}
            >
              {mobileOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-brand-cream-50/98 flex flex-col items-center justify-center gap-8 md:hidden text-center"
          >
            {visibleNavLinks.map((link) => (
              <a
                key={link.href}
                href={linkHref(link.href)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "text-2xl font-bold transition-colors",
                  link.href === "/build-your-plate"
                    ? "performance-link rounded-full px-6 py-3"
                    : "text-brand-green-700 hover:text-brand-green-900"
                )}
              >
                {t(link.labelKey)}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
