import { motion } from "framer-motion"
import { InstagramLogo, FacebookLogo, TiktokLogo } from "@phosphor-icons/react"
import { Calendar, Users, BookOpen, Coffee } from "lucide-react"
import { useTranslation, Trans } from "react-i18next"

const socialLinksKeys = [
  {
    name: "Instagram",
    handle: "@alive_bistro",
    descKey: "community.social.instagram",
    icon: <InstagramLogo size={28} />,
    href: "https://www.instagram.com/alive_bistro/",
    color: "hover:border-brand-green-700/30 hover:bg-brand-green-700/5",
    iconColor: "text-brand-green-700",
  },
  {
    name: "Facebook",
    handle: "ALIVE Bistro",
    descKey: "community.social.facebook",
    icon: <FacebookLogo size={28} />,
    href: "https://facebook.com",
    color: "hover:border-brand-green-700/30 hover:bg-brand-green-700/5",
    iconColor: "text-brand-green-700",
  },
  {
    name: "TikTok",
    handle: "@alive.bistro",
    descKey: "community.social.tiktok",
    icon: <TiktokLogo size={28} />,
    href: "https://tiktok.com",
    color: "hover:border-brand-green-700/30 hover:bg-brand-green-700/5",
    iconColor: "text-brand-green-700",
  },
]

const eventPillarsKeys = [
  {
    icon: <Calendar className="w-6 h-6 text-brand-green-700" />,
    titleKey: "community.pillars.p1_title",
    descKey: "community.pillars.p1_desc",
  },
  {
    icon: <BookOpen className="w-6 h-6 text-brand-green-700" />,
    titleKey: "community.pillars.p2_title",
    descKey: "community.pillars.p2_desc",
  },
  {
    icon: <Users className="w-6 h-6 text-brand-green-700" />,
    titleKey: "community.pillars.p3_title",
    descKey: "community.pillars.p3_desc",
  },
]

const highlightsKeys = [
  { labelKey: "community.stats.members", value: "2,500+" },
  { labelKey: "community.stats.events", value: "120+" },
  { labelKey: "community.stats.workshops", value: "45+" },
  { labelKey: "community.stats.reviews", value: "98%" },
]

export default function Community() {
  const { t } = useTranslation()

  return (
    <section id="community" className="min-h-screen py-24 px-6 bg-brand-cream-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="text-brand-green-700 uppercase tracking-[0.3em] text-xs font-bold mb-3 font-sans">
            {t("community.tagline")}
          </p>
          <h2 className="text-4xl md:text-6xl font-extrabold text-brand-green-700 mb-4 tracking-tight font-serif lowercase">
            <Trans
              i18nKey="community.title"
              components={{ 1: <span className="text-brand-green-500 font-sans" /> }}
            >
              Comunitatea ALIVE<span className="text-brand-green-500 font-sans">.</span>
            </Trans>
          </h2>
          <p className="text-brand-dark/80 max-w-xl mx-auto leading-relaxed font-light text-sm md:text-base font-sans">
            {t("community.desc")}
          </p>
        </motion.div>

        {/* Community Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {eventPillarsKeys.map((pillar, idx) => (
            <motion.div
              key={pillar.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-6 rounded-2xl border border-brand-green-700/10 bg-brand-cream-50 hover:border-brand-green-700/25 hover:bg-white hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-green-700/10 flex items-center justify-center mb-5 text-brand-green-700">
                {pillar.icon}
              </div>
              <h3 className="text-brand-green-700 font-bold text-lg mb-2 font-serif lowercase">{t(pillar.titleKey)}</h3>
              <p className="text-brand-dark/70 text-sm leading-relaxed font-light font-sans">{t(pillar.descKey)}</p>
            </motion.div>
          ))}
        </div>

        {/* Callout section with background texture to highlight events copy exactly from pdf */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 rounded-2xl border border-brand-green-700/12 bg-brand-cream-200/50 mb-24 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6"
        >
          <div className="w-14 h-14 rounded-full bg-brand-green-700/10 flex items-center justify-center flex-shrink-0 text-brand-green-700">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-brand-green-700 font-bold text-lg font-serif lowercase">{t("community.collab_title")}</h4>
            <p className="text-brand-dark/70 text-sm font-sans font-light mt-1 leading-relaxed">
              {t("community.collab_desc")}
            </p>
          </div>
        </motion.div>

        {/* Social Header */}
        <div className="text-center mb-10">
          <span className="text-brand-green-700 text-xs uppercase tracking-widest font-bold font-sans">
            {t("community.follow_us")}
          </span>
          <h3 className="text-3xl md:text-4xl font-bold text-brand-green-700 mt-1 font-serif lowercase">
            {t("community.stay_connected")}
          </h3>
        </div>

        {/* Social Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {socialLinksKeys.map((social, i) => (
            <motion.a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`block p-6 rounded-2xl border border-brand-green-700/10 bg-brand-cream-50 transition-all duration-300 ${social.color}`}
            >
              <div className={`mb-4 ${social.iconColor}`}>{social.icon}</div>
              <h3 className="text-brand-dark font-bold text-lg font-serif">{social.name}</h3>
              <p className="text-brand-green-700 text-xs font-semibold tracking-wider uppercase mt-1 mb-3">{social.handle}</p>
              <p className="text-brand-dark/65 text-xs md:text-sm leading-relaxed font-light font-sans">{t(social.descKey)}</p>
            </motion.a>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-2xl border border-brand-green-700/10 bg-brand-cream-200/60"
        >
          {highlightsKeys.map((h) => (
            <div key={h.labelKey} className="text-center">
              <div className="text-3xl font-extrabold text-brand-green-700 mb-1 tracking-tight font-serif">{h.value}</div>
              <div className="text-brand-dark/60 text-xs font-semibold font-sans">{t(h.labelKey)}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
