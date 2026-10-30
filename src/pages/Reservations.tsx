import { useState } from "react"
import { motion } from "framer-motion"
import { MapPin, Clock, Phone } from "lucide-react"

type FormState = {
  name: string
  email: string
  phone: string
  date: string
  time: string
  guests: string
  notes: string
}

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  guests: "2",
  notes: "",
}

const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]

export default function Reservations() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: wire up to email API (Resend) or backend
    setSubmitted(true)
  }

  return (
    <section id="reservations" className="min-h-screen py-24 px-6 bg-brand-cream-100">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-brand-green-700 uppercase tracking-[0.3em] text-xs font-bold mb-3 font-sans">TE AȘTEPTĂM CU DRAG</p>
          <h2 className="text-4xl md:text-6xl font-extrabold text-brand-green-700 mb-4 tracking-tight font-serif lowercase">Rezervă o Masă<span className="text-brand-green-500 font-sans">.</span></h2>
          <p className="text-brand-dark/80 max-w-md mx-auto font-light text-sm font-sans">Asigură-ți locul în oaza noastră de liniște și energie. Îți vom confirma rezervarea în cel mai scurt timp.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Info panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="p-6 rounded-2xl border border-brand-green-700/10 bg-brand-cream-200/50 space-y-5">
              <InfoRow icon={<MapPin size={18} className="text-brand-green-700" />} label="Adresă" value="Str. Mureș nr. 115A, corp D, Timișoara" />
              <InfoRow icon={<Clock size={18} className="text-brand-green-700" />} label="Luni - Vineri" value="08:00 – 21:00" />
              <InfoRow icon={<Clock size={18} className="text-brand-green-700" />} label="Sâmbătă - Duminică" value="09:00 – 22:00" />
              <InfoRow icon={<Phone size={18} className="text-brand-green-700" />} label="Telefon" value="0737 263 469" />
            </div>
            <p className="text-brand-dark/65 text-xs px-1 leading-relaxed font-light font-sans">
              Pentru grupuri mari (8+ persoane) sau organizarea de evenimente private de wellbeing, te rugăm să ne contactezi direct la numărul de telefon. Ne bucurăm să fim gazda voastră!
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-10 rounded-2xl border border-brand-green-700/20 bg-brand-cream-200/40"
              >
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-brand-green-700 text-xl font-bold mb-2 font-serif lowercase">Solicitare Înregistrată!</h3>
                <p className="text-brand-dark/80 font-sans">Mulțumim, {form.name}! Îți vom confirma masa pe e-mail în câteva minute.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm(initialForm) }}
                  className="mt-6 text-sm text-brand-green-700 hover:text-brand-green-800 underline underline-offset-4 font-bold font-sans"
                >
                  Efectuează o altă rezervare
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Numele Tău" name="name" type="text" value={form.name} onChange={handleChange} required placeholder="Popescu Andrei" />
                  <Field label="Adresă Email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="andrei@example.com" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Telefon (opțional)" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="0722 000 123" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-brand-dark/80 text-sm font-semibold font-sans">Număr de Persoane</label>
                    <select
                      name="guests"
                      value={form.guests}
                      onChange={handleChange}
                      className="bg-brand-cream-50 border border-brand-green-700/15 text-brand-dark rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green-700/60 transition-colors font-sans"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n} className="bg-brand-cream-50 text-brand-dark">{n} {n === 1 ? "oaspete" : "oaspeți"}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Data" name="date" type="date" value={form.date} onChange={handleChange} required />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-brand-dark/80 text-sm font-semibold font-sans">Ora Preferată</label>
                    <select
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      required
                      className="bg-brand-cream-50 border border-brand-green-700/15 text-brand-dark rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-green-700/60 transition-colors font-sans"
                    >
                      <option value="" disabled className="bg-brand-cream-50 text-brand-dark">Alege o oră</option>
                      {timeSlots.map((t) => (
                        <option key={t} value={t} className="bg-brand-cream-50 text-brand-dark">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-brand-dark/80 text-sm font-semibold font-sans">Mențiuni Speciale / Alergii (opțional)</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Alergii alimentare, preferințe pentru masă sau ocazii speciale..."
                    className="bg-brand-cream-50 border border-brand-green-700/15 text-brand-dark rounded-xl px-4 py-3 text-sm placeholder:text-brand-dark/40 focus:outline-none focus:border-brand-green-700/60 transition-colors resize-none font-sans"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-brand-green-700 hover:bg-brand-green-800 text-brand-cream-50 font-bold rounded-xl transition-all duration-200 mt-2 shadow-md shadow-brand-green-700/10"
                >
                  Trimite Rezervarea
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label, name, type, value, onChange, required, placeholder,
}: {
  label: string
  name: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-brand-dark/80 text-sm font-semibold font-sans">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="bg-brand-cream-50 border border-brand-green-700/15 text-brand-dark rounded-xl px-4 py-3 text-sm placeholder:text-brand-dark/30 focus:outline-none focus:border-brand-green-700/60 transition-colors font-sans"
      />
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-brand-green-700/60 text-xs uppercase tracking-wider mb-0.5 font-bold font-sans">{label}</div>
        <div className="text-brand-dark text-sm font-medium font-sans">{value}</div>
      </div>
    </div>
  )
}
