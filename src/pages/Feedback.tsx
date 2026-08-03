import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Star, 
  Sparkles, 
  ArrowLeft, 
  Check, 
  Settings, 
  Download, 
  Copy, 
  ShieldAlert, 
  User, 
  Phone, 
  MessageSquare
} from "lucide-react"
import Logo from "../components/Logo"

// configuration details
const GOOGLE_MAPS_REVIEW_URL = "https://g.page/r/Ca3SpmVN9lOvEBM/review"
const DEFAULT_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbz3MeRHhU2fSug0NfN-6Lj5UaxlAAkxPIJ71Nr8_XK2enm_nksmcUsbG2KGadth1P6PQg/exec"

const FEEDBACK_CATEGORIES = [
  { id: "food", label: "Mâncare / Preparate", icon: "🥗" },
  { id: "drinks", label: "Băuturi / Cafea", icon: "☕" },
  { id: "service", label: "Servire / Personal", icon: "⭐" },
  { id: "atmosphere", label: "Atmosferă / Muzică", icon: "✨" },
  { id: "value", label: "Preț", icon: "💰" },
  { id: "wait", label: "Timp Așteptare", icon: "⏱️" },
]

export default function Feedback() {
  const [ratings, setRatings] = useState<Record<string, number>>({
    food: 0,
    drinks: 0,
    service: 0,
    atmosphere: 0,
    value: 0,
    wait: 0,
  })
  
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({
    food: 0,
    drinks: 0,
    service: 0,
    atmosphere: 0,
    value: 0,
    wait: 0,
  })

  const [submittedRating, setSubmittedRating] = useState<number>(0)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [comment, setComment] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMess, setErrorMess] = useState("")

  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const sheetUrl = DEFAULT_GOOGLE_SHEET_URL
  const [savedReviews, setSavedReviews] = useState<any[]>([])

  // Load reviews saved locally (fallback)
  useEffect(() => {
    const list = localStorage.getItem("alive_bistro_local_reviews")
    if (list) {
      setSavedReviews(JSON.parse(list))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const ratedCategories = Object.entries(ratings).filter(([_, r]) => r > 0)
    if (ratedCategories.length === 0) {
      setErrorMess("Te rugăm să acorzi cel puțin un rating în secțiunile de mai jos.")
      return
    }

    setLoading(true)
    setErrorMess("")

    const totalScore = ratedCategories.reduce((acc, [_, r]) => acc + r, 0)
    const averageRating = Math.round((totalScore / ratedCategories.length) * 10) / 10
    setSubmittedRating(averageRating)

    // Build category stars text so it displays nicely in the Sheet without changing Google Apps Script
    const ratingStrings = ratedCategories.map(([key, val]) => {
      const catInfo = FEEDBACK_CATEGORIES.find(c => c.id === key)
      const stars = Array.from({ length: val }).map(() => "★").join("")
      return `- ${catInfo?.label || key}: ${stars} (${val}/5)`
    }).join("\n")

    const fullComment = `Evaluări pe categorii:\n${ratingStrings}\n\n${comment.trim() ? `Mesaj client:\n"${comment.trim()}"` : "[Fără mesaj text]"}`

    const payload = {
      timestamp: new Date().toISOString(),
      name: name.trim() || "Anonim",
      rating: averageRating,
      category: ratedCategories.map(([key]) => FEEDBACK_CATEGORIES.find(c => c.id === key)?.label).join(", "),
      comment: fullComment,
      contact: contact.trim() || "Nespecificat"
    }

    // Save locally as backup
    const newLocalList = [payload, ...savedReviews]
    localStorage.setItem("alive_bistro_local_reviews", JSON.stringify(newLocalList))
    setSavedReviews(newLocalList)

    if (sheetUrl) {
      try {
        await fetch(sheetUrl, {
          method: "POST",
          mode: "no-cors", // necesar pentru Google Apps Script
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      } catch (err: any) {
        console.error("Nu s-a putut trimite către Google Sheets:", err)
      }
    }

    setLoading(false)
    setSubmitted(true)
  }

  const handleResetForm = () => {
    setRatings({
      food: 0,
      drinks: 0,
      service: 0,
      atmosphere: 0,
      value: 0,
      wait: 0,
    })
    setHoverRatings({
      food: 0,
      drinks: 0,
      service: 0,
      atmosphere: 0,
      value: 0,
      wait: 0,
    })
    setSubmittedRating(0)
    setName("")
    setContact("")
    setComment("")
    setSubmitted(false)
  }

  // QR Code URL updated to the official live website domain so printed QR codes work correctly
  const qrCodeUrl = "https://alive-bistro.ro/#feedback"
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&color=364e35&data=${encodeURIComponent(qrCodeUrl)}`

  return (
    <div className="min-h-screen pb-16 flex flex-col items-center">
      {/* Mini-Navbar / Back to Home Banner */}
      <div className="w-full max-w-xl px-4 mt-6 flex justify-between items-center z-10">
        <a 
          href="#home" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-green-700/5 hover:bg-brand-green-700/10 text-brand-green-700 text-xs font-semibold transition-all border border-brand-green-700/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Acasă
        </a>
        <button
          onClick={() => setIsAdminOpen(!isAdminOpen)}
          className="p-2 rounded-full hover:bg-brand-green-700/5 text-brand-green-700/60 hover:text-brand-green-700 transition-colors"
          title="Administrare QR Code"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <main className="w-full max-w-xl px-4 flex-1 flex flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-brand-cream-50 p-6 md:p-8 rounded-3xl border border-brand-green-200/50 shadow-xl shadow-brand-green-700/5"
            >
              {/* Branding Header */}
              <div className="text-center mb-6">
                <Logo variant="transparent" size="md" className="text-brand-green-700 mx-auto mb-3" />
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-green-700/10 border border-brand-green-700/20 text-brand-green-800 text-[10px] uppercase tracking-widest font-bold mb-3 font-sans">
                  ⭐ Opinia Ta Contează ⭐
                </div>
                <p className="text-sm font-light text-brand-dark/80 max-w-sm mx-auto leading-relaxed">
                  Ajută-ne să devenim mai buni sau spune-ne ce ți-a plăcut cel mai mult din vizita ta la ALIVE Bistro!
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-green-700 block mb-3 text-center">
                    Cum a fost experiența ta? (acordă stele):
                  </span>
                  
                  <div className="space-y-3">
                    {FEEDBACK_CATEGORIES.map((cat) => {
                      const currentRating = ratings[cat.id] || 0
                      const currentHover = hoverRatings[cat.id] || 0
                      
                      return (
                        <div 
                          key={cat.id} 
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-brand-cream-100/60 rounded-2xl border border-brand-green-200/30 gap-2.5 transition-all hover:bg-brand-cream-100/90"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{cat.icon}</span>
                            <span className="text-xs font-bold text-brand-green-800 uppercase tracking-widest">
                              {cat.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isActive = (currentHover || currentRating) >= star
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onMouseEnter={() => setHoverRatings(prev => ({ ...prev, [cat.id]: star }))}
                                  onMouseLeave={() => setHoverRatings(prev => ({ ...prev, [cat.id]: 0 }))}
                                  onClick={() => setRatings(prev => ({ ...prev, [cat.id]: star }))}
                                  className="p-1 focus:outline-none transition-transform active:scale-95 duration-100 cursor-pointer"
                                >
                                  <Star
                                    className={`w-6 h-6 transition-colors ${
                                      isActive 
                                        ? "fill-amber-400 text-amber-400" 
                                        : "text-brand-green-300/80 fill-transparent"
                                    }`}
                                  />
                                </button>
                              )
                            })}
                            {currentRating > 0 && (
                              <span className="text-xs font-bold text-brand-green-700 w-5 text-center">
                                {currentRating}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Feedback Text */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-green-700">
                      Mesajul tău / Detalii (Opțional)
                    </label>
                    <MessageSquare className="w-3.5 h-3.5 text-brand-green-700/50" />
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Spune-ne ce preparat sau ce aspect te-a încântat, ori ce am putea îmbunătăți pe viitor..."
                    rows={4}
                    className="w-full p-3 rounded-2xl bg-brand-cream-50 border border-brand-green-200/60 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500 focus:outline-none text-sm text-brand-dark placeholder-brand-dark/40 resize-none transition-all"
                  />
                </div>

                {/* 4. Optional Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-brand-green-200/20">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-green-700 block mb-1">
                      Nume clienți (Opțional)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-brand-green-700/40" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Marius Popescu"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-brand-cream-50 border border-brand-green-200/60 focus:border-brand-green-500 focus:outline-none text-xs text-brand-dark placeholder-brand-dark/40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-green-700 block mb-1">
                      Contact - Tel / Email (Opțional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-brand-green-700/40" />
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="Ex: 0722..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-brand-cream-50 border border-brand-green-200/60 focus:border-brand-green-500 focus:outline-none text-xs text-brand-dark placeholder-brand-dark/40"
                      />
                    </div>
                  </div>
                </div>

                {errorMess && (
                  <p className="text-xs font-semibold text-rose-600 text-center flex items-center justify-center gap-1">
                    <ShieldAlert className="w-4 h-4" />
                    {errorMess}
                  </p>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand-green-700 hover:bg-brand-green-800 disabled:bg-brand-green-700/50 cursor-pointer font-bold text-brand-cream-50 text-sm rounded-full tracking-wider shadow-md shadow-brand-green-700/10 transition-colors uppercase flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-brand-cream-50 border-t-transparent rounded-full animate-spin"></div>
                      Se trimite...
                    </>
                  ) : (
                    "Trimite feedback"
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-cream-50 p-6 md:p-8 rounded-3xl border border-brand-green-200/50 shadow-xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-brand-green-700/10 text-brand-green-700 mx-auto flex items-center justify-center rounded-full">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold font-serif-brand text-brand-green-700 mb-2 lowercase">
                  Feedback trimis cu succes!
                </h3>
                <p className="text-sm text-brand-dark/80 font-light max-w-sm mx-auto leading-relaxed">
                  Îți mulțumim enorm! Fiecare feedback ne ajută să păstrăm cele mai înalte standarde de gust, energie și servire.
                </p>
              </div>

              {/* Conditional Google review encouragement if rating >= 4 */}
              {submittedRating >= 4 && (
                <div className="bg-brand-green-700/5 border border-brand-green-700/20 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-center text-amber-500 gap-0.5">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                  </div>
                  <h4 className="text-sm font-bold text-brand-green-700">
                    Ne-ai acordat o medie de {submittedRating} stele!
                  </h4>
                  <p className="text-xs text-brand-dark/70 leading-relaxed max-w-xs mx-auto">
                    Ne bucurăm nespus de mult că ai avut o experiență faină! Ne-ar ajuta enorm pe plan local dacă ai scrie câteva cuvinte și direct pe Google Maps. Durează doar 30 de secunde.
                  </p>
                  <a
                    href={GOOGLE_MAPS_REVIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-green-700 hover:bg-brand-green-800 text-brand-cream-50 text-xs font-semibold rounded-full shadow-md shadow-brand-green-700/10 transition-colors cursor-pointer"
                  >
                    Scrie Recenzie pe Google
                    <Sparkles className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs font-semibold text-brand-green-700 hover:underline cursor-pointer"
                >
                  Trimite un alt mesaj sau feedback
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Admin Panel Backdrop / Drawer */}
      <AnimatePresence>
        {isAdminOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-cream-50 border border-brand-green-200 w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-brand-green-200/50 mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-green-700 animate-spin-slow" />
                  <h3 className="text-lg font-bold font-serif-brand text-brand-green-700 lowercase">
                    Panou Administrare Feedback
                  </h3>
                </div>
                <button
                  onClick={() => setIsAdminOpen(false)}
                  className="px-3 py-1 bg-brand-green-700/10 hover:bg-brand-green-700/20 text-brand-green-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Închide
                </button>
              </div>

              {/* Instructions and QR Code generation section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-brand-cream-100 p-4 rounded-2xl border border-brand-green-200/30">
                    <h4 className="text-xs font-bold text-brand-green-700 uppercase mb-2">
                      1. QR Code pentru Mese / Flyer
                    </h4>
                    <p className="text-xs text-brand-dark/70 leading-relaxed max-w-sm mb-3">
                      Clienții pot scana acest QR code de pe ospătar sau stand de masă pentru a fi trimiși direct pe această pagină.
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-brand-green-200/30 inline-block">
                      <img 
                        src={qrCodeImageUrl} 
                        alt="QR Code Feedback" 
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={qrCodeImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-green-700 text-brand-cream-50 text-[10px] font-semibold rounded-lg hover:bg-brand-green-800 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Descarcă QR
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qrCodeUrl)
                          alert("Link QR copiat în clipboard!")
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-cream-200 text-brand-dark/80 text-[10px] font-semibold rounded-lg hover:bg-brand-cream-300 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copiază Link
                      </button>
                    </div>
                    <p className="text-[10px] text-brand-green-700 font-mono mt-2 break-all">
                      {qrCodeUrl}
                    </p>
                  </div>
                </div>

                {/* Recenzii locale stocate pe device */}
                <div className="space-y-4">
                  <div className="bg-brand-cream-100 p-4 rounded-2xl border border-brand-green-200/30">
                    <h4 className="text-xs font-bold text-brand-green-700 uppercase mb-2 flex items-center justify-between">
                      <span>2. Recenzii salvate pe acest device ({savedReviews.length})</span>
                      {savedReviews.length > 0 && (
                        <button 
                          onClick={() => {
                            if(confirm("Ești sigur că vrei să ștergi recenziile stocate local de pe acest browser?")) {
                              localStorage.removeItem("alive_bistro_local_reviews")
                              setSavedReviews([])
                            }
                          }}
                          className="text-[9px] text-rose-600 font-semibold hover:underline"
                        >
                          Șterge local
                        </button>
                      )}
                    </h4>
                    
                    {savedReviews.length === 0 ? (
                      <p className="text-[11px] text-brand-dark/50 italic py-6 text-center">
                        Nu există recenzii salvate pe acest browser. Trimiterea de recenzii pe site-ul tău le va adăuga instant aici!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                        {savedReviews.map((rev, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-brand-green-200/20 text-[11px]">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-brand-green-900">{rev.name}</span>
                              <span className="text-[9px] text-brand-dark/40">
                                {new Date(rev.timestamp).toLocaleDateString("ro-RO")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="flex text-amber-500 text-[9px]">
                                {Array.from({ length: rev.rating }).map(() => "★").join("")}
                              </span>
                              {rev.category && (
                                <span className="px-1.5 py-0.5 bg-brand-green-700/5 text-brand-green-700 rounded-md text-[8px] font-medium">
                                  {rev.category}
                                </span>
                              )}
                            </div>
                            {rev.comment && (
                              <p className="text-brand-dark/80 italic leading-snug">{rev.comment}</p>
                            )}
                            {rev.contact && rev.contact !== "Nespecificat" && (
                              <p className="text-[8px] text-brand-green-700 mt-1 font-mono">Contact: {rev.contact}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}