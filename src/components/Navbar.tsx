import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { List, X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import Logo from "./Logo"

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#menu", label: "Menu" },
  { href: "#community", label: "Community" },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

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
          <a href="#home" className="hover:opacity-90 transition-opacity">
            <Logo variant="transparent" size="md" className="text-brand-green-700" />
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-brand-green-700/80 hover:text-brand-green-900 text-sm font-semibold tracking-wider transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden text-brand-green-700 p-1"
              aria-label="Toggle menu"
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
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-brand-green-700 text-2xl font-bold hover:text-brand-green-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
