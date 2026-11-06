const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');

const ACTIVE = ['pendiente', 'confirmada'];
const STATUS_FLOW = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['finalizada', 'cancelada'],
  cancelada: [],
  finalizada: [],
};
const RULES = { maxDaysAhead: 60, minLeadMinutes: 60, clientCancelMinutes: 120, maxActivePerClient: 3 };
const PALETTE = ['#1e3a8a', '#0f766e', '#0e7490', '#9a3412', '#6d28d9', '#be185d'];
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Utilidades ----------
const pad = (n) => String(n).padStart(2, '0');
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const fail = (message, status = 400) => {
  const e = new Error(message);
  e.status = status;
  return e;
};
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayString = () => toDateString(new Date());
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateString(d);
};
const formatTime = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
const formatDate = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return `${DAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
};
const startMs = (date, start) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(start / 60), start % 60).getTime();
};
const overlaps = (startA, durA, startB, durB) => startA < startB + durB && startB < startA + durA;

function parseTime(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(text || '').trim());
  if (!match) throw fail('Usa el formato HH:MM, por ejemplo 09:00');
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) throw fail('Hora inválida');
  return h * 60 + m;
}

// ---------- Base de datos (archivo JSON) ----------
function seed() {
  return {
    users: [
      { id: 'u1', name: 'Cliente Demo', email: 'cliente@demo.com', password: '123456', role: 'cliente' },
      { id: 'u2', name: 'Admin Demo', email: 'admin@demo.com', password: '123456', role: 'admin' },
    ],
    establishments: [
      {
        id: 'e1', ownerId: 'u2', name: 'Barbería El Corte', category: 'Barbería', rating: 4.8, address: 'Ciudad Madero',
        icon: '💈', color: '#1e3a8a', open: 540, close: 1080,
        services: [
          { id: 's1', name: 'Corte clásico', description: 'Corte con tijera o máquina y acabado.', price: 120, duration: 45 },
          { id: 's2', name: 'Barba', description: 'Perfilado y arreglo de barba.', price: 80, duration: 30 },
          { id: 's3', name: 'Corte + barba', description: 'Paquete completo.', price: 180, duration: 60 },
        ],
      },
      {
        id: 'e2', ownerId: null, name: 'Spa Luna', category: 'Spa', rating: 4.6, address: 'Tampico',
        icon: '🧖', color: '#0f766e', open: 600, close: 1140,
        services: [
          { id: 's4', name: 'Masaje relajante', description: 'Masaje de cuerpo completo con aceites.', price: 450, duration: 60 },
          { id: 's5', name: 'Facial hidratante', description: 'Limpieza profunda e hidratación.', price: 300, duration: 45 },
        ],
      },
      {
        id: 'e3', ownerId: null, name: 'Clínica Dental Sonrisa', category: 'Dentista', rating: 4.9, address: 'Altamira',
        icon: '🦷', color: '#0e7490', open: 540, close: 1020,
        services: [
          { id: 's6', name: 'Limpieza dental', description: 'Limpieza y revisión general.', price: 350, duration: 45 },
          { id: 's7', name: 'Consulta', description: 'Valoración con el dentista.', price: 250, duration: 30 },
        ],
      },
      {
        id: 'e4', ownerId: null, name: 'Gimnasio Fuerza', category: 'Gimnasio', rating: 4.5, address: 'Madero',
        icon: '🏋️', color: '#9a3412', open: 360, close: 1320,
        services: [
          { id: 's8', name: 'Entrenamiento personal', description: 'Sesión 1 a 1 con entrenador certificado.', price: 350, duration: 60 },
          { id: 's9', name: 'Clase grupal', description: 'Clase de acondicionamiento físico.', price: 120, duration: 45 },
        ],
      },
    ],
    reservations: [],
    notifications: [],
  };
}

let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : seed();
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// ---------- Reglas y helpers de negocio ----------
const publicUser = (u) => {
  const { password, ...safe } = u;
  return safe;
};
const minPriceOf = (e) => (e.services.length ? Math.min(...e.services.map((s) => s.price)) : 0);

function findEst(id) {
  const e = db.establishments.find((x) => x.id === id);
  if (!e) throw fail('Establecimiento no encontrado', 404);
  return e;
}

function findService(est, sid) {
  const s = est.services.find((x) => x.id === sid);
  if (!s) throw fail('Servicio no encontrado', 404);
  return s;
}

function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw fail('Fecha inválida');
  if (date < todayString()) throw fail('No puedes reservar en fechas pasadas');
  if (date > addDays(RULES.maxDaysAhead)) throw fail(`Solo puedes reservar hasta ${RULES.maxDaysAhead} días adelante`);
}

function validateService({ name, price, duration }) {
  if (!String(name || '').trim()) throw fail('El servicio necesita nombre');
  const p = Number(price);
  const d = Number(duration);
  if (!Number.isFinite(p) || p < 0) throw fail('Precio inválido');
  if (!Number.isInteger(d) || d < 5) throw fail('La duración debe ser un número entero de minutos (mínimo 5)');
  return { price: p, duration: d };
}

function notify(userId, message) {
  db.notifications.push({ id: newId(), userId, message, read: false, createdAt: new Date().toISOString() });
}

function isFree(est, service, date, start) {
  if (start < est.open || start + service.duration > est.close) return false;
  if (startMs(date, start) < Date.now() + RULES.minLeadMinutes * 60000) return false;
  return !db.reservations.some(
    (r) =>
      r.establishmentId === est.id &&
      r.date === date &&
      ACTIVE.includes(r.status) &&
      overlaps(start, service.duration, r.start, r.duration)
  );
}

// Finaliza automáticamente las citas confirmadas cuya hora ya terminó
function autoFinish() {
  const now = Date.now();
  db.reservations.forEach((r) => {
    if (r.status === 'confirmada' && startMs(r.date, r.start) + r.duration * 60000 <= now) {
      r.status = 'finalizada';
      notify(r.userId, `Tu cita del ${formatDate(r.date)} a las ${formatTime(r.start)} se marcó como finalizada. ¡Gracias por tu visita!`);
    }
  });
}

function enrich(r) {
  const est = db.establishments.find((e) => e.id === r.establishmentId);
  const service = est?.services.find((s) => s.id === r.serviceId);
  const user = db.users.find((u) => u.id === r.userId);
  const mins = (startMs(r.date, r.start) - Date.now()) / 60000;
  const active = ACTIVE.includes(r.status);
  return {
    ...r,
    userName: user?.name || 'Cliente',
    establishmentName: est?.name || 'Establecimiento',
    serviceName: service?.name || 'Servicio',
    price: service?.price ?? 0,
    canConfirm: r.status === 'pendiente',
    canFinish: r.status === 'confirmada' && mins <= 0,
    canCancelAdmin: active,
    canCancelClient: active && mins >= RULES.clientCancelMinutes,
  };
}

const sortByDate = (list) =>
  list.sort((a, b) => (b.date + formatTime(b.start)).localeCompare(a.date + formatTime(a.start)));

// ---------- Middleware ----------
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

const route = (fn) => (req, res) => {
  try {
    res.json(fn(req));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Error interno' });
  }
};

// ---------- Rutas ----------
app.get('/', (req, res) => res.json({ ok: true, message: 'API de reservaciones activa' }));

// Autenticación
app.post('/auth/login', route((req) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user || user.password !== req.body.password) throw fail('Correo o contraseña incorrectos', 401);
  return publicUser(user);
}));

app.post('/auth/register', route((req) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 3) throw fail('Escribe tu nombre completo (mínimo 3 letras)');
  if (!EMAIL_RE.test(email)) throw fail('Correo no válido');
  if (password.length < 6) throw fail('La contraseña debe tener al menos 6 caracteres');
  if (db.users.some((u) => u.email === email)) throw fail('Ya existe una cuenta con ese correo', 409);
  // El registro público solo crea clientes
  const user = { id: newId(), name, email, password, role: 'cliente' };
  db.users.push(user);
  save();
  return publicUser(user);
}));

// Establecimientos
app.get('/establishments', route(() => db.establishments.map((e) => ({ ...e, minPrice: minPriceOf(e) }))));

app.get('/establishments/:id', route((req) => findEst(req.params.id)));

app.get('/owners/:ownerId/establishment', route((req) =>
  db.establishments.find((e) => e.ownerId === req.params.ownerId) || null
));

app.post('/establishments', route((req) => {
  const { ownerId, name = '', category = '', address = '', icon, open, close } = req.body;
  if (db.establishments.some((e) => e.ownerId === ownerId)) throw fail('Ya tienes un establecimiento registrado');
  if (!name.trim() || !category.trim() || !address.trim()) throw fail('Completa nombre, categoría y dirección');
  const o = parseTime(open);
  const c = parseTime(close);
  if (o >= c) throw fail('La hora de cierre debe ser posterior a la de apertura');
  const est = {
    id: newId(), ownerId, name: name.trim(), category: category.trim(), address: address.trim(),
    icon: icon || '🏪', color: PALETTE[name.trim().length % PALETTE.length], rating: 5, open: o, close: c, services: [],
  };
  db.establishments.push(est);
  save();
  return est;
}));

app.put('/establishments/:id', route((req) => {
  const est = findEst(req.params.id);
  const { name = '', category = '', address = '', icon } = req.body;
  if (!name.trim() || !category.trim() || !address.trim()) throw fail('Completa nombre, categoría y dirección');
  Object.assign(est, { name: name.trim(), category: category.trim(), address: address.trim(), icon: icon || est.icon });
  save();
  return est;
}));

app.put('/establishments/:id/hours', route((req) => {
  const est = findEst(req.params.id);
  const o = parseTime(req.body.open);
  const c = parseTime(req.body.close);
  if (o >= c) throw fail('La hora de cierre debe ser posterior a la de apertura');
  const conflict = db.reservations.some(
    (r) => r.establishmentId === est.id && ACTIVE.includes(r.status) && (r.start < o || r.start + r.duration > c)
  );
  if (conflict) throw fail('Hay citas activas fuera de ese horario. Cancélalas o elige otro horario.', 409);
  est.open = o;
  est.close = c;
  save();
  return est;
}));

// Servicios (CRUD)
app.post('/establishments/:id/services', route((req) => {
  const est = findEst(req.params.id);
  const { price, duration } = validateService(req.body);
  est.services.push({
    id: newId(), name: req.body.name.trim(), description: (req.body.description || '').trim(), price, duration,
  });
  save();
  return est;
}));

app.put('/establishments/:id/services/:sid', route((req) => {
  const est = findEst(req.params.id);
  const s = findService(est, req.params.sid);
  const { price, duration } = validateService(req.body);
  const hasActive = db.reservations.some((r) => r.serviceId === s.id && ACTIVE.includes(r.status));
  if (hasActive && duration !== s.duration) throw fail('No puedes cambiar la duración de un servicio con citas activas');
  Object.assign(s, { name: req.body.name.trim(), description: (req.body.description || '').trim(), price, duration });
  save();
  return est;
}));

app.delete('/establishments/:id/services/:sid', route((req) => {
  const est = findEst(req.params.id);
  if (db.reservations.some((r) => r.serviceId === req.params.sid && ACTIVE.includes(r.status))) {
    throw fail('No puedes eliminar un servicio con citas activas', 409);
  }
  est.services = est.services.filter((s) => s.id !== req.params.sid);
  save();
  return est;
}));

// Disponibilidad
app.get('/establishments/:id/slots', route((req) => {
  const { serviceId, date } = req.query;
  validateDate(date);
  const est = findEst(req.params.id);
  const service = findService(est, serviceId);
  const slots = [];
  for (let start = est.open; start + service.duration <= est.close; start += 30) {
    if (isFree(est, service, date, start)) slots.push(start);
  }
  return slots;
}));

// Reservaciones
app.post('/reservations', route((req) => {
  const { userId, establishmentId, serviceId, date } = req.body;
  const start = Number(req.body.start);
  validateDate(date);
  const est = findEst(establishmentId);
  const service = findService(est, serviceId);

  const activeMine = db.reservations.filter((r) => r.userId === userId && ACTIVE.includes(r.status)).length;
  if (activeMine >= RULES.maxActivePerClient) {
    throw fail(`Ya tienes ${RULES.maxActivePerClient} citas activas. Espera a que se completen o cancela una.`, 409);
  }
  const overlapMine = db.reservations.some(
    (r) => r.userId === userId && r.date === date && ACTIVE.includes(r.status) && overlaps(start, service.duration, r.start, r.duration)
  );
  if (overlapMine) throw fail('Ya tienes otra cita en ese horario', 409);
  if (!isFree(est, service, date, start)) throw fail('Ese horario ya no está disponible', 409);

  const r = { id: newId(), userId, establishmentId, serviceId, date, start, duration: service.duration, status: 'pendiente' };
  db.reservations.push(r);
  notify(userId, `Recibimos tu reservación en ${est.name} para el ${formatDate(date)} a las ${formatTime(start)}. Está pendiente de confirmación.`);
  save();
  return enrich(r);
}));

app.get('/users/:userId/reservations', route((req) => {
  autoFinish();
  save();
  return sortByDate(db.reservations.filter((r) => r.userId === req.params.userId).map(enrich));
}));

app.get('/establishments/:id/reservations', route((req) => {
  autoFinish();
  save();
  return sortByDate(db.reservations.filter((r) => r.establishmentId === req.params.id).map(enrich));
}));

app.get('/establishments/:id/stats', route((req) => {
  autoFinish();
  save();
  const est = findEst(req.params.id);
  const list = db.reservations.filter((r) => r.establishmentId === est.id);
  const priceOf = (r) => est.services.find((s) => s.id === r.serviceId)?.price ?? 0;
  return {
    hoy: list.filter((r) => r.date === todayString() && ACTIVE.includes(r.status)).length,
    pendientes: list.filter((r) => r.status === 'pendiente').length,
    confirmadas: list.filter((r) => r.status === 'confirmada').length,
    finalizadas: list.filter((r) => r.status === 'finalizada').length,
    ingresos: list.filter((r) => r.status === 'finalizada').reduce((sum, r) => sum + priceOf(r), 0),
    clientes: new Set(list.map((r) => r.userId)).size,
  };
}));

// actor: 'admin' puede confirmar, cancelar y finalizar; 'cliente' solo cancelar con anticipación
app.patch('/reservations/:id', route((req) => {
  const { status: newStatus, actor } = req.body;
  const r = db.reservations.find((x) => x.id === req.params.id);
  if (!r) throw fail('Reservación no encontrada', 404);

  if (actor === 'cliente') {
    if (newStatus !== 'cancelada') throw fail('Solo puedes cancelar tu cita', 403);
    const mins = (startMs(r.date, r.start) - Date.now()) / 60000;
    if (mins < RULES.clientCancelMinutes) {
      throw fail(`Ya no puedes cancelar: faltan menos de ${RULES.clientCancelMinutes / 60} horas. Contacta al establecimiento.`, 403);
    }
  }
  if (!STATUS_FLOW[r.status].includes(newStatus)) throw fail(`No puedes cambiar una cita ${r.status} a ${newStatus}`, 409);
  if (newStatus === 'finalizada' && startMs(r.date, r.start) > Date.now()) {
    throw fail('Solo puedes finalizar una cita cuando ya comenzó', 409);
  }

  r.status = newStatus;
  if (actor === 'admin') {
    const est = findEst(r.establishmentId);
    const when = `${formatDate(r.date)} a las ${formatTime(r.start)}`;
    const messages = {
      confirmada: `Tu cita en ${est.name} del ${when} fue confirmada.`,
      cancelada: `Tu cita en ${est.name} del ${when} fue cancelada por el establecimiento.`,
      finalizada: `Tu cita en ${est.name} del ${when} se marcó como finalizada. ¡Gracias por tu visita!`,
    };
    if (messages[newStatus]) notify(r.userId, messages[newStatus]);
  }
  save();
  return enrich(r);
}));

// Notificaciones
app.get('/users/:userId/notifications', route((req) =>
  db.notifications
    .filter((n) => n.userId === req.params.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
));

app.post('/users/:userId/notifications/read', route((req) => {
  db.notifications.forEach((n) => {
    if (n.userId === req.params.userId) n.read = true;
  });
  save();
  return { ok: true };
}));

require('./admin')(app, db, save, enrich);

require('./admin')(app, db, save, enrich);

app.listen(PORT, () => console.log(`API de reservaciones corriendo en el puerto ${PORT}`));
