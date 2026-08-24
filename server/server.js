const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const { PDFDocument, rgb, degrees, StandardFonts } = require("pdf-lib");
require("dotenv").config();

const { readJSON, writeJSON } = require("./store");
const { hashPassword, verifyPassword } = require("./auth");

const ROOT = path.join(__dirname, "..");
const PRODUCTS_PATH = path.join(ROOT, "data", "products.json");
const DECKS_PATH = path.join(ROOT, "data", "decks.json");
const ORDERS_PATH = path.join(ROOT, "data", "orders.json");
const USERS_PATH = path.join(ROOT, "data", "users.json");
const PRODUCT_FILES_DIR = path.join(ROOT, "data", "product-files");
const INVITES_PATH = path.join(ROOT, "data", "invites.json");
const GRANTS_PATH = path.join(ROOT, "data", "access-grants.json");
const SHARE_LINKS_PATH = path.join(ROOT, "data", "share-links.json");

const CLIENT_DIST = path.join(ROOT, "client", "dist");

const PORT = process.env.PORT || 4477;
const WFP_MERCHANT_ACCOUNT = process.env.WFP_MERCHANT_ACCOUNT || "test_merch_n1";
const WFP_MERCHANT_SECRET = process.env.WFP_MERCHANT_SECRET || "flk3409refn54t54t5ff5";
const WFP_MERCHANT_DOMAIN = process.env.WFP_MERCHANT_DOMAIN || "localhost";
const WFP_CHECKOUT_URL = "https://secure.wayforpay.com/pay";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const WFP_RETURN_URL = process.env.WFP_RETURN_URL || `${BASE_URL}/order-success`;
const WFP_SERVICE_URL = process.env.WFP_SERVICE_URL || `${BASE_URL}/api/wayforpay/callback`;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${BASE_URL}/auth/google/callback`;

function sanitizeRedirect(target) {
  if (typeof target === "string" && target.startsWith("/") && !target.startsWith("//")) return target;
  return "/account";
}

function hmacMd5(secret, message) {
  return crypto.createHmac("md5", secret).update(message, "utf8").digest("hex");
}

function makePurchaseSignature({ merchantAccount, merchantDomainName, orderReference, orderDate, amount, currency, productName, productCount, productPrice }) {
  const parts = [
    merchantAccount,
    merchantDomainName,
    orderReference,
    String(orderDate),
    String(amount),
    currency,
    ...productName,
    ...productCount.map(String),
    ...productPrice.map(String),
  ];
  return hmacMd5(WFP_MERCHANT_SECRET, parts.join(";"));
}

function makeCallbackAckSignature(orderReference, status, time) {
  return hmacMd5(WFP_MERCHANT_SECRET, [orderReference, status, String(time)].join(";"));
}

function findUserById(id) {
  return readJSON(USERS_PATH, []).find((u) => u.id === id);
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Потрібно увійти в акаунт." });
  next();
}

function userOwnsProduct(userId, productId) {
  const orders = readJSON(ORDERS_PATH, []);
  return orders.some((o) => o.userId === userId && o.status === "paid" && o.items.some((item) => item.productId === productId));
}

function userHasGrant(userId, productId) {
  const grants = readJSON(GRANTS_PATH, []);
  return grants.some((g) => g.userId === userId && g.productId === productId);
}

function grantAccess(userId, productId) {
  const grants = readJSON(GRANTS_PATH, []);
  if (!grants.some((g) => g.userId === userId && g.productId === productId)) {
    grants.push({ userId, productId, grantedAt: new Date().toISOString() });
    writeJSON(GRANTS_PATH, grants);
  }
}

function revokeAccess(userId, productId) {
  const grants = readJSON(GRANTS_PATH, []);
  const next = grants.filter((g) => !(g.userId === userId && g.productId === productId));
  if (next.length !== grants.length) writeJSON(GRANTS_PATH, next);
}

// Records (or reuses) an invite for studentEmail -> productId, granting access right
// away if that email already has an account. Used both when a teacher types a
// student's email directly and when a student claims a shared class link.
function upsertInviteAndMaybeGrant(createdBy, productId, studentEmail) {
  const invites = readJSON(INVITES_PATH, []);
  let invite = invites.find((i) => i.createdBy === createdBy && i.productId === productId && i.studentEmail === studentEmail);
  if (!invite) {
    invite = {
      id: crypto.randomUUID(),
      productId,
      studentEmail,
      createdBy,
      createdAt: new Date().toISOString(),
      grantedAt: null,
    };
    invites.push(invite);
  }

  const users = readJSON(USERS_PATH, []);
  const existingUser = users.find((u) => u.email === studentEmail);
  if (existingUser && !invite.grantedAt) {
    grantAccess(existingUser.id, productId);
    invite.grantedAt = new Date().toISOString();
  }

  writeJSON(INVITES_PATH, invites);
  return invite;
}

// Called right after a new account is created — if a teacher already invited this
// email before the student signed up, unlock access to whatever they were invited to.
function grantPendingInvitesForEmail(userId, email) {
  const invites = readJSON(INVITES_PATH, []);
  let changed = false;
  invites.forEach((invite) => {
    if (invite.studentEmail === email && !invite.grantedAt) {
      grantAccess(userId, invite.productId);
      invite.grantedAt = new Date().toISOString();
      changed = true;
    }
  });
  if (changed) writeJSON(INVITES_PATH, invites);
}

function hasProductAccess(userId, productId) {
  return userOwnsProduct(userId, productId) || userHasGrant(userId, productId);
}

// Stamps a diagonal "formlq" watermark across every page so downloaded/viewed
// PDFs can be traced back if shared outside the platform.
async function watermarkPdf(originalBytes) {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const text = "formlq";

  pdfDoc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 6;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - fontSize / 3,
      size: fontSize,
      font,
      color: rgb(0.4, 0.35, 0.85),
      opacity: 0.15,
      rotate: degrees(35),
    });
  });

  return pdfDoc.save();
}

function userHasPdfAccess(userId, productId) {
  const orders = readJSON(ORDERS_PATH, []);
  return orders.some(
    (o) =>
      o.userId === userId &&
      o.status === "paid" &&
      o.items.some((item) => item.productId === productId && item.formats && item.formats.pdf)
  );
}

const app = express();
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);
app.use(express.static(CLIENT_DIST));

app.get("/api/products", (req, res) => {
  res.json(readJSON(PRODUCTS_PATH, []));
});

app.get("/api/decks", (req, res) => {
  const decks = readJSON(DECKS_PATH, []);
  const userId = req.session.userId;

  // Legacy decks (password-encrypted: salt/iv/ciphertext) are visible to everyone —
  // the ciphertext itself is the gate. New decks (productId + plaintext sections) only
  // show up for accounts entitled to that product, either by purchase or a redeemed invite.
  const visible = decks.filter((deck) => {
    if (!deck.productId) return true;
    return userId && hasProductAccess(userId, deck.productId);
  });

  res.json(visible);
});

// --- Auth ---

app.get("/auth/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res
      .status(500)
      .send("Вхід через Google ще не налаштований на сервері. Додай GOOGLE_CLIENT_ID і GOOGLE_CLIENT_SECRET у .env.");
  }

  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;
  req.session.oauthRedirect = sanitizeRedirect(typeof req.query.redirect === "string" ? req.query.redirect : "");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const expectedState = req.session.oauthState;
  const redirectTarget = sanitizeRedirect(req.session.oauthRedirect || "");
  delete req.session.oauthState;
  delete req.session.oauthRedirect;

  if (error || !code || !state || state !== expectedState) {
    return res.redirect("/login?error=google");
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("token exchange failed");
    const tokens = await tokenRes.json();

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) throw new Error("userinfo failed");
    const profile = await profileRes.json();

    if (!profile.email || !profile.email_verified) throw new Error("email not verified");
    const normalizedEmail = profile.email.toLowerCase();

    const users = readJSON(USERS_PATH, []);
    let user = users.find((u) => u.email === normalizedEmail);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        name: profile.name || "",
        email: normalizedEmail,
        passwordHash: null,
        googleId: profile.sub,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      writeJSON(USERS_PATH, users);
      grantPendingInvitesForEmail(user.id, normalizedEmail);
    } else {
      let changed = false;
      if (!user.googleId) {
        user.googleId = profile.sub;
        changed = true;
      }
      if (!user.name && profile.name) {
        user.name = profile.name;
        changed = true;
      }
      if (changed) writeJSON(USERS_PATH, users);
    }

    req.session.userId = user.id;
    res.redirect(redirectTarget);
  } catch (e) {
    res.redirect("/login?error=google");
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const trimmedName = typeof name === "string" ? name.trim() : "";

  if (!trimmedName) {
    return res.status(400).json({ error: "Вкажи ім'я." });
  }
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return res.status(400).json({ error: "Вкажи коректний email." });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Пароль має містити щонайменше 6 символів." });
  }

  const users = readJSON(USERS_PATH, []);
  if (users.some((u) => u.email === normalizedEmail)) {
    return res.status(409).json({ error: "Користувач з таким email вже зареєстрований." });
  }

  const user = {
    id: crypto.randomUUID(),
    name: trimmedName,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJSON(USERS_PATH, users);
  grantPendingInvitesForEmail(user.id, normalizedEmail);

  req.session.userId = user.id;
  res.json({ name: user.name, email: user.email });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  const users = readJSON(USERS_PATH, []);
  const user = users.find((u) => u.email === normalizedEmail);
  const valid = user && (await verifyPassword(password || "", user.passwordHash));

  if (!valid) {
    return res.status(401).json({ error: "Неправильний email або пароль." });
  }

  req.session.userId = user.id;
  res.json({ name: user.name, email: user.email });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/auth/me", (req, res) => {
  const user = req.session.userId && findUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ name: user.name || "", email: user.email });
});

// --- Account ---

app.get("/api/account/orders", requireAuth, (req, res) => {
  const orders = readJSON(ORDERS_PATH, []);
  const paidOrders = orders
    .filter((o) => o.userId === req.session.userId && o.status === "paid")
    .map((o) => ({
      ...o,
      items: o.items.map((item) => ({
        ...item,
        pdfReady: !!(item.formats && item.formats.pdf) && fs.existsSync(path.join(PRODUCT_FILES_DIR, `${item.productId}.pdf`)),
      })),
    }));
  res.json({ orders: paidOrders });
});

app.get("/api/account/download/:productId", requireAuth, async (req, res) => {
  const { productId } = req.params;
  if (!/^[a-z0-9-]+$/i.test(productId)) return res.status(400).json({ error: "Некоректний товар." });
  if (!userHasPdfAccess(req.session.userId, productId)) return res.status(403).json({ error: "Немає доступу до цього файлу." });

  const filePath = path.join(PRODUCT_FILES_DIR, `${productId}.pdf`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Файл ще не завантажено." });

  const watermarked = await watermarkPdf(fs.readFileSync(filePath));
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${productId}.pdf"` });
  res.send(Buffer.from(watermarked));
});

app.get("/api/account/view/:productId", requireAuth, async (req, res) => {
  const { productId } = req.params;
  if (!/^[a-z0-9-]+$/i.test(productId)) return res.status(400).json({ error: "Некоректний товар." });
  if (!userHasPdfAccess(req.session.userId, productId)) return res.status(403).json({ error: "Немає доступу до цього файлу." });

  const filePath = path.join(PRODUCT_FILES_DIR, `${productId}.pdf`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Файл ще не завантажено." });

  const watermarked = await watermarkPdf(fs.readFileSync(filePath));
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${productId}.pdf"` });
  res.send(Buffer.from(watermarked));
});

// --- Invites (teacher whitelists a student's email; the student later claims it
// through the shared link by typing that same email) ---

app.post("/api/account/invite", requireAuth, (req, res) => {
  const { productId, studentEmail } = req.body || {};
  const normalizedEmail = typeof studentEmail === "string" ? studentEmail.trim().toLowerCase() : "";

  if (!productId || !userOwnsProduct(req.session.userId, productId)) {
    return res.status(403).json({ error: "Ти не купував(-ла) цей товар." });
  }
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return res.status(400).json({ error: "Вкажи коректний email учня." });
  }

  const invite = upsertInviteAndMaybeGrant(req.session.userId, productId, normalizedEmail);
  res.json({ studentEmail: normalizedEmail, granted: !!invite.grantedAt });
});

app.get("/api/account/invite/:productId", requireAuth, (req, res) => {
  const invites = readJSON(INVITES_PATH, []);
  const mine = invites
    .filter((i) => i.studentEmail && i.createdBy === req.session.userId && i.productId === req.params.productId)
    .map((i) => ({ studentEmail: i.studentEmail, granted: !!i.grantedAt }));
  res.json({ invites: mine });
});

app.post("/api/account/invite/revoke", requireAuth, (req, res) => {
  const { productId, studentEmail } = req.body || {};
  const normalizedEmail = typeof studentEmail === "string" ? studentEmail.trim().toLowerCase() : "";

  if (!productId || !userOwnsProduct(req.session.userId, productId)) {
    return res.status(403).json({ error: "Ти не купував(-ла) цей товар." });
  }
  if (!normalizedEmail) {
    return res.status(400).json({ error: "Вкажи email учня." });
  }

  const invites = readJSON(INVITES_PATH, []);
  const next = invites.filter(
    (i) => !(i.createdBy === req.session.userId && i.productId === productId && i.studentEmail === normalizedEmail)
  );
  writeJSON(INVITES_PATH, next);

  const users = readJSON(USERS_PATH, []);
  const student = users.find((u) => u.email === normalizedEmail);
  if (student) revokeAccess(student.id, productId);

  res.json({ ok: true });
});

// --- Share links (one link per teacher+product; each student who opens it types
// their own email to join, instead of the teacher typing every email upfront) ---

app.post("/api/account/share-link", requireAuth, (req, res) => {
  const { productId } = req.body || {};
  if (!productId || !userOwnsProduct(req.session.userId, productId)) {
    return res.status(403).json({ error: "Ти не купував(-ла) цей товар." });
  }

  const links = readJSON(SHARE_LINKS_PATH, []);
  let link = links.find((l) => l.createdBy === req.session.userId && l.productId === productId);
  if (!link) {
    link = { code: crypto.randomBytes(4).toString("hex"), productId, createdBy: req.session.userId, createdAt: new Date().toISOString() };
    links.push(link);
    writeJSON(SHARE_LINKS_PATH, links);
  }

  res.json({ code: link.code });
});

app.get("/api/share-links/:code", (req, res) => {
  const links = readJSON(SHARE_LINKS_PATH, []);
  const link = links.find((l) => l.code === req.params.code);
  if (!link) return res.status(404).json({ error: "Посилання недійсне." });

  const products = readJSON(PRODUCTS_PATH, []);
  const product = products.find((p) => p.id === link.productId);
  res.json({ productId: link.productId, productTitle: product ? product.title : link.productId });
});

app.post("/api/share-links/:code/claim", (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return res.status(400).json({ error: "Вкажи коректний email." });
  }

  const links = readJSON(SHARE_LINKS_PATH, []);
  const link = links.find((l) => l.code === req.params.code);
  if (!link) return res.status(404).json({ error: "Посилання недійсне." });

  const invites = readJSON(INVITES_PATH, []);
  const invite = invites.find(
    (i) => i.createdBy === link.createdBy && i.productId === link.productId && i.studentEmail === normalizedEmail
  );
  if (!invite) {
    return res.status(403).json({ error: "Ця пошта не в списку запрошених. Попроси вчителя додати тебе." });
  }

  const users = readJSON(USERS_PATH, []);
  let user = users.find((u) => u.email === normalizedEmail);

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: normalizedEmail.split("@")[0],
      email: normalizedEmail,
      passwordHash: null,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeJSON(USERS_PATH, users);
  }

  if (!invite.grantedAt) {
    grantAccess(user.id, link.productId);
    invite.grantedAt = new Date().toISOString();
    writeJSON(INVITES_PATH, invites);
  }

  // An account with no real password (brand-new, or created earlier via Google/another
  // invite) has nothing to log in with, so we log it in right away. Only accounts that
  // actually set a password keep requiring it.
  const autoLoggedIn = !user.passwordHash;
  if (autoLoggedIn) req.session.userId = user.id;

  res.json({ granted: true, autoLoggedIn });
});

// --- Checkout ---

app.post("/api/checkout", requireAuth, (req, res) => {
  const { items } = req.body || {};
  const user = findUserById(req.session.userId);

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Кошик порожній." });
  }

  const products = readJSON(PRODUCTS_PATH, []);
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));

  const lineItems = [];
  for (const item of items) {
    const product = productsById[item.productId];
    if (!product) return res.status(400).json({ error: `Товар ${item.productId} не знайдено.` });
    if (product.status !== "available" || product.price == null) {
      return res.status(400).json({ error: `Товар "${product.title}" ще не доступний для покупки.` });
    }
    lineItems.push({ product, formats: item.formats });
  }

  const orderReference = `formlq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orderDate = Math.floor(Date.now() / 1000);
  const amount = lineItems.reduce((sum, li) => sum + li.product.price, 0);
  const currency = "UAH";
  const productName = lineItems.map((li) => li.product.title);
  const productCount = lineItems.map(() => 1);
  const productPrice = lineItems.map((li) => li.product.price);

  const merchantSignature = makePurchaseSignature({
    merchantAccount: WFP_MERCHANT_ACCOUNT,
    merchantDomainName: WFP_MERCHANT_DOMAIN,
    orderReference,
    orderDate,
    amount,
    currency,
    productName,
    productCount,
    productPrice,
  });

  const orders = readJSON(ORDERS_PATH, []);
  orders.push({
    orderReference,
    userId: user.id,
    email: user.email,
    items: lineItems.map((li) => ({ productId: li.product.id, title: li.product.title, price: li.product.price, formats: li.formats })),
    amount,
    currency,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  writeJSON(ORDERS_PATH, orders);

  res.json({
    action: WFP_CHECKOUT_URL,
    fields: {
      merchantAccount: WFP_MERCHANT_ACCOUNT,
      merchantDomainName: WFP_MERCHANT_DOMAIN,
      merchantSignature,
      orderReference,
      orderDate,
      amount,
      currency,
      productName,
      productCount,
      productPrice,
      clientEmail: user.email,
      returnUrl: WFP_RETURN_URL,
      serviceUrl: WFP_SERVICE_URL,
    },
  });
});

app.post("/api/wayforpay/callback", (req, res) => {
  const body = req.body || {};
  const { merchantAccount, orderReference, amount, currency, authCode, cardPan, transactionStatus, reasonCode, merchantSignature } = body;

  const expectedSignature = hmacMd5(
    WFP_MERCHANT_SECRET,
    [merchantAccount, orderReference, amount, currency, authCode, cardPan, transactionStatus, reasonCode].join(";")
  );

  const orders = readJSON(ORDERS_PATH, []);
  const order = orders.find((o) => o.orderReference === orderReference);

  if (merchantSignature === expectedSignature && order) {
    order.status = transactionStatus === "Approved" ? "paid" : "failed";
    order.transactionStatus = transactionStatus;
    order.updatedAt = new Date().toISOString();
    writeJSON(ORDERS_PATH, orders);
  }

  const time = Math.floor(Date.now() / 1000);
  const status = "accept";
  res.json({
    orderReference,
    status,
    time,
    signature: makeCallbackAckSignature(orderReference, status, time),
  });
});

// SPA fallback — anything not matched above (a client-side route) gets the React app shell.
app.get("*", (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`formlq store server running at ${BASE_URL}`);
});
