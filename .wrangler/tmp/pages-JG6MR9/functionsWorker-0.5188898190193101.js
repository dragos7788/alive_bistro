var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/response.ts
var ok = /* @__PURE__ */ __name((data, status = 200) => Response.json({ data }, { status }), "ok");
var err = /* @__PURE__ */ __name((code, message, status, details) => Response.json({ error: { code, message, details: details ?? null } }, { status }), "err");

// _lib/auth.ts
function getAccessEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}
__name(getAccessEmail, "getAccessEmail");
function requireAdmin(request) {
  if (!getAccessEmail(request)) {
    return err("UNAUTHORIZED", "Cloudflare Access authentication required", 401);
  }
  return null;
}
__name(requireAdmin, "requireAdmin");

// api/admin/categories/reorder.ts
var onRequestPost = /* @__PURE__ */ __name(async ({ request, env }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return err("VALIDATION_ERROR", "ids must be a non-empty array", 400);
  }
  await env.DB.batch(
    ids.map((id, i) => env.DB.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").bind(i, id))
  );
  return ok({ reordered: ids.length });
}, "onRequestPost");

// api/admin/items/reorder.ts
var onRequestPost2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return err("VALIDATION_ERROR", "ids must be a non-empty array", 400);
  }
  await env.DB.batch(
    ids.map((id, i) => env.DB.prepare("UPDATE items SET sort_order = ? WHERE id = ?").bind(i, id))
  );
  return ok({ reordered: ids.length });
}, "onRequestPost");

// api/admin/categories/[id].ts
var onRequestPut = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const b = await request.json();
  const exists = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(params.id).first();
  if (!exists) return err("NOT_FOUND", "Category not found", 404);
  await env.DB.prepare(
    "UPDATE categories SET label = ?, label_en = ?, icon_key = ? WHERE id = ?"
  ).bind(b.label, b.label_en ?? null, b.icon_key, params.id).run();
  const row = await env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(params.id).first();
  return ok(row);
}, "onRequestPut");
var onRequestDelete = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const exists = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(params.id).first();
  if (!exists) return err("NOT_FOUND", "Category not found", 404);
  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(params.id).run();
  return ok({ deleted: params.id });
}, "onRequestDelete");

// api/admin/items/[id].ts
var onRequestPut2 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const b = await request.json();
  const exists = await env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(params.id).first();
  if (!exists) return err("NOT_FOUND", "Item not found", 404);
  await env.DB.prepare(
    `UPDATE items SET
      name = ?, name_en = ?, description = ?, description_en = ?,
      price = ?, image_key = ?, image_url = ?, tag = ?,
      calories = ?, protein = ?, carbs = ?, fat = ?, is_visible = ?
     WHERE id = ?`
  ).bind(
    b.name,
    b.name_en ?? null,
    b.description,
    b.description_en ?? null,
    b.price,
    b.image_key ?? null,
    b.image_url ?? null,
    b.tag ?? null,
    b.calories ?? null,
    b.protein ?? null,
    b.carbs ?? null,
    b.fat ?? null,
    b.is_visible !== false ? 1 : 0,
    params.id
  ).run();
  const row = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(params.id).first();
  return ok(row);
}, "onRequestPut");
var onRequestDelete2 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const exists = await env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(params.id).first();
  if (!exists) return err("NOT_FOUND", "Item not found", 404);
  await env.DB.prepare("DELETE FROM items WHERE id = ?").bind(params.id).run();
  return ok({ deleted: params.id });
}, "onRequestDelete");

// api/admin/categories/index.ts
var VALID_GROUPS = /* @__PURE__ */ new Set(["food", "drinks"]);
var onRequestGet = /* @__PURE__ */ __name(async ({ request, env }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const { results } = await env.DB.prepare(
    "SELECT * FROM categories ORDER BY group_id, sort_order"
  ).all();
  return ok(results);
}, "onRequestGet");
var onRequestPost3 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const b = await request.json();
  if (!b.id || !b.group_id || !b.label || !b.icon_key) {
    return err("VALIDATION_ERROR", "id, group_id, label, icon_key are required", 400);
  }
  if (!VALID_GROUPS.has(b.group_id)) {
    return err("VALIDATION_ERROR", "group_id must be 'food' or 'drinks'", 400);
  }
  const { results: [last] } = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE group_id = ?"
  ).bind(b.group_id).all();
  await env.DB.prepare(
    "INSERT INTO categories (id, group_id, label, label_en, icon_key, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(b.id, b.group_id, b.label, b.label_en ?? null, b.icon_key, last?.next ?? 0).run();
  const row = await env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(b.id).first();
  return ok(row, 201);
}, "onRequestPost");

// api/admin/items/index.ts
var onRequestGet2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const category = new URL(request.url).searchParams.get("category");
  const { results } = category ? await env.DB.prepare(
    "SELECT * FROM items WHERE category_id = ? ORDER BY sort_order"
  ).bind(category).all() : await env.DB.prepare(
    "SELECT * FROM items ORDER BY category_id, sort_order"
  ).all();
  return ok(results);
}, "onRequestGet");
var onRequestPost4 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const b = await request.json();
  if (!b.category_id || !b.name || !b.description || !b.price) {
    return err("VALIDATION_ERROR", "category_id, name, description, price are required", 400);
  }
  const id = `${b.category_id}--${crypto.randomUUID()}`;
  const { results: [last] } = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM items WHERE category_id = ?"
  ).bind(b.category_id).all();
  await env.DB.prepare(
    `INSERT INTO items (id, category_id, name, name_en, description, description_en, price, image_key, image_url, tag, calories, protein, carbs, fat, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    b.category_id,
    b.name,
    b.name_en ?? null,
    b.description,
    b.description_en ?? null,
    b.price,
    b.image_key ?? null,
    b.image_url ?? null,
    b.tag ?? null,
    b.calories ?? null,
    b.protein ?? null,
    b.carbs ?? null,
    b.fat ?? null,
    last?.next ?? 0
  ).run();
  const row = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(id).first();
  return ok(row, 201);
}, "onRequestPost");

// _lib/validate.ts
var ALLOWED_MIME = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var MAX_BYTES = 2 * 1024 * 1024;
function validateUpload(contentType, size) {
  if (!contentType || !ALLOWED_MIME.has(contentType)) return "Only jpeg, png, webp allowed";
  if (size > MAX_BYTES) return "File exceeds 2 MB";
  return null;
}
__name(validateUpload, "validateUpload");

// api/admin/upload.ts
var onRequestPost5 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const deny = requireAdmin(request);
  if (deny) return deny;
  const contentType = request.headers.get("Content-Type");
  const body = await request.arrayBuffer();
  const msg = validateUpload(contentType, body.byteLength);
  if (msg) return err("VALIDATION_ERROR", msg, 400);
  const key = crypto.randomUUID();
  await env.MEDIA.put(key, body, { httpMetadata: { contentType } });
  return ok({ key, url: `/api/images/${key}` }, 201);
}, "onRequestPost");

// api/images/[key].ts
var onRequestGet3 = /* @__PURE__ */ __name(async ({ env, params }) => {
  const obj = await env.MEDIA.get(params.key);
  if (!obj) return err("NOT_FOUND", "Image not found", 404);
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}, "onRequestGet");

// api/menu.ts
var GROUPS = [
  { id: "food", label: "M\xE2ncare", iconKey: "fork-knife" },
  { id: "drinks", label: "B\u0103uturi", iconKey: "coffee" }
];
var onRequestGet4 = /* @__PURE__ */ __name(async ({ request, env }) => {
  try {
    const [catsRes, itemsRes] = await env.DB.batch([
      env.DB.prepare("SELECT id, group_id, label, label_en, icon_key FROM categories ORDER BY sort_order"),
      env.DB.prepare("SELECT id, category_id, name, name_en, description, description_en, price, image_key, image_url, tag, calories, protein, carbs, fat FROM items WHERE is_visible = 1 ORDER BY category_id, sort_order")
    ]);
    const cats = catsRes.results;
    const items = itemsRes.results;
    const byCat = /* @__PURE__ */ new Map();
    const shaped = items.map((r) => ({
      name: r.name,
      name_en: r.name_en ?? void 0,
      description: r.description,
      description_en: r.description_en ?? void 0,
      price: r.price,
      image: r.image_key ? `/api/images/${r.image_key}` : r.image_url ?? void 0,
      tag: r.tag ?? void 0,
      macros: r.calories != null ? { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat } : void 0
    }));
    items.forEach((r, i) => {
      const list = byCat.get(r.category_id) ?? [];
      list.push(shaped[i]);
      byCat.set(r.category_id, list);
    });
    const catsByGroup = /* @__PURE__ */ new Map();
    for (const cat of cats) {
      const entry = {
        id: cat.id,
        label: cat.label,
        label_en: cat.label_en ?? void 0,
        iconKey: cat.icon_key,
        items: byCat.get(cat.id) ?? []
      };
      const list = catsByGroup.get(cat.group_id) ?? [];
      list.push(entry);
      catsByGroup.set(cat.group_id, list);
    }
    const data = GROUPS.map((g) => ({
      ...g,
      categories: catsByGroup.get(g.id) ?? []
    }));
    const body = JSON.stringify({ data });
    const hash = await shortHash(body);
    const etag = `"${hash}"`;
    if (request.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304 });
    }
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        ETag: etag
      }
    });
  } catch (e) {
    return err("DB_ERROR", "Failed to load menu", 500);
  }
}, "onRequestGet");
async function shortHash(s) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}
__name(shortHash, "shortHash");

// ../.wrangler/tmp/pages-JG6MR9/functionsRoutes-0.4528593241841965.mjs
var routes = [
  {
    routePath: "/api/admin/categories/reorder",
    mountPath: "/api/admin/categories",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/admin/items/reorder",
    mountPath: "/api/admin/items",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/admin/categories/:id",
    mountPath: "/api/admin/categories",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin/categories/:id",
    mountPath: "/api/admin/categories",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/admin/items/:id",
    mountPath: "/api/admin/items",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/admin/items/:id",
    mountPath: "/api/admin/items",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut2]
  },
  {
    routePath: "/api/admin/categories",
    mountPath: "/api/admin/categories",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/admin/categories",
    mountPath: "/api/admin/categories",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/admin/items",
    mountPath: "/api/admin/items",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/admin/items",
    mountPath: "/api/admin/items",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/admin/upload",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/images/:key",
    mountPath: "/api/images",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/menu",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
