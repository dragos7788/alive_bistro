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
npm run db:seed      # populează cu datele actuale (73 produse, 8 categorii)

# verificare:
wrangler d1 execute alive-bistro-menu --local --command="SELECT count(*) FROM items"
# → { "count(*)": 73 }
```

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

## Scripturi

| Script | Descriere |
|--------|-----------|
| `npm run dev` | Dev frontend (fără Functions, meniu din seed) |
| `npm run dev:cf` | Dev full stack cu wrangler pages dev |
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
