# ALIVE Bistro

Site public + admin dashboard pentru meniu. Stack: React + Vite, Cloudflare Pages, D1 (SQLite), R2 (imagini), Cloudflare Access (auth admin).

## Pagini publice

- `/`: prezentarea bistroului si comunitatea.
- `/menu`: meniul, cosul si configuratorul Performance (`/menu#custom-menu`).
- `/account`: contul clientului; autentificarea ramane in modal.
- `/calorie-journal`: jurnal privat de calorii disponibil clientilor autentificati.

Linkurile vechi `/#menu`, `/#custom-menu` si `/#menu-calculator` redirectioneaza
catre sectiunea corespunzatoare de pe `/menu`, pastrand parametrii URL.
Navigarea intre pagini foloseste linkuri native si fallback-ul SPA Cloudflare Pages.
Cosul ramane persistent la navigare si reincarcare.

## Conturi clienti, recomandari si puncte (pregatire BT iPay)

Pagina **Contul meu** (`/account`) foloseste Google OpenID Connect si Facebook
Login. Bara de navigare include un avatar cu initiale si indicator de autentificare
confirmat prin sesiunea serverului, vizibil si pe mobil. Apasarea deschide contul;
deconectarea actualizeaza imediat avatarul. Doar autentificarea se deschide
intr-un modal Headless UI cu focus blocat in interior, revenirea focusului la
declansator si inchidere prin Escape, fundal sau buton. `#account` deschide
loginul pentru vizitatori, inclusiv din linkuri de recomandare; inchiderea
elimina fragmentul fara reincarcarea paginii. Dupa login, callback-ul deschide
`/account`, cu puncte, vouchere, recomandari, QR si istoric, fara modal. Linkurile vechi
`#account` duc clientii autentificati la aceasta pagina. Vizitatorii care acceseaza
direct `/account` primesc un buton de autentificare. Navigarea foloseste linkuri
native, ca paginile existente, si fallback-ul SPA Cloudflare Pages.
Google continua pe pagina oficiala
a furnizorului, nu intr-un iframe. Sunt afisati doar furnizorii configurati.
Ecranul de login prioritizeaza butonul Google, un mesaj scurt de bun venit si
nota ca punctele din cumparaturi vor fi acordate dupa activarea comenzilor online.
Codul de recomandare este intr-o sectiune extensibila, deschisa automat cand exista
un cod. Cardul de membru afiseaza un salut scurt, soldul, voucherele si
butonul de copiere a linkului de recomandare; la eroare ofera copiere manuala.
Voucherul de bun venit de 10% se acorda automat o singura data si expira dupa
30 de zile. Clientii pot schimba 1.000 de puncte pentru un voucher de 10%;
punctele se scad la emitere, iar voucherul expira dupa 30 de zile. Codurile sunt
vizibile in cont; aplicarea lor la checkout necesita activarea comenzilor online.
Linkul este afisat alaturi de un cod QR SVG generat local cu `qrcode.react`,
fara transmiterea datelor catre un serviciu extern. QR-ul codifica exact acelasi
URL, inclusiv codul personal si `#account`. In dezvoltarea pe loopback, scanarea
de pe alt dispozitiv nu poate accesa serverul local; pentru distribuire reala
este necesar `AUTH_ORIGIN` pe domeniul public HTTPS.
Istoricul si regulile sunt extensibile, iar conectarea altui provider apare doar
cand exista un provider configurat inca neconectat. Actualizarea manuala apare
doar la eroare.
Sesiunea se reverifica la revenirea
in pagina/tab, iar erorile sunt marcate ca stare neverificata, nu ca autentificare.
Nu se stocheaza fotografii de profil sau identitati in localStorage.

`wrangler.jsonc` fixeaza `compatibility_date` la `2026-08-06` pentru acelasi
comportament Web Crypto local si in productie. Compatibilitatea veche nu expune
identificatorul `CryptoKey` necesar verificarii semnaturilor Google prin `jose`.
Diagnosticul callback-ului inregistreaza doar etapa si codul tehnic al erorii,
niciodata tokenuri, coduri OAuth sau profilul clientului.

Autentificarea foloseste Google OpenID Connect si Facebook
Login, prin authorization code flow pe server. Google foloseste PKCE, nonce si
validare JWT (semnatura, issuer, audience, expirare). Facebook verifica tokenul
cu `debug_token`, aplicatia emitenta si identitatea din `/me`.
Nu exista autentificare simulata sau bypass local pentru clienti.

In mediul local verificat nu sunt configurate credențiale OAuth/iPay; nu au fost
verificate conturile externe din Google Cloud, Meta sau BT. Fara configurare,
butoanele de login sunt dezactivate explicit. Nu confunda Google Pay cu Google
Login sau Apple Pay cu Sign in with Apple: sunt servicii separate.

### Activarea autentificarii

1. Aplica migrarile pana la `0014_marketing_invitation.sql` cu
   `npm run db:migrate` pentru baza locala. Migrarea 0010 adauga voucherele si
   acorda voucherul de bun venit clientilor existenti; clientii noi il primesc
   la crearea contului. Migrarea 0011 adauga istoricul utilizarii voucherelor.
   Migrarea 0012 adauga jurnalul de acorduri pentru marketing prin email.
   Migrarea 0013 adauga acordurile push, abonamentele si istoricul campaniilor.
   Migrarea 0014 retine afisarea unica a invitatiei de marketing pe cont.
   In productie, fa backup D1 si aplica migrarea explicit pe mediul vizat
   (`npx wrangler d1 migrations apply alive-bistro-menu --remote`) inainte de deploy.
2. In [Google Cloud Console](https://console.cloud.google.com/auth/clients),
   creeaza OAuth client de tip Web application si configureaza consent screen.
   Adauga URI-ul exact `https://DOMENIU/api/customer/callback`
   (pentru local foloseste acelasi origin ca browserul).
   Configureaza utilizatori de test daca aplicatia este in modul Testing.
3. In [Meta for Developers](https://developers.facebook.com/apps/), creeaza/configureaza
   aplicatia cu Facebook Login, URL-ul site-ului si acelasi callback exact.
   Configureaza versiunea Graph API suportata de aplicatie; obtine aprobarile,
   politica de confidentialitate si cerintele de stergere a datelor necesare
   inainte de folosirea cu clienti reali.
4. Local, copiaza `.dev.vars.example` in `.dev.vars` si completeaza
   `AUTH_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_API_VERSION`.
   `AUTH_ORIGIN` este un origin exact fara slash final, HTTPS in productie,
   localhost/127.0.0.1 pentru dezvoltare. Repornește Wrangler dupa configurare.
5. In Cloudflare Pages seteaza valorile separat pentru Preview/Production;
   secretele se stocheaza ca secret bindings, niciodata cu prefix `VITE_`.
   Foloseste aplicatii si redirect URI dedicate mediilor de test.

API: `GET /api/customer/me`, `POST /api/customer/start` cu
`{provider,referral?,link?,marketingEmailConsent?}`, `GET /api/customer/callback`,
`POST /api/customer/logout`, `POST /api/customer/vouchers` pentru schimbarea a
1.000 de puncte cu un voucher si `POST /api/customer/marketing` cu
`{emailMarketingConsent:boolean}` pentru acordul sau retragerea acordului.
Raspunsurile folosesc `no-store`; scrierile cer Origin exact.
State-ul OAuth este unic, legat de cookie si valabil 10 minute. Sesiunea dureaza
7 zile, cu token opac hash-uit in D1 si cookie HttpOnly/SameSite=Lax/Secure pe
HTTPS, fara tokenuri in localStorage. Codurile/tokenurile providerilor nu se
returneaza clientului si nu se pastreaza dupa autentificare.
Middleware-ul de cont nu inlocuieste Cloudflare Access pentru admin.

La autentificare, abonarea la noutati si oferte prin email este optionala si
nebifata implicit. Callback-ul inregistreaza doar o alegere explicita si
respinge activarea daca nu exista o adresa de email disponibila. Clientul poate
modifica sau retrage acordul din cont; evenimentele includ sursa, versiunea
informarii si data, iar adminul le poate consulta in istoricul clientului.
Aceasta functie gestioneaza preferinta tehnica pentru email; nu trimite campanii
si nu reprezinta singura o conformitate GDPR completa. Inainte de campanii,
publica si leaga informarea completa de confidentialitate cu identitatea si
datele de contact ale operatorului, scopurile, temeiurile, retentia, drepturile
si destinatarii datelor; configureaza dezabonarea/suprimarea in platforma de
email si valideaza fluxul cu responsabilul juridic/DPO.

Dupa autentificare, invitatia „Lucruri bune, din cand in cand” ofera separat
email si push pentru canalele fara o alegere anterioara. O retragere existenta
nu declanseaza o noua solicitare. Emailul este oferit doar conturilor cu adresa
disponibila, iar push doar dupa configurarea VAPID. Daca niciun canal nu este
disponibil, invitatia nu este consumata. `POST /api/customer/marketing-invitation`
cu `{action:"claim"}` rezerva atomic afisarea o singura data pe cont, inclusiv
intre dispozitive, fara sa acorde consimtamant. Inchiderea, Escape si „Nu acum”
nu activeaza niciun canal si nu afecteaza contul sau voucherul. Reincarcarea
dupa rezervare nu mai afiseaza invitatia; preferintele raman disponibile in cont.
Permisiunea browserului se cere doar din butonul explicit pentru push.

### Campanii Web Push (optional)

Instalarea PWA nu aboneaza clientul la marketing. In cont exista o actiune
explicita pentru oferte prin push (`push-marketing-v1`), separata de acordul email.
Doar dupa aceasta actiune se cere permisiunea browserului. Refuzul nu afecteaza
contul, punctele sau voucherul. Retragerea elimina de pe server toate abonamentele
push ale contului; mesajele deja acceptate de un serviciu push pot inca ajunge.
Abonamentele unui dispozitiv nu se transfera intre clienti.

Configurare inainte de activare:

1. Aplica migrarile 0012, 0013 si `0014_marketing_invitation.sql` local, apoi separat in productie
   dupa backup D1. Nu publica functiile inainte de migrari.
2. Ruleaza `npm run push:keys` intr-un terminal privat o singura data. Pastreaza
   perechea stabila; schimbarea ei necesita reabonarea dispozitivelor.
3. In Cloudflare Pages, configureaza `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
   (secret binding) si `VAPID_SUBJECT=mailto:ADRESA_REALĂ_DE_CONTACT`.
   Nu pune cheia privata in variabile `VITE_` si nu comite iesirea comenzii.
   Pentru dezvoltare, adauga aceste valori manual in `.dev.vars`, fara commit.
4. Publica informarea completa: operator, contact, scop marketing push, temei
   consimtamant, date tehnice si furnizori push Apple/Google/Mozilla/Microsoft,
   retentie, drepturi si retragere. Valideaza juridic inainte de campanii.
5. Testeaza cu un cont propriu pe HTTPS, inclusiv refuz, retragere si receptie
   pe telefon. Pe iOS/iPadOS 16.4+, Web Push necesita PWA adaugata pe Home Screen.

Adminul are fila **Campanii push** (`/admin/push`), cu titlu, mesaj, destinatie
interna si confirmare inainte de trimitere catre toate dispozitivele eligibile.
Destinatarii sunt fixati la crearea campaniei, iar acordul este reverificat la
fiecare trimitere. Loturile de maximum 10 sunt procesate cat timp pagina este
deschisa. Istoricul persistent permite reluarea doar a loturilor neprocesate.
Campania are un ID de idempotenta; repetarea aceleiasi cereri nu creeaza alte
livrari. Erorile si rezultatele necunoscute nu sunt retrimise automat.
Statusul `accepted` inseamna acceptare de serviciul push, nu afisare/citire.
Abonamentele respinse cu 404/410 sunt eliminate automat.

API: `GET/POST /api/customer/push` (sesiune client, Origin exact pentru scriere),
`GET/POST /api/admin/push` (Cloudflare Access si Origin exact pentru scriere).
Endpointurile acceptate sunt limitate la furnizorii push de browser;
redirectionarile HTTP sunt interzise. Endpointurile si cheile dispozitivului
nu se scriu in loguri si nu se returneaza in raportul admin.
Registrul de acorduri este append-only. Stabileste operational perioada de
pastrare si procesul de stergere/anonymizare pentru aceste date; aplicatia nu
implementeaza automat retentia, exportul GDPR sau stergerea contului.
Notificarile comerciale pot aparea pe ecranul blocat si continua dupa logout
pana la retragerea acordului; nu include date personale in mesajele campaniilor.

### Jurnal de calorii

Pagina `/calorie-journal` este disponibilă clientilor autentificati. Clientul
poate adăuga preparate cu valori nutriționale din meniu sau înregistrări manuale,
consulta totalurile pe zi și salva un obiectiv caloric zilnic. Valorile nutriționale
sunt păstrate ca instantaneu la adăugare; macronutrienții necunoscuți rămân marcați
ca indisponibili. Înregistrările și obiectivul sunt private pe baza sesiunii clientului.
Migrarea `0006_calorie_journal.sql` adaugă tabelele necesare; rulează `npm run db:migrate`
local și aplică migrarea D1 în producție înainte de deploy.

Conturile NU se unesc automat dupa e-mail. Un client autentificat poate conecta
explicit al doilea provider din contul existent. O identitate deja asociata
altui client nu se transfera; evita crearea a doua conturi independente.
Numele, e-mailul optional, identificatorii providerilor, recomandarile si
istoricul punctelor si istoricul acordurilor de marketing sunt date personale stocate in D1. Inainte de lansare
sunt necesare politica de confidentialitate, retentie/stergere, mecanismul
cerut de Meta pentru stergere si limitare de trafic/abuz la nivel Cloudflare.
Aceste fluxuri operationale nu sunt implementate automat aici.

### Reguli implementate pentru fidelizare

- Cod personal unic si link `/?ref=COD#account`, introdus inainte de primul login.
- Recomandantul se fixeaza la crearea contului; fara autorecomandare sau schimbare
  ulterioara. Linkul trebuie folosit in aceeasi vizita; nu urmareste utilizatorul
  intre dispozitive/vizite si nu implementeaza cookie de afiliere.
- 49,90 RON platiti = 49 puncte clientului si 49 recomandantului direct.
  Regula se aplica tuturor achizitiilor viitoare, fara al doilea nivel.
- Registru append-only, plati unice pe `payment_id` si `order_id`; retry-ul nu
  dubleaza punctele. Rambursarile cumulative recalculeaza punctele pe suma neta,
  cu retragere atat de la cumparator, cat si de la recomandant.
- Migrarea `0010_customer_vouchers.sql` emite un voucher de bun venit de 10%,
  valabil 30 de zile, pentru fiecare client existent si pentru conturile noi.
  Din cont, clientul poate schimba 1.000 de puncte cu un voucher de 10% valabil
  30 de zile; soldul este verificat si debitat atomic. Voucherele sunt afisate in
  cont, dar nu se pot aplica inca la checkout-ul de previzualizare.
- Adminul protejat de Cloudflare Access include fila **Clienți și fidelitate**
  (`/admin/loyalty`), cu căutare, solduri, istoric paginat al punctelor și starea
  voucherelor pentru fiecare client. Migrarea `0011_customer_voucher_redemption.sql`
  adaugă datele de folosire; ele vor fi scrise de integrarea checkoutului, care
  nu este încă activă. Comenzile TEST nu pot consuma vouchere.
- `recordSettledPayment` si `recordCumulativeRefund` sunt functii INTERNE pentru
  integrarea viitoare, nu verifica ele insele plata bancara si nu au endpoint
  public. Nu trebuie apelate pe baza datelor browserului sau a redirectului bancii.
- Comenzile TEST, guest checkout-ul actual si totalurile coșului sunt nemodificate.
  TEST nu acorda puncte; nici autentificarea, nici instalarea nu acorda puncte.
  Identitatea pentru o comanda reala va trebui fixata din sesiunea serverului
  cand va fi implementat checkout-ul BT iPay.

### Plati: BT iPay inlocuieste planul EuPlatesc

Nu exista inca o integrare BT iPay activa sau endpoint de confirmare.
Sunt necesare contractul/contul de comerciant, credențiale sandbox, documentatia
tehnica aferenta contului, activarea Apple Pay/Google Pay de catre BT si testarea
confirmarii autentice server-la-server (inclusiv suma, moneda RON, comerciant,
comanda si status de decontare). Documentatie:
[BTePOS](https://btepos.ro/documentatie).
Suportul wallet-urilor nu se deduce din simpla acceptare a cardurilor contactless.
Voucherele, valoarea monetara a punctelor, remunerarea antrenorilor, antifrauda
avansata si discountul de membru nu sunt activate.

Instagram Login vizeaza conturi profesionale, nu este un login universal simplu
pentru clientii cu cont personal. WhatsApp necesita verificare prin cod OTP
si configurare WhatsApp Business, nu este echivalent cu Facebook Login.
Acesti doi furnizori nu sunt implementati in etapa curenta.

## Restrictii pentru comenzile online

Bauturile din categoriile `craft-beer`, `wine-prosecco` si `cocktails` raman
vizibile in meniu, dar nu pot fi adaugate in cos sau comandate prin API.
Regula comuna din `cartOptions` se aplica si portiilor sticla/pahar.
Liniile alcoolice deja salvate in cos apar indisponibile si trebuie eliminate
inainte de continuarea comenzii. Produsele alcoolice noi trebuie incadrate in
aceste categorii; regula nu deduce continutul de alcool din numele produsului.

## PWA (instalare pe dispozitiv)

Build-ul de productie include manifestul, iconite PNG de 192/512 px si un service
worker.

Iconita aplicatiei foloseste desenul furnizat de proprietar, rotit 90 de grade
spre dreapta, pastrand culorile si fundalul alb originale. Sursa pregatita este
`public/pwa/olive-icon.png`, cu PNG de 192/512 px pentru manifest
si 180 px pentru Apple Touch, redimensionate cu Sharp.
Iconitele instalate anterior pot necesita reinstalarea aplicatiei pentru actualizare.

Instalarea necesita HTTPS (sau localhost pentru testare) si suportul
browserului. In Chrome/Edge se foloseste optiunea de instalare din browser; pe
iPhone/iPad se foloseste Safari → Share → Add to Home Screen. Nu exista un
notificari push.

Pe site-ul public, dupa 8 secunde apare un toast cu instalarea si mesajul
promotional de 10% pentru membrii comunitatii ALIVE. Butonul foloseste
un text scurt, iar nota precizeaza ca instalarea nu inseamna inscriere si
reducerea nu este inca activa online. Linkul comunitatii duce la `/#community`
inclusiv de pe pagina meniului. Instalarea foloseste
`beforeinstallprompt` cand browserul il ofera; altfel afiseaza instructiuni
pentru Safari iOS si meniul browserului. Inchiderea ascunde toastul pana la
remontarea paginii (o reincarcare il poate afisa din nou). Nu apare in
modul standalone, dupa evenimentul `appinstalled`, in admin sau pe feedback.
Linkul comunitatii deschide sectiunea existenta, nu un formular de inscriere.
Instalarea nu acorda statut de membru, nu verifica eligibilitatea si nu modifica
preturile sau totalul. Inscrierea, regulile si aplicarea efectiva a reducerii
nu sunt implementate.

Service worker-ul salveaza exclusiv pagina statica `offline.html`. Navigarile
publice folosesc reteaua, cu pagina offline ca fallback la eroare de conexiune.
Meniul, imaginile, raspunsurile API, contactele, comenzile, platile si paginile
admin nu sunt salvate in Cache Storage de service worker; `/api` si `/admin`
nu sunt interceptate. Cache-ul HTTP obisnuit ramane controlat de server.
Cosul continua sa foloseasca mecanismul localStorage existent.

Aceasta versiune nu permite navigarea completa sau comenzi offline. Daca reteaua
cade dupa deschiderea aplicatiei, nu inlocuieste ecranul deja incarcat; cererile
folosesc tratarea existenta a erorilor. Nu modifica fallback-ul existent al
meniului; serverul ramane autoritatea pentru preturi si stoc.

Actualizarile service worker-ului nu forteaza reincarcarea paginii si nu preiau
taburile deja deschise. O versiune noua se activeaza dupa inchiderea tuturor
ferestrelor controlate de versiunea anterioara. La schimbarea paginii offline,
incrementeaza `OFFLINE_CACHE` in `public/sw.js`.

Verificare: ruleaza build-ul servit prin `npm run dev:orders` sau
`npm run preview`, deschide o data aplicatia online, apoi redeschide-o pentru
controlul service worker-ului. Verifica manifestul/worker-ul in DevTools →
Application. Cu reteaua offline, o reincarcare publica afiseaza pagina offline;
rutele admin/API nu primesc acest fallback. `npm run dev` nu inregistreaza
worker-ul. Pentru resetarea testelor elimina inregistrarea si cache-ul
`alive-offline-*` din DevTools.

## Setup complet (prima dată)

### 1. Creează resursele Cloudflare

```sh
wrangler d1 create alive-bistro-menu
# → copiază database_id din output în wrangler.jsonc → d1_databases[0].database_id

wrangler r2 bucket create alive-bistro-media
```

### 2. Aplică schema și seed-ul

```sh
npm run db:migrate   # aplică toate migrările pe D1 local
npm run db:seed      # înlocuiește meniul cu datele din src/features/menu/menu-data.json

# verificare:
wrangler d1 execute alive-bistro-menu --local --command="SELECT count(*) FROM items"
# → { "count(*)": 81 }
```

Înainte de deployment, aplică migrările bazei de producție cu
`npm run db:migrate:prod`; acest script folosește baza D1 remote.

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

Fotografiile din carduri și din detalii folosesc un cadru pătrat, fără zoom la
hover. În administrare, încadrarea fiecărui produs poate fi ajustată prin
repoziționare și zoom de la 50% la 300%. Sub 100%, fotografia întreagă este
afișată în cadru; previzualizarea arată exact încadrarea folosită de meniu.
Produsele din categoria vinurilor păstrează imaginea întreagă, fără decupare
sau zoom.
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
2. Domeniu: `alive-bistro.ro`, cu destinatii pentru `admin` si `api/admin`
   (inclusiv subrutele). Protejeaza separat orice domeniu Pages folosit pentru admin.
3. Policy: Allow → Emails → adaugă adresele care pot accesa dashboard-ul
4. Identity providers: Cloudflare, Google configurat in Access sau One-time PIN.

Middleware-ul `/api/admin/*` verifica semnatura RS256, emitentul, expirarea si
audienta tokenului Access din `Cf-Access-Jwt-Assertion` sau din cookie-ul
`CF_Authorization`. Emailul este preluat numai din tokenul verificat, nu dintr-un
header furnizat de client. `ACCESS_TEAM_DOMAIN` si `ACCESS_AUD` din
`wrangler.jsonc` sunt identificatori publici, nu secrete. AUD se copiaza din
aplicatia Access, fila **Additional settings → Application Audience (AUD) Tag**.
O configuratie lipsa produce 503; credentialele lipsa/invalide produc 401.

### 4. Dev local (full stack)

```sh
npm run dev:cf      # build + wrangler pages dev → http://localhost:8788
# Admin: http://localhost:8788/admin
# Meniu public: http://localhost:8788/menu
```

> Local, Cloudflare Access nu este activ. Pentru operatiunile administrative de
> test suportate, foloseste `npm run dev:orders`: exceptia necesita explicit
> `LOCAL_TEST_ORDERS=true` si o adresa loopback. Nu dezactiva autentificarea si nu
> simula identitatea prin headere. In productie, tokenul Access este obligatoriu.

### 5. Deploy în producție

```sh
npm run db:migrate:prod   # aplică migrările pe D1 prod
npm run deploy            # build + wrangler pages deploy
```

---

## Meniu Performance / Build your performance

Secțiunea `/menu#custom-menu`, accesibilă din navigație, din bara sticky a meniului și
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

## Reduceri pe categorii (administrare)

În `/admin`, fila **Reduceri** (sau ruta directă `/admin/promotion`) permite
configurarea unui procent independent pentru fiecare categorie existenta in
meniu, inclusiv deserturi si bauturi. Categoriile nou create apar automat cu 0%.
Meniul Performance are un procent separat, aplicat la totalul farfuriei.
Pentru o oferta de 10%, introdu `10` la categoria dorita si salveaza randul ei.
Procentele nu se cumuleaza; `0` sau butonul **Dezactiveaza** opreste oferta.
Prețurile de bază din administrarea produselor rămân nemodificate.

Aplica migrarile `0008_category_promotions.sql` si
`0009_food_category_discount_defaults.sql` inainte de a publica versiunea noua:
`npm run db:migrate` pentru local, respectiv, după backup și verificarea mediului,
`npx wrangler d1 migrations apply alive-bistro-menu --remote` pentru producție.
Aceasta versiune inlocuieste reducerea generala la mancare cu setari independente,
initial 0% prin migrarea 0008. Migrarea 0009 seteaza o singura data 10% pentru
categoriile existente din grupa `food`, cu exceptia `sweet-no-regrets`.
Deserturile, bauturile si Performance isi pastreaza setarile existente.
Modificarile ulterioare din admin raman persistente; categoriile nou create
raman implicit la 0%. Procentul vechi din `food_promotion`
ramane arhivat in D1, dar nu se mai aplica si nu este migrat automat.
Reducerile se pot modifica sau dezactiva din administrare.
Configurația se păstrează în D1, nu în browser. Nu este necesar un nou deploy
pentru schimbarea procentului după instalarea acestei versiuni.

`GET /api/admin/promotion` și `PUT /api/admin/promotion` folosesc protecția
administratorului existentă (Cloudflare Access); scrierea cere același Origin.
GET returneaza `{ data: { categories: [{ id, label, groupId, discountPercent }],
performanceDiscountPercent } }`. PUT accepta fie
`{ "categoryId": "breakfast-brunch", "discountPercent": 10 }`, fie
`{ "performanceDiscountPercent": 15 }`, nu ambele; raspunsul este
`{ "data": { "discountPercent": 10 } }`, cu procent intreg intre 0 si 99.
Categoriile inexistente produc 404, payload-ul vechi `foodDiscountPercent`
produce 400, iar o eroare D1 produce 503. Salvarile sunt idempotente si nu
suprascriu reducerile celorlalte categorii.
În dezvoltare, accesul administrativ local este disponibil
doar în modul TEST explicit, ca la gestionarea stocului: `npm run dev:orders`.
În producție, Cloudflare Access trebuie să protejeze atât `/admin/*`, cât și
`/api/admin/*`; această funcție nu adaugă un bypass de autentificare public.

API-ul public `/api/menu` pastreaza structura `data` cu grupele meniului,
adauga `discountPercent` pe categorii si `performanceDiscountPercent` pe grupa
`food`. Nu mai publica `foodDiscountPercent`. Publică prețul redus, prețul de bază și procentul, iar
ETag-ul se schimbă la modificarea promoției. Reîncarcă pagina publică după salvare.
Coșul recalculează prețurile curente inclusiv pentru farfuriile Performance
restaurate; comenzile TEST verifică promoția direct în D1 și refuză totalurile
vechi. Preturile sticla/pahar sunt reduse individual; restrictia existenta
pentru cumpararea alcoolului doar la locatie ramane neschimbata.
Reducerea se rotunjește la ban pe produs; pentru Performance se aplică
o singură dată totalului farfuriei, nu fiecărui ingredient separat.

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

Lista produselor din admin si previzualizarea din editare folosesc aceeasi
rezolvare a fotografiilor ca meniul public: imagine incarcata in R2, URL salvat,
apoi fotografia inclusa in aplicatie, asociata dupa denumirea produsului.
Fotografia implicita nu este salvata ca URL in D1 la editarea produsului.
Eliminarea unei imagini personalizate revine la fotografia implicita, daca exista;
produsele fara fotografie pastreaza substituentul vizual.
Editorul de produse foloseste doua coloane pe desktop si una pe mobil.
Previzualizarea centreaza fotografia integral, fara decupare; antetul si
butoanele de salvare raman vizibile cand continutul formularului este derulat.

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
