import { API_URL } from './config';
import { sendLocalPush } from './notifications';

// Cliente de la API REST. Las reglas de negocio se validan en el servidor.
export const RULES = { maxDaysAhead: 60, minLeadMinutes: 60, clientCancelMinutes: 120, maxActivePerClient: 3 };
export const PALETTE = ['#1e3a8a', '#0f766e', '#0e7490', '#9a3412', '#6d28d9', '#be185d'];

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Revisa que el backend esté corriendo.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

const pad = (n) => String(n).padStart(2, '0');
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return `${DAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
}

export function formatTime(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

// ---------- Autenticación ----------
export const mockLogin = (email, password) => request('POST', '/auth/login', { email, password });
export const mockRegister = (data) => request('POST', '/auth/register', data);

// ---------- Establecimientos y servicios ----------
export const getEstablishments = () => request('GET', '/establishments');
export const getEstablishment = (id) => request('GET', `/establishments/${id}`);
export const getMyEstablishment = (ownerId) => request('GET', `/owners/${ownerId}/establishment`);
export const registerEstablishment = (ownerId, data) => request('POST', '/establishments', { ownerId, ...data });
export const updateEstablishment = (id, data) => request('PUT', `/establishments/${id}`, data);
export const updateHours = (id, open, close) => request('PUT', `/establishments/${id}/hours`, { open, close });
export const addService = (id, data) => request('POST', `/establishments/${id}/services`, data);
export const updateService = (id, sid, data) => request('PUT', `/establishments/${id}/services/${sid}`, data);
export const deleteService = (id, sid) => request('DELETE', `/establishments/${id}/services/${sid}`);

// ---------- Disponibilidad y reservaciones ----------
export const getAvailableSlots = (id, serviceId, date) =>
  request('GET', `/establishments/${id}/slots?serviceId=${serviceId}&date=${date}`);

export async function createReservation(data) {
  const r = await request('POST', '/reservations', data);
  await sendLocalPush('Reservación creada', `${r.establishmentName} · ${formatDate(r.date)} ${formatTime(r.start)}`);
  return r;
}

export const getReservations = (userId) => request('GET', `/users/${userId}/reservations`);
export const getEstablishmentReservations = (id) => request('GET', `/establishments/${id}/reservations`);
export const getAdminStats = (id) => request('GET', `/establishments/${id}/stats`);
export const setReservationStatus = (id, status, actor) => request('PATCH', `/reservations/${id}`, { status, actor });
export const cancelReservation = (id) => setReservationStatus(id, 'cancelada', 'cliente');

// ---------- Notificaciones ----------
export const getNotifications = (userId) => request('GET', `/users/${userId}/notifications`);
export const markNotificationsRead = (userId) => request('POST', `/users/${userId}/notifications/read`);

// ---------- Super administrador ----------
export const getOverview = (userId) => request('GET', `/admin/overview?userId=${userId}`);

// ---------- Super administrador ----------
