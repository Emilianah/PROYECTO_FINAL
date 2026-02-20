import { useEffect, useMemo, useState } from "react";
import { API_URL, NOTIF_URL } from "./config";

const emptyItem = { producto: "", talla: "", color: "", cantidad: 1, precio_unitario: 1 };

function money(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

function Badge({ text, variant = "gray" }) {
  const dotClass = variant === "green" ? "dot green" : variant === "blue" ? "dot blue" : "dot";
  return (
    <span className="pill">
      <span className={dotClass} />
      {text}
    </span>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">{title}</div>
          {subtitle ? <div className="card-sub">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="field">
      <div className="label">{label}</div>
      <input className="input" value={value} onChange={onChange} placeholder={placeholder} type={type} />
    </div>
  );
}

function Button({ children, onClick, variant = "primary", disabled }) {
  const cls = variant === "primary" ? "btn primary" : "btn";
  return (
    <button className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* =========================
   LOGIN / REGISTER (MEJORADO)
========================= */

function AuthCard({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("ana@mail.com");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;
      const body = mode === "login" ? { email, password } : { nombre: nombre || "Usuario", email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error");

      onAuth(data); // {token, user}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(720px, 92vw)",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: -0.8 }}>Swap Shop</div>
          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 15 }}>
            Tienda de segunda mano • Demo académica (Polling + WebHook)
          </div>
        </div>

        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: 640,
            margin: "0 auto",
            transform: "translateY(-6px)",
          }}
        >
          <div className="card-head" style={{ padding: 22 }}>
            <div>
              <div className="card-title" style={{ fontSize: 20 }}>
                {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </div>
              <div className="card-sub" style={{ fontSize: 13 }}>
                Accede para crear pedidos y ver notificaciones
              </div>
            </div>
          </div>

          <div className="card-body" style={{ padding: 22, display: "grid", gap: 14 }}>
            {mode === "register" ? (
              <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ana" />
            ) : null}

            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@mail.com" />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error ? <div className="alert">{error}</div> : null}

            <button
              className="btn primary"
              onClick={submit}
              disabled={loading}
              style={{ padding: "12px 14px", borderRadius: 14, fontSize: 15 }}
            >
              {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Registrarme"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
              </div>

              <button
                className="btn"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                style={{ padding: "10px 12px", borderRadius: 14 }}
              >
                {mode === "login" ? "Registrarme" : "Iniciar sesión"}
              </button>
            </div>

            <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              Tip: para demo puedes usar cualquier email y contraseña que tengas registrada.
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          Backend: <b>http://localhost:8001</b> • Front: <b>http://localhost:5173</b>
        </div>
      </div>
    </div>
  );
}

/* =========================
   DASHBOARD (APP PRINCIPAL)
========================= */

function Dashboard({ session, logout }) {
  const authHeaders = { Authorization: `Bearer ${session.token}` };

  // Form
  const [cliente, setCliente] = useState(session.user?.nombre || "Ana");
  const [items, setItems] = useState([
    { ...emptyItem, producto: "Chaqueta Vintage", talla: "M", color: "Negro", cantidad: 1, precio_unitario: 20 },
  ]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  // Data
  const [pending, setPending] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  // Auto refresh
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ✅ PAGINACIÓN NOTIFICACIONES
  const [notifPage, setNotifPage] = useState(1);
  const NOTIF_PAGE_SIZE = 3; // cambia a 5 si quieres

  const pendingCount = pending.length;
  const notifCount = notifications.length;

  const totalDraft = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio_unitario || 0), 0);
  }, [items]);

  const notifTotalPages = Math.max(1, Math.ceil(notifications.length / NOTIF_PAGE_SIZE));

  const notifPageItems = useMemo(() => {
    const list = notifications.slice().reverse(); // más nuevas primero
    const start = (notifPage - 1) * NOTIF_PAGE_SIZE;
    return list.slice(start, start + NOTIF_PAGE_SIZE);
  }, [notifications, notifPage]);

  useEffect(() => {
    setNotifPage(1);
  }, [notifications.length]);

  function updateItem(index, key, value) {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function safeJson(res) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  async function fetchPending() {
    const res = await fetch(`${API_URL}/orders/pending`, { headers: authHeaders });
    const data = await safeJson(res);
    setPending(Array.isArray(data) ? data : []);
  }

  async function fetchNotifications() {
    const res = await fetch(`${NOTIF_URL}/notifications`);
    const data = await safeJson(res);
    setNotifications(Array.isArray(data) ? data : []);
  }

  async function syncAll() {
    try {
      await Promise.all([fetchPending(), fetchNotifications()]);
      setLastSync(new Date());
    } catch {
      // no rompemos UI
    }
  }

  useEffect(() => {
    syncAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => syncAll(), 3000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  async function createOrder() {
    setFormError("");

    if (!cliente.trim()) return setFormError("El campo cliente es obligatorio.");
    if (!items.length) return setFormError("Debes agregar al menos 1 item.");

    for (const it of items) {
      if (!it.producto.trim() || !it.talla.trim() || !it.color.trim())
        return setFormError("Cada item debe tener producto, talla y color.");
      if (Number(it.cantidad) < 1) return setFormError("La cantidad debe ser mínimo 1.");
      if (Number(it.precio_unitario) <= 0) return setFormError("El precio unitario debe ser mayor a 0.");
    }

    setCreating(true);
    try {
      const payload = {
        cliente,
        items: items.map((i) => ({
          producto: i.producto,
          talla: i.talla,
          color: i.color,
          cantidad: Number(i.cantidad),
          precio_unitario: Number(i.precio_unitario),
        })),
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Error ${res.status}: ${t}`);
      }

      await syncAll();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <h1>Swap Shop</h1>
            <p>
              Tienda de segunda mano • <b>{session.user?.email}</b>
              {lastSync ? (
                <>
                  {" "}
                  <span style={{ color: "var(--muted)" }}>Última sync: {lastSync.toLocaleTimeString()}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="actions">
            <div className="kpis">
              <Badge text={`Pendientes: ${pendingCount}`} variant={pendingCount ? "blue" : "gray"} />
              <Badge text={`Notificaciones: ${notifCount}`} variant={notifCount ? "green" : "gray"} />
            </div>

            <button className="btn" onClick={syncAll}>
              Refrescar ahora
            </button>
            <button className="btn" onClick={logout}>
              Cerrar sesión
            </button>

            <label className="checkbox">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Actualizar cada 3s
            </label>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="grid">
          <div style={{ display: "grid", gap: 16 }}>
            <Card title="Nuevo pedido" subtitle="Crea un pedido" right={<Badge text="API: :8001" variant="blue" />}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Input label="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ej: Ana" />
                  <div className="field">
                    <div className="label">Total (estimado)</div>
                    <div className="input" style={{ background: "rgba(16,24,40,0.03)", fontWeight: 900 }}>
                      {money(totalDraft)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>Items</div>
                  <button className="btn" onClick={addItem}>
                    + Agregar item
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {items.map((it, idx) => (
                    <div key={idx} className="card" style={{ boxShadow: "var(--shadow2)" }}>
                      <div className="card-body" style={{ padding: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 0.9fr", gap: 10 }}>
                          <Input
                            label="Producto"
                            value={it.producto}
                            onChange={(e) => updateItem(idx, "producto", e.target.value)}
                            placeholder="Ej: Camisa oversize"
                          />
                          <Input label="Talla" value={it.talla} onChange={(e) => updateItem(idx, "talla", e.target.value)} placeholder="M" />
                          <Input label="Color" value={it.color} onChange={(e) => updateItem(idx, "color", e.target.value)} placeholder="Negro" />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                          <Input
                            label="Cantidad"
                            type="number"
                            value={it.cantidad}
                            onChange={(e) => updateItem(idx, "cantidad", e.target.value)}
                            placeholder="1"
                          />
                          <Input
                            label="Precio unitario"
                            type="number"
                            value={it.precio_unitario}
                            onChange={(e) => updateItem(idx, "precio_unitario", e.target.value)}
                            placeholder="20"
                          />

                          <div style={{ display: "flex", alignItems: "end", justifyContent: "end" }}>
                            {items.length > 1 ? (
                              <button className="btn" onClick={() => removeItem(idx)}>
                                Quitar
                              </button>
                            ) : (
                              <div style={{ fontSize: 12, color: "var(--muted)", padding: "10px 0" }}>Mínimo 1 item</div>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                          Subtotal:{" "}
                          <b style={{ color: "var(--text)" }}>{money(Number(it.cantidad || 0) * Number(it.precio_unitario || 0))}</b>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {formError ? <div className="alert">{formError}</div> : null}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button onClick={createOrder} disabled={creating}>
                    {creating ? "Creando..." : "Crear pedido"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              title="Pedidos pendientes"
              subtitle="Estos pedidos están en estado PENDING. El poller los procesa y desaparecen de aquí."
              right={<Badge text="GET /orders/pending" variant="blue" />}
            >
              {pending.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>No hay pedidos pendientes.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((o) => (
                        <tr key={o.id}>
                          <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                            {String(o.id).slice(0, 8)}...
                          </td>
                          <td>{o.cliente}</td>
                          <td>{money(o.total)}</td>
                          <td>
                            <Badge text={o.estado ?? "PENDING"} variant="blue" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <Card
              title="Panel de notificaciones"
              subtitle="Aquí llegan los eventos que el poller envía al receiver-notificaciones."
              right={<Badge text="Receiver: :8002" variant="green" />}
            >
              {notifications.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>Aún no hay notificaciones.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {/* ✅ CONTROLES PAGINACIÓN */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      Página <b>{notifPage}</b> de <b>{notifTotalPages}</b>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" disabled={notifPage <= 1} onClick={() => setNotifPage((p) => Math.max(1, p - 1))}>
                        ← Anterior
                      </button>
                      <button
                        className="btn"
                        disabled={notifPage >= notifTotalPages}
                        onClick={() => setNotifPage((p) => Math.min(notifTotalPages, p + 1))}
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>

                  {/* ✅ LISTA PAGINADA */}
                  {notifPageItems.map((n, idx) => (
                    <div key={idx} className="card" style={{ boxShadow: "var(--shadow2)" }}>
                      <div className="card-body" style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div style={{ fontWeight: 950 }}>{n.evento || n.payload?.evento || "EVENTO"}</div>
                          <Badge text="WebHook recibido" variant="green" />
                        </div>

                        <div style={{ marginTop: 8, fontSize: 13 }}>
                          <div>
                            <span style={{ color: "var(--muted)" }}>Cliente:</span>{" "}
                            <b>{n.cliente || n.payload?.cliente || "—"}</b>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <span style={{ color: "var(--muted)" }}>Total:</span>{" "}
                            <b>{money(n.total ?? n.payload?.total ?? 0)}</b>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)" }}>Color:</span>{" "}
                            <b>{n.payload?.items?.[0]?.color || n.items?.[0]?.color || "—"}</b>
                          </div>
                        </div>

                        <details style={{ marginTop: 10 }}>
                          <summary style={{ cursor: "pointer", fontSize: 13 }}>Ver payload</summary>
                          <pre
                            style={{
                              background: "rgba(16,24,40,0.03)",
                              padding: 12,
                              borderRadius: 12,
                              overflowX: "auto",
                              marginTop: 8,
                              fontSize: 12,
                            }}
                          >
                            {JSON.stringify(n, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="footer">
          Backend: <b>http://localhost:8001</b> • Receiver: <b>http://localhost:8002</b> • Front: <b>http://localhost:5173</b>
        </div>
      </div>
    </div>
  );
}

/* =========================
   APP (SOLO SESIÓN)
========================= */

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem("swapshop_session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("swapshop_session");
      return null;
    }
  });

  function onAuth(data) {
    setSession(data);
    localStorage.setItem("swapshop_session", JSON.stringify(data));
  }

  function logout() {
    setSession(null);
    localStorage.removeItem("swapshop_session");
  }

  if (!session?.token) {
    return <AuthCard onAuth={onAuth} />;
  }

  return <Dashboard session={session} logout={logout} />;
}