import { useTranslation } from "react-i18next"
import halloweenPoster from "../../assets/menu/halloween/A4-Halloween-Special.png"

export function HalloweenMenuBanner() {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="halloween-menu-title"
      className="mb-6 rounded-3xl border border-orange-900/10 bg-[#fff4e8] p-4 shadow-sm sm:p-7"
    >
      <h2 id="halloween-menu-title" className="sr-only">
        {t("menu.halloweenTitle")}
      </h2>
      <a
        href={halloweenPoster}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700"
      >
        <img
          src={halloweenPoster}
          alt={t("menu.halloweenPosterAlt")}
          className="mx-auto h-auto w-full rounded-2xl"
          decoding="async"
        />
        <span className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-orange-300 bg-orange-50 px-5 py-2 text-sm font-semibold text-orange-950 transition-colors hover:bg-orange-100">
          {t("menu.halloweenOpenPoster")}
        </span>
      </a>
    </section>
  )
}
