import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import ProductCover from "../components/ProductCover";
import { useAuth } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { getAccountOrders, getProducts, downloadUrl, viewUrl, getInvites, inviteStudent, createShareLink, revokeInvite } from "../api";

const FORMAT_LABELS = { pdf: "PDF", print: "Друк" };

function InviteStudents({ productId }) {
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState(null);

  function loadInvites() {
    getInvites(productId)
      .then((res) => setInvites(res.invites))
      .catch(() => {});
  }

  useEffect(() => {
    // The link is per teacher+product and always the same — create it once, reuse after.
    createShareLink(productId)
      .then((res) => setCode(res.code))
      .catch(() => {});
    loadInvites();
  }, [productId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await inviteStudent(productId, email);
      setEmail("");
      loadInvites();
    } catch (err) {
      setError(err.message || "Не вдалося додати учня.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(studentEmail) {
    if (!window.confirm(`Забрати доступ у ${studentEmail}?`)) return;
    setRevoking(studentEmail);
    try {
      await revokeInvite(productId, studentEmail);
      loadInvites();
    } catch (err) {
      setError(err.message || "Не вдалося забрати доступ.");
    } finally {
      setRevoking(null);
    }
  }

  const link = code ? `${window.location.origin}/join/${code}` : null;

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted m-0">
        1. Додай пошту учня, якому дозволено доступ. 2. Скинь йому це саме посилання — він введе ту саму пошту й одразу
        отримає доступ.
      </p>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
        <input
          type="email"
          required
          placeholder="Email учня"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-full border-2 border-accent-soft font-sans text-sm outline-none bg-white focus:border-accent"
        />
        <button type="submit" disabled={submitting} className="btn px-4 py-2.5 text-xs">
          {submitting ? "Додавання…" : "Додати учня"}
        </button>
      </form>
      {error && <p className="error-text m-0">{error}</p>}

      {link && (
        <div className="flex items-center gap-2 bg-surface-soft rounded-full pl-4 pr-1.5 py-1.5 self-start">
          <span className="text-sm font-semibold text-ink-muted truncate max-w-[220px]">{link}</span>
          <button type="button" onClick={copyLink} className="btn px-4 py-2 text-xs">
            {copied ? "Скопійовано ✓" : "Копіювати"}
          </button>
        </div>
      )}

      {invites.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {invites.map((invite) => (
            <div key={invite.studentEmail} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-muted">{invite.studentEmail}</span>
              <div className="flex items-center gap-2">
                <span className={`badge-chip ${invite.granted ? "bg-success-soft text-[#1a7f43]" : ""}`}>
                  {invite.granted ? "Приєднався(-лась)" : "Очікує реєстрації"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRevoke(invite.studentEmail)}
                  disabled={revoking === invite.studentEmail}
                  className="bg-danger-soft text-danger rounded-full font-bold text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  {revoking === invite.studentEmail ? "…" : "Забрати доступ"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PurchaseRow({ order, item, product, onView }) {
  const formats = Object.entries(item.formats || {}).filter(([, enabled]) => enabled);

  return (
    <div className="card p-4 px-5 flex flex-col gap-4">
      <div className="flex items-center gap-4.5 flex-wrap">
        <div className="w-14 h-[74px] rounded-[10px] overflow-hidden relative flex-shrink-0">
          <ProductCover
            product={product || { cover: "soon" }}
            className="!absolute !top-0 !left-0 w-60 h-80 !rounded-none"
            style={{ transform: "scale(0.2333)", transformOrigin: "top left" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ink-muted m-0 mb-1">Куплено {new Date(order.createdAt).toLocaleDateString("uk-UA")}</p>
          <p className="text-base font-bold m-0 mb-2">{item.title}</p>
          {formats.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {formats.map(([key]) => (
                <span key={key} className="badge-chip">
                  {FORMAT_LABELS[key] || key}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {item.formats?.pdf &&
            (item.pdfReady ? (
              <>
                <button type="button" onClick={() => onView(item.productId, item.title)} className="btn btn-ghost">
                  Переглянути
                </button>
                <a href={downloadUrl(item.productId)} className="btn btn-ghost">
                  Завантажити PDF
                </a>
              </>
            ) : (
              <span className="badge-chip">PDF готується</span>
            ))}
          {product?.studyUrl && (
            <Link to={product.studyUrl} className="btn btn-ghost">
              Перейти до навчання
            </Link>
          )}
        </div>
      </div>

      {product?.studyUrl && (
        <div className="flex flex-col gap-2.5 pt-3.5 border-t border-accent-soft">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Для учнів</span>
          <InviteStudents productId={item.productId} />
        </div>
      )}
    </div>
  );
}

export default function Account() {
  const { user, loading, logout } = useAuth();
  const { openLogin } = useAuthModal();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      openLogin({ redirect: "/account" });
    }
  }, [loading, user, openLogin]);

  useEffect(() => {
    if (!user) return;
    Promise.all([getAccountOrders(), getProducts()])
      .then(([ordersRes, productsRes]) => {
        setOrders(ordersRes.orders);
        setProducts(productsRes);
      })
      .catch(() => setError(true));
  }, [user]);

  if (loading || !user) return null;

  const purchasedItems = (orders || []).flatMap((order) => order.items.map((item) => ({ order, item })));
  const productsById = Object.fromEntries((products || []).map((p) => [p.id, p]));

  async function handleLogout() {
    await logout();
    navigate("/catalog");
  }

  return (
    <>
      <SiteNav />
      <main className="max-w-[1080px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold mb-8">Кабінет</h1>

        <div className="card p-5.5 flex items-center justify-between gap-4 flex-wrap mb-7">
          <div>
            <p className="text-base font-bold m-0">{user.name || user.email}</p>
            {user.name && <p className="text-xs text-ink-muted m-0 mt-0.5">{user.email}</p>}
          </div>
          <button type="button" onClick={handleLogout} className="btn btn-ghost">
            Вийти
          </button>
        </div>

        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-3.5">Мої покупки</p>

        {error && <div className="empty-state">Не вдалося завантажити покупки.</div>}

        {orders && (
          <div className="flex flex-col gap-4">
            {purchasedItems.length === 0 ? (
              <div className="empty-state">
                Покупок поки немає.{" "}
                <Link to="/catalog" className="plain-link">
                  До каталогу
                </Link>
              </div>
            ) : (
              purchasedItems.map(({ order, item }) => (
                <PurchaseRow
                  key={`${order.orderReference}-${item.productId}`}
                  order={order}
                  item={item}
                  product={productsById[item.productId]}
                  onView={(productId, title) => setViewer({ productId, title })}
                />
              ))
            )}
          </div>
        )}
      </main>

      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-md modal-backdrop-in"
          onClick={() => setViewer(null)}
        >
          <div
            className="bg-white rounded-lg shadow-card w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden modal-card-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-accent-soft">
              <p className="font-bold m-0 truncate">{viewer.title}</p>
              <button type="button" onClick={() => setViewer(null)} className="btn btn-ghost px-3.5 py-1.5 text-xs">
                Закрити ✕
              </button>
            </div>
            <iframe src={viewUrl(viewer.productId)} title={viewer.title} className="flex-1 w-full border-0" />
          </div>
        </div>
      )}
    </>
  );
}
