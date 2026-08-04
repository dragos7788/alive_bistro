import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Coffee, Leaf, Users, Sparkles, Compass, Heart, Eye } from "lucide-react"
import { useTranslation, Trans } from "react-i18next"
import aliveLogo from "../assets/Group of 7 Objectslogo verde svg.svg"

const brandValuesKeys = [
  {
    icon: <Compass className="w-8 h-8 text-brand-green-700" />,
    titleKey: "home.values.v1_title",
    textKey: "home.values.v1_text",
  },
  {
    icon: <Heart className="w-8 h-8 text-brand-green-700" />,
    titleKey: "home.values.v2_title",
    textKey: "home.values.v2_text",
  },
  {
    icon: <Users className="w-8 h-8 text-brand-green-700" />,
    titleKey: "home.values.v3_title",
    textKey: "home.values.v3_text",
  },
  {
    icon: <Eye className="w-8 h-8 text-brand-green-700" />,
    titleKey: "home.values.v4_title",
    textKey: "home.values.v4_text",
  },
]

const conceptPillarsKeys = [
  {
    titleKey: "home.pillars.p1_title",
    descKey: "home.pillars.p1_desc",
    img: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  },
  {
    titleKey: "home.pillars.p2_title",
    descKey: "home.pillars.p2_desc",
    img: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80",
  },
  {
    titleKey: "home.pillars.p3_title",
    descKey: "home.pillars.p3_desc",
    img: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=800&q=80",
  },
]

function ParallaxHero() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section ref={ref} className="relative h-screen overflow-hidden flex items-start justify-center pt-28 md:pt-36 bg-brand-cream-100">
      {/* Background with warm overlay */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center scale-110 opacity-30"
      />
      {/* Botanical/Natural Warm Overlay matching flyer layout */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-cream-100/40 via-brand-cream-100/75 to-brand-cream-100" />

      {/* Hero content */}
      <motion.div style={{ opacity }} className="relative z-10 text-center px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-green-700/10 border border-brand-green-700/20 text-brand-green-800 text-xs uppercase tracking-[0.2em] font-bold mb-6 font-sans"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-green-700" />
          {t("home.hero.tagline")}
        </motion.div>
        
        <motion.img
          src={aliveLogo}
          alt="Alive Bistro"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-64 md:w-96 mx-auto mb-6"
        />
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-brand-dark/90 text-2xl md:text-4xl mb-12 max-w-2xl mx-auto leading-relaxed font-dancing"
        >
          <Trans
            i18nKey="home.hero.subtitle"
            components={{
              span1: <span className="text-brand-green-800" />,
              span2: <span className="text-brand-green-800" />,
              span3: <span className="text-brand-green-700" />,
            }}
          />
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="#menu"
            className="w-full sm:w-auto px-8 py-4 bg-brand-green-700 hover:bg-brand-green-800 active:bg-brand-green-900 text-brand-cream-50 font-bold rounded-full transition-all duration-200 shadow-md shadow-brand-green-700/15 text-center"
          >
            {t("home.hero.button")}
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-brand-green-700/50 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold font-sans">{t("home.hero.scrollDown")}</span>
        <div className="w-px h-10 bg-gradient-to-b from-brand-green-700/40 to-transparent" />
      </motion.div>
    </section>
  )
}

function BrandStorySection() {
  const { t } = useTranslation()

  return (
    <section className="py-24 md:py-32 px-6 bg-brand-cream-100">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Text copy matching exactly the PDF content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-brand-green-700 uppercase tracking-[0.25em] text-xs font-bold block mb-3 font-sans">
              {t("home.story.concept")}
            </span>
            <h2 className="text-4xl md:text-6xl font-extrabold text-brand-green-700 mb-8 tracking-tight leading-tight font-serif lowercase">
              <Trans
                i18nKey="home.story.title"
                components={{ 1: <span className="text-brand-green-500 font-sans" /> }}
              >
                Mâncare cu sens, stare de bine și energie zilnică<span className="text-brand-green-500 font-sans">.</span>
              </Trans>
            </h2>
            
            <div className="space-y-6 text-brand-dark/80 text-base md:text-lg leading-relaxed font-light font-sans">
              <p>
                <Trans
                  i18nKey="home.story.p1"
                  components={{ 1: <strong className="text-brand-dark font-semibold" /> }}
                >
                  <strong className="text-brand-dark font-semibold">Alive</strong> este un concept de Bistro modern construit în jurul ideii de echilibru între mâncare bună, cafea de specialitate, băuturi funcționale, energie, stil de viață sănătos și comunitate.
                </Trans>
              </p>
              <p>
                {t("home.story.p2")}
              </p>
              <p>
                {t("home.story.p3")}
              </p>
            </div>
            
            {/* Embedded highlights */}
            <div className="grid grid-cols-2 gap-6 mt-10 pt-8 border-t border-brand-green-700/10">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green-700/10 flex items-center justify-center flex-shrink-0 text-brand-green-700">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-brand-dark font-bold text-sm font-sans">{t("home.story.coffee_title")}</h4>
                  <p className="text-brand-green-700/60 text-xs mt-1 font-sans">{t("home.story.coffee_desc")}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green-700/10 flex items-center justify-center flex-shrink-0 text-brand-green-700">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-brand-dark font-bold text-sm font-sans">{t("home.story.nutrition_title")}</h4>
                  <p className="text-brand-green-700/60 text-xs mt-1 font-sans font-light">{t("home.story.nutrition_desc")}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Beautiful grid of cozy images illustrating the PDF concept */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-12 gap-4 relative"
          >
            {/* Background glowing ambient light to represent warmth */}
            <div className="absolute -inset-10 bg-brand-green-700/5 filter blur-3xl rounded-full pointer-events-none" />

            <div className="col-span-8 overflow-hidden rounded-2xl border border-brand-green-700/10 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80"
                alt="Alive Interior Cozy Space"
                className="w-full h-64 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="col-span-4 overflow-hidden rounded-2xl border border-brand-green-700/10 shadow-2xl mt-12">
              <img
                src="https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=500&q=80"
                alt="Specialty Coffee"
                className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="col-span-5 overflow-hidden rounded-2xl border border-brand-green-700/10 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80"
                alt="Healthy Balanced Bowl"
                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="col-span-7 overflow-hidden rounded-2xl border border-brand-green-700/10 shadow-2xl -mt-6">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80"
                alt="Socializing & Studying at Alive"
                className="w-full h-56 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

function PillarsSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 px-6 bg-brand-cream-200 border-t border-brand-green-700/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-brand-green-700 uppercase tracking-widest text-xs font-bold block mb-2 font-sans">
            {t("home.pillars.subtitle")}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-brand-green-700 tracking-tight font-serif lowercase">
            <Trans
              i18nKey="home.pillars.title"
              components={{ 1: <span className="text-brand-green-500 font-sans" /> }}
            >
              Mai mult decât un bistro: un stil de viață<span className="text-brand-green-500 font-sans">.</span>
            </Trans>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {conceptPillarsKeys.map((pillar, idx) => (
            <motion.div
              key={pillar.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-brand-cream-100 rounded-2xl border border-brand-green-700/10 overflow-hidden hover:border-brand-green-700/30 hover:bg-brand-cream-50 transition-all duration-300 group"
            >
              <div className="h-48 overflow-hidden relative">
                <img
                  src={pillar.img}
                  alt={t(pillar.titleKey)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-brand-green-700 mb-2 group-hover:text-brand-green-800 transition-colors font-serif lowercase">
                  {t(pillar.titleKey)}
                </h3>
                <p className="text-brand-dark/70 text-sm leading-relaxed font-light font-sans">
                  {t(pillar.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ValuesSection() {
  const { t } = useTranslation()

  return (
    <section className="py-24 md:py-32 px-6 bg-brand-cream-100 border-t border-brand-green-700/5">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <span className="text-brand-green-700 uppercase tracking-[0.25em] text-xs font-bold block mb-3 font-sans">
            {t("home.values.subtitle")}
          </span>
          <h2 className="text-4xl md:text-6xl font-bold text-brand-green-700 mb-6 tracking-tight font-serif lowercase">
            <Trans
              i18nKey="home.values.title"
              components={{ 1: <span className="text-brand-green-500 font-sans" /> }}
            >
              În ce credem noi?<span className="text-brand-green-500 font-sans">.</span>
            </Trans>
          </h2>
          <p className="text-brand-dark/80 text-lg font-light leading-relaxed font-sans">
            <Trans
              i18nKey="home.values.description"
              components={{ 1: <strong className="text-brand-green-700 font-semibold" /> }}
            >
              Misiunea <strong className="text-brand-green-700 font-semibold">Alive</strong> este să facă stilul de viață sănătos să pară mai firesc, mai echilibrat și mai sustenabil. Credem în mâncare reală, suplimente nutritive, ingrediente de calitate și experiențe care îi fac pe oameni să se simtă bine și în armonie cu ei înșiși.
            </Trans>
          </p>
        </motion.div>

        {/* Brand Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {brandValuesKeys.map((value, idx) => (
            <motion.div
              key={value.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-8 rounded-2xl border border-brand-green-700/10 bg-brand-cream-50 hover:border-brand-green-700/25 hover:bg-white/80 transition-all duration-300 flex gap-6"
            >
              <div className="w-14 h-14 rounded-xl bg-brand-green-700/10 flex items-center justify-center flex-shrink-0 text-brand-green-700">
                {value.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-green-700 mb-2 font-serif lowercase">{t(value.titleKey)}</h3>
                <p className="text-brand-dark/70 text-sm leading-relaxed font-light font-sans">{t(value.textKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <ParallaxHero />
      <BrandStorySection />
      <PillarsSection />
      <ValuesSection />
    </main>
  )
}
