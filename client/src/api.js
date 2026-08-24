async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }

  if (!res.ok) {
    const error = new Error((body && body.error) || "Щось пішло не так.");
    error.status = res.status;
    throw error;
  }
  return body;
}

export function getProducts() {
  return request("/api/products");
}

export function getDecks() {
  return request("/api/decks");
}

export function registerUser({ name, email, password }) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function loginUser({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutUser() {
  return request("/api/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser() {
  try {
    return await request("/api/auth/me");
  } catch (e) {
    return null;
  }
}

export function getAccountOrders() {
  return request("/api/account/orders");
}

export function checkout(items) {
  return request("/api/checkout", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function downloadUrl(productId) {
  return `/api/account/download/${encodeURIComponent(productId)}`;
}

export function viewUrl(productId) {
  return `/api/account/view/${encodeURIComponent(productId)}`;
}

export function googleAuthUrl(redirect) {
  return `/auth/google?redirect=${encodeURIComponent(redirect)}`;
}

export function inviteStudent(productId, studentEmail) {
  return request("/api/account/invite", {
    method: "POST",
    body: JSON.stringify({ productId, studentEmail }),
  });
}

export function getInvites(productId) {
  return request(`/api/account/invite/${encodeURIComponent(productId)}`);
}

export function revokeInvite(productId, studentEmail) {
  return request("/api/account/invite/revoke", {
    method: "POST",
    body: JSON.stringify({ productId, studentEmail }),
  });
}

export function createShareLink(productId) {
  return request("/api/account/share-link", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export function getShareLinkInfo(code) {
  return request(`/api/share-links/${encodeURIComponent(code)}`);
}

export function claimShareLink(code, email) {
  return request(`/api/share-links/${encodeURIComponent(code)}/claim`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
