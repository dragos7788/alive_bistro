import { InstagramLogo, FacebookLogo, TiktokLogo } from "@phosphor-icons/react"
import Logo from "./Logo"

export default function Footer() {
  return (
    <footer className="bg-brand-green-800 border-t border-brand-green-700/60 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Logo variant="transparent" size="md" className="text-brand-cream-50" />
            <p className="text-brand-cream-300/80 text-sm">Str. Mureș nr. 116A, Timișoara</p>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-brand-cream-200">
            <a href="#menu" className="hover:text-brand-cream-50 transition-colors">Meniu</a>
            <a href="#reservations" className="hover:text-brand-cream-50 transition-colors">Rezervări</a>
            <a href="#community" className="hover:text-brand-cream-50 transition-colors">Comunitate</a>
            <a href="#feedback" className="hover:text-brand-cream-50 transition-colors">Feedback</a>
          </div>

          {/* Socials */}
          <div className="flex gap-4 text-brand-cream-200">
            <a href="https://www.instagram.com/alive_bistro/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-cream-50 transition-colors" aria-label="Instagram">
              <InstagramLogo size={20} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-cream-50 transition-colors" aria-label="Facebook">
              <FacebookLogo size={20} />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-cream-50 transition-colors" aria-label="TikTok">
              <TiktokLogo size={20} />
            </a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-brand-green-700/60 text-center text-brand-cream-300/40 text-xs">
          © {new Date().getFullYear()} ALIVE Bistro. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
