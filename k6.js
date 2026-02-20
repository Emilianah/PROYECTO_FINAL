import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 5 },
        { duration: "20s", target: 20 },
        { duration: "20s", target: 50 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],

    // 👇 extra: demuestra que los GET deben ser rápidos (cache)
    "http_req_duration{kind:cache_get}": ["p(95)<200"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8001";

function randomId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now();
}

export default function () {
  // 1) Crear orden (esto siempre toca MySQL)
  const oid = randomId();
  const payload = JSON.stringify({
    cliente: "k6-user",
    items: [
      { producto: "camisa", talla: "M", color: "negro", cantidad: 1, precio_unitario: 10 },
      { producto: "pantalon", talla: "L", color: "azul", cantidad: 1, precio_unitario: 20 },
    ],
  });

  const createRes = http.post(`${BASE_URL}/orders`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { kind: "write" },
  });

  check(createRes, {
    "POST /orders status 200": (r) => r.status === 200,
  });

  let idFromApi = "";
  try {
    idFromApi = createRes.json("id");
  } catch (e) {}

  // 2) Leer por id repetido (para que el 2do/3er GET sea cache hit)
  if (idFromApi) {
    const get1 = http.get(`${BASE_URL}/orders/${idFromApi}`, { tags: { kind: "cache_get" } });
    const get2 = http.get(`${BASE_URL}/orders/${idFromApi}`, { tags: { kind: "cache_get" } });
    const get3 = http.get(`${BASE_URL}/orders/${idFromApi}`, { tags: { kind: "cache_get" } });

    check(get1, { "GET /orders/{id} 200 (1)": (r) => r.status === 200 });
    check(get2, { "GET /orders/{id} 200 (2)": (r) => r.status === 200 });
    check(get3, { "GET /orders/{id} 200 (3)": (r) => r.status === 200 });
  }

  // 3) Pending repetido (aquí se debe ver Redis súper claro)
  const p1 = http.get(`${BASE_URL}/orders/pending`, { tags: { kind: "cache_get" } });
  const p2 = http.get(`${BASE_URL}/orders/pending`, { tags: { kind: "cache_get" } });
  const p3 = http.get(`${BASE_URL}/orders/pending`, { tags: { kind: "cache_get" } });

  check(p1, { "GET /orders/pending 200 (1)": (r) => r.status === 200 });
  check(p2, { "GET /orders/pending 200 (2)": (r) => r.status === 200 });
  check(p3, { "GET /orders/pending 200 (3)": (r) => r.status === 200 });

  // pequeño sleep para no reventar por puro POST
  sleep(0.2);
}
