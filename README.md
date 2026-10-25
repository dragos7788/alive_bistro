# ALIVE Bistro

Site public + admin dashboard pentru meniu. Stack: React + Vite, Cloudflare Pages, D1 (SQLite), R2 (imagini), Cloudflare Access (auth admin).

## Setup complet (prima dată)

### 1. Creează resursele Cloudflare

```sh
wrangler d1 create alive-bistro-menu
# → copiază database_id din output în wrangler.jsonc → d1_databases[0].database_id

wrangler r2 bucket create alive-bistro-media
```

### 2. Aplică schema și seed-ul

```sh
npm run db:migrate   # creează tabelele categories + items
npm run db:seed      # înlocuiește meniul cu datele din src/features/menu/menu-data.json

# verificare:
wrangler d1 execute alive-bistro-menu --local --command="SELECT count(*) FROM items"
# → { "count(*)": 81 }
```

Meniul din PDF-urile din 21 și 23 septembrie include ingredientele și alergenii
declarați pentru cele 26 de preparate, plus calorii, proteine, carbohidrați și
grăsimi per porție. Post Workout Shake este singura băutură cu valori nutriționale
declarate în PDF; valorile pentru celelalte băuturi sunt estimări orientative per
porție și sunt marcate ca atare în meniu. Pentru mousse, budinca de chia și panna
cotta nu sunt precizați carbohidrații totali; zaharurile nu sunt folosite ca
înlocuitor și nu estimăm valori.

După modificarea datelor, rulează din nou `npm run db:seed` pentru meniul servit de
API-ul local. **Seed-ul înlocuiește meniul existent, inclusiv editările din admin.**
Generatorul păstrează ingredientele, alergenii și macronutrienții în D1; fotografiile
locale și macronutrienții lipsă din răspunsul API sunt completate din sursa comună.

Fotografiile din carduri și din detalii folosesc un cadru pătrat, aliniat la baza
imaginii, fără zoom la hover, pentru a păstra vizibile farfuriile și paharele.
Produsele fără fotografie afișează un simbol decorativ al categoriei pe un fundal
crem-verde, în același cadru pătrat, atât în carduri, cât și în detalii.

Pe mobil, categoriile meniului se aleg dintr-un buton care afișează categoria
activă. Panoul deschis prezintă toate categoriile în două coloane, fără derulare
orizontală, și se închide după alegere, la apăsarea Escape sau la apăsare în
exterior. Pe desktop se păstrează bara de categorii cu derulare.
Controalele mobile au spațiere constantă de 12 px între rânduri și nu se
micșorează la derulare.

`npm run images:optimize` generează local variante WebP de 480, 800 și 1200 px
cu Sharp, fără a modifica JPG-urile originale. Comanda rulează automat înainte de
`npm run dev` și `npm run build`; directorul generat `src/assets/menu/optimized/`
nu se versionează. După adăugarea sau înlocuirea unei fotografii, repornește dev
sau rulează generatorul. Browserul alege varianta prin `srcSet` și `sizes`.
Primele două carduri se încarcă normal; restul folosesc lazy loading, iar detaliile
încarcă imaginea la deschidere. Fotografiile personalizate din API rămân prioritare.

### 3. Configurează Cloudflare Access pentru /admin

În [Cloudflare Zero Trust](https://one.dash.cloudflare.com):
1. **Access → Applications → Add an application** → tip: Self-hosted
2. Application domain: `alive-bistro.pages.dev/admin*`
3. Policy: Allow → Emails → adaugă adresele care pot accesa dashboard-ul
4. Identity providers: One-time PIN (nu necesită cont extern)

### 4. Dev local (full stack)

```sh
npm run dev:cf      # build + wrangler pages dev → http://localhost:8788
# Admin: http://localhost:8788/admin
# Meniu public: http://localhost:8788/#menu
```

> Local, Cloudflare Access nu e activ. Headerul `Cf-Access-Authenticated-User-Email` lipsește,
> deci endpoint-urile `/api/admin/*` returnează 401. Pentru a testa admin-ul local, adaugă
> temporar headerul în request (ex: Postman, sau dezactivează `requireAdmin` în dev).

### 5. Deploy în producție

```sh
npm run db:migrate:prod   # aplică migrările pe D1 prod
npm run deploy            # build + wrangler pages deploy
```

---

## Meniu Performance / Build your performance

Secțiunea `#custom-menu`, accesibilă din navigație, din bara sticky a meniului și
din butonul „Construiește-ți farfuria” de lângă „Explorează Meniul” din prima secțiune,
explică cei patru pași și include un calculator pentru o farfurie personalizată.
Introducerea configuratorului conține doar text și butonul de configurare, fără
fotografie de prezentare.
Linkurile „Construiește-ți farfuria” și „Meniu Performance” sunt evidențiate cu
chenar și text portocaliu. Accesul la configurator este disponibil și în bara
sticky a meniului, lângă selectorul de mâncare/băuturi.
Clientul poate alege o opțiune din fiecare categorie (proteine, carbohidrați,
legume/fibre, sosuri), poate schimba porția sau poate omite orice categorie.
Porțiile sunt afișate ca opțiuni radio vizibile cu gramaj și preț, fără dropdown,
cu selecție evidențiată și navigare din tastatură.
În toate cele patru categorii, porțiile apar direct în cardul produsului selectat:
lângă numele produsului pe desktop și imediat sub el pe mobil. Descrierea și
alergenii rămân în același card, iar schimbarea produsului afișează doar porțiile
acestuia. Pentru legume și sosuri se păstrează porțiile fixe din meniu.
Rezumatul afișează ingredientele, costul total în RON, caloriile, proteinele,
carbohidrații și alergenii declarați. Cantitățile în grame și mililitri sunt
afișate separat. Butonul de resetare golește toate alegerile.

Sursa pentru calculator este `src/features/menu-builder/calculator.ts`, transcrisă
din imaginile meniului custom furnizate. Prețurile și valorile nutriționale sunt
păstrate pentru fiecare porție declarată, nu calculate proporțional; de exemplu,
somonul are doar porții de 100 și 150 g. Grăsimile nu sunt totalizate, deoarece
pentru proteine sursa le declară doar per 100 g, iar tabelele per porție au valori
care nu sunt întotdeauna proporționale. Actualizarea meniului obișnuit din admin
nu modifică acest catalog separat; modificările se fac în sursa calculatorului,
cu verificarea prețurilor, gramajelor și a testelor.

Combinația poate fi adăugată în coș din rezumat, dacă are cel puțin un ingredient.
Se păstrează opțiunea de a omite categorii. Coșul salvează ingredientele și porțiile
după reîncărcare, dar selecția activă a configuratorului se resetează.
Configuratorul nu trimite comenzi. Disponibilitatea și prețul se confirmă cu echipa la bistro.
Interfața este disponibilă în română și engleză prin traducerile existente.

Validare calculator: `npx vitest run src/features/menu-builder/calculator.test.ts`.

## Coș de cumpărături — etapa 1

Produsele din meniul obișnuit pot fi adăugate în coș din card sau din detalii.
Butonul „Vezi coșul” deschide rezumatul cu modificarea cantităților, eliminare
și total estimat în RON. Coșul este păstrat în `localStorage` pe browserul curent;
erorile de citire/salvare sunt afișate explicit. Nu necesită autentificare.
Produsele cu prețuri sticlă/pahar au butoane distincte pentru porțiile declarate
(750 ml / 125 ml), cu prețul fiecăreia afișat explicit și linii separate în coș.
Prețurile sunt calculate în bani întregi din meniul încărcat, nu din valori
monetare salvate în browser. Produsele lipsă din meniu sau cu preț neinterpretabil
sunt marcate indisponibile și împiedică afișarea unui total incomplet.
În lipsa API-ului, meniul folosește în continuare catalogul local de rezervă;
totalul rămâne orientativ, nu o ofertă validată de server.

Coșul public nu trimite comenzi și nu încasează plăți. Excepția este modul
local TEST descris în etapa 3, unde comenzile fictive se salvează în D1 local.
Configuratorul Performance folosește același coș: combinațiile identice
cresc cantitatea, iar ingredientele sau porțiile diferite produc linii separate.
Coșul afișează ingredientele și cantitățile fiecărei farfurii, în română sau engleză.
Prețul este recalculat din catalogul configuratorului, nu preluat din stocarea locală.
Ingredientele sau porțiile eliminate din catalog fac farfuria indisponibilă.
Integrarea EuPlătesc și activarea comenzilor reale vor fi implementate separat.
Identificarea locală folosește categoria și numele produsului; redenumirea sau
mutarea unui produs face intrarea veche indisponibilă. Înainte de comenzile reale,
identificarea trebuie migrată pe ID-urile persistente din baza de date.

Validare logică: `npx vitest run src/features/cart/cart.test.ts`.

## Ridicare fără cont — etapa 2 (previzualizare)

Un coș nevid cu total calculabil permite accesul la „Date pentru ridicare”.
Formularul validează numele, telefonul (7–15 cifre, prefix opțional) și e-mailul,
apoi afișează datele pentru verificare, alături de produsele și totalul din coș.
Ridicarea folosește adresa deja afișată în footer; nu se selectează o oră, iar
timpul de pregătire este explicit neconfirmat. Nu se oferă livrare.

În modul public de previzualizare, datele de contact rămân exclusiv în memoria componentei: nu sunt trimise la API,
nu sunt salvate în localStorage și se șterg la închiderea coșului, revenirea din
formular la coș sau reîncărcare. Nu se creează comenzi, rezervări de stoc sau plăți.
Administrarea prețurilor/stocului și EuPlătesc rămân etape ulterioare.
Teste: `npx vitest run src/features/cart/checkout.test.ts`.

## Comenzi TEST locale — etapa 3

```sh
npm run db:migrate
# Doar la prima inițializare, dacă meniul local este gol:
npm run db:seed
npm run dev:orders
```

**Seed-ul înlocuiește meniul local; nu îl rula peste editări pe care vrei să le păstrezi.**
Scriptul pornește serverul full-stack doar pe `127.0.0.1`, implicit portul 8788,
cu `LOCAL_TEST_ORDERS=true`. Data de compatibilitate este fixată la 2026-08-06,
acceptată de runtime-ul instalat. Nu sunt necesare chei EuPlătesc.

În coș: „Date pentru ridicare” → completează **date fictive** → verificare →
„Salvează comandă TEST — fără plată”. Numărul `TEST-<UUID>` confirmă salvarea
în D1 local; nu reprezintă o comandă reală sau dovada unei plăți.
Coșul nu se golește automat în modul TEST.

La `/admin/orders` sau în tabul „Comenzi TEST” apar datele de contact, produsele,
porțiile Performance, cantitățile, prețurile unitare și totalul salvate la creare.
Starea de pregătire urmează `new → preparing → ready → collected`, cu anulare
înainte de ridicare. Plata rămâne obligatoriu `unpaid`, independent de pregătire.
Stările terminale nu se redeschid. Modificările concurente sunt respinse explicit.
Lista afișează 50 de comenzi pe pagină, cu încărcarea paginii următoare.

API-ul este blocat inclusiv pentru citire în afara adreselor loopback sau fără
flagul explicit. Scrierile verifică și antetul Origin. Endpoint-urile TEST locale
nu cer Cloudflare Access. Același mod local permite lista categoriilor și
editarea/crearea/ascunderea produselor pentru testarea stocului; celelalte funcții
admin își păstrează protecția existentă. Excepția nu permite acces public.
Nu configura proxy-uri publice către serverul local.
Nu activa flagul în mediile de deploy. Frontendul public rămâne în previzualizare,
iar serverul refuză comenzile chiar dacă flagul este configurat accidental pe un domeniu public.

Contract:
- `GET /api/orders/config` → `{ data: { testOrdersEnabled: boolean } }`, fără cache.
- `POST /api/orders`, JSON `{ contact, items, expectedTotalBani }`, antet UUID
  `Idempotency-Key` → `{ data: TestOrder }`, 201 la creare / 200 la reîncercare.
- `GET /api/admin/orders?before=<cursor>` → `{ data: TestOrder[], next: string | null }`.
- `PATCH /api/admin/orders/:number`, JSON `{ status, expectedStatus }` → `{ data: TestOrder }`.
- Erorile folosesc `{ error: { code, message, details } }`; 400 date invalide,
  403 mod/origine interzisă, 409 preț schimbat/indisponibilitate/conflict, 500 eroare D1.

Serverul validează contactele și recalculează produsele vizibile din D1, inclusiv
sticlă/pahar, iar Performance din catalogul comun. Nu acceptă nume/prețuri din
browser ca sursă de adevăr. Se păstrează un snapshot al liniilor.
Produsele cu stoc numeric sunt rezervate atomic în baza locală la salvarea
comenzii TEST; anularea reface stocul o singură dată. Comenzile TEST anterioare
migrării de stoc nu consumă și nu refac stoc retroactiv.
Limite TEST: 100 de linii, 99 de bucăți pe linie, 64 KiB JSON.
Reîncercările neschimbate folosesc aceeași cheie cât timp rămâi în pasul de verificare;
după o eroare de rețea reîncearcă acolo, nu recrea formularul.

Datele fictive trimise sunt persistente în baza locală `.wrangler/state/`, ignorată
de Git. Închiderea formularului nu șterge comenzile salvate. Formularul nu salvează
contactele în localStorage. Nu există notificări, pregătire reală sau rambursări.
Teste: `npx vitest run functions/_lib/test-orders.test.ts`.

## Băuturi, disponibilitate și stoc

Lista existentă din **Produse → Băuturi** folosește categoriile și produsele din
aceeași bază ca meniul public; nu există o copie separată a băuturilor.
Ruta `/admin/drinks` deschide direct această listă.
Aplică `npm run db:migrate` înainte de `npm run dev:orders`. Migrările
`0003_item_stock.sql` și `0004_stock_guards.sql` adaugă stocul, rezervările locale
și protecțiile tranzacționale. Produsele existente pornesc disponibile,
fără urmărire numerică și fără cantitate publică.

În „Editează produs”:
- **Vizibil în meniu** ascunde sau afișează complet produsul.
- **Disponibil pentru comandă** permite blocarea manuală, păstrând produsul vizibil.
- **Stoc numeric** gol = fără urmărire; `0` = indisponibil; întreg pozitiv = bucăți
  rămase, maximum 1.000.000.
- **Afișează clientului cantitatea din stoc** publică numărul numai dacă există
  urmărire numerică. Când este debifat, API-ul public nu trimite cantitatea.
- Prețurile sticlă/pahar permit doar disponibilitate comună, nu stoc numeric.

Produsul e comandabil numai dacă este vizibil, disponibil manual și nu are stoc
zero. Butoanele din card și detalii se dezactivează; coșul și serverul verifică
din nou disponibilitatea/cantitățile. Stocul ascuns este verificat pe server, fără
a dezvălui clientului valoarea. Meniul public cere revalidare HTTP; dacă API-ul nu
este disponibil, catalogul local rămâne orientativ, iar serverul nu acceptă o
comandă fără validarea bazei. Reîncarcă meniul după modificări în admin.

Rezervarea comenzilor TEST și inserarea comenzii sunt într-o singură tranzacție D1.
Două comenzi pentru ultima bucată nu pot fi acceptate ambele. Reîncercările cu
aceeași cheie nu scad din nou; anularea repetată nu dublează stocul returnat.
Produsele fără urmărire nu se scad. Nu schimba modul numeric/fără urmărire cât
există comenzi TEST active pentru produs. Editările cu stoc învechit sunt respinse,
iar produsele cu istoric de rezervări trebuie ascunse, nu șterse.
Nu rula seed peste rezervări existente: generatorul înlocuiește meniul și
legăturile de inventar îl vor bloca. Testele automate folosesc baze SQLite izolate.

Aceste reguli se aplică exclusiv comenzilor locale TEST; comenzile publice și
plata rămân dezactivate. Configuratorul Performance nu are încă stoc pe ingrediente.

## Scripturi disponibile

| Script | Descriere |
|--------|-----------|
| `npm run dev` | Dev frontend (fără Functions, meniu din seed) |
| `npm run dev:cf` | Dev full stack cu wrangler pages dev |
| `npm run dev:orders` | Dev full stack loopback cu salvare comenzi TEST neplătite |
| `npm run build` | Build producție |
| `npm run deploy` | Build + deploy pe Cloudflare Pages |
| `npm run db:migrate` | Aplică migrări D1 local |
| `npm run db:migrate:prod` | Aplică migrări D1 producție |
| `npm run db:seed` | Generează și execută seed SQL local |

---

## Structură relevantă

```
src/features/menu/
  types.ts      — tipuri serializabile (MenuItem, MenuCategory, MenuGroup)
  icons.tsx     — resolveIcon(key, size) — registry iconițe
  menu-data.json — sursa meniului nou și asocierea fotografiilor
  seed.ts       — date fallback (folosite când API-ul nu e disponibil)
  api.ts        — getMenu() cu fallback pe seed
  tags.ts       — tagColors pentru badge-uri

src/pages/admin/
  AdminApp.tsx        — shell admin
  ItemForm.tsx        — dialog creare/editare produs
  ImageUploader.tsx   — upload R2
  CategoryManager.tsx — CRUD categorii + reordonare

functions/
  _lib/           — response helpers, auth, validate
  api/menu.ts     — GET /api/menu (public, ETag)
  api/images/     — GET /api/images/:key (R2)
  api/admin/      — CRUD items + categories + upload (protejat Access)

migrations/
  0001_init.sql   — schema categories + items
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
