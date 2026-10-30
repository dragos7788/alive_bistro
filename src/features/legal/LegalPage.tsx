import { useTranslation } from "react-i18next"
import { company, legalPages, type LegalPageId } from "./company"

interface Section { heading: string; body: string }

export function LegalPage({ pageId }: { pageId: LegalPageId }) {
  const { t } = useTranslation()
  const sections = t(`legal.${pageId}.sections`, { returnObjects: true }) as Section[]

  return (
    <main className="mx-auto max-w-3xl px-6 pb-16 pt-28">
      <h1 className="font-serif text-3xl text-brand-green-800">{t(`legal.${pageId}.title`)}</h1>
      <p className="mt-2 text-sm text-brand-dark/60">{t("legal.updated")}</p>
      <div className="mt-8 space-y-6">
        {sections.map(section => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-brand-green-800">{section.heading}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{section.body}</p>
          </section>
        ))}
        {pageId === "contact" && (
          <dl className="grid gap-2 rounded-lg bg-brand-cream-50 p-4 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="font-semibold">{t("legal.contact.labels.legalName")}</dt><dd>{company.legalName}</dd>
            <dt className="font-semibold">{t("legal.contact.labels.taxId")}</dt><dd>{company.taxId}</dd>
            {company.registrationNumber && <>
              <dt className="font-semibold">{t("legal.contact.labels.registrationNumber")}</dt><dd>{company.registrationNumber}</dd>
            </>}
            <dt className="font-semibold">{t("legal.contact.labels.address")}</dt><dd>{company.address}</dd>
            <dt className="font-semibold">{t("legal.contact.labels.phone")}</dt><dd><a className="underline" href={`tel:${company.phone.replace(/\s/g, "")}`}>{company.phone}</a></dd>
            <dt className="font-semibold">{t("legal.contact.labels.email")}</dt><dd><a className="underline" href={`mailto:${company.email}`}>{company.email}</a></dd>
          </dl>
        )}
      </div>
      <nav aria-label={t("legal.navLabel")} className="mt-10 flex flex-wrap gap-4 border-t border-brand-green-800/15 pt-6 text-sm">
        {legalPages.filter(id => id !== pageId).map(id => (
          <a key={id} href={`/legal/${id}`} className="underline hover:text-brand-green-700">{t(`legal.${id}.title`)}</a>
        ))}
      </nav>
    </main>
  )
}
