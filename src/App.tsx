import { useState, useEffect } from "react"
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'
import Menu from '@/pages/Menu'
import Community from '@/pages/Community'
import Feedback from '@/pages/Feedback'

export default function App() {
  const [isFeedback, setIsFeedback] = useState(false)

  useEffect(() => {
    const handleHashChange = () => {
      setIsFeedback(window.location.hash === "#feedback")
    }

    handleHashChange() // check on load

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

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
      <Menu />
      <Community />
      <Footer />
    </div>
  )
}
