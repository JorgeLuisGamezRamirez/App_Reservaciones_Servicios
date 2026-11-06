// Dueños de negocios de prueba, super administrador y endpoint de vista global.
const NEW_USERS = [
  { id: 'u3', name: 'Dueño Spa Luna', email: 'spa@demo.com', password: '123456', role: 'admin' },
  { id: 'u4', name: 'Dueña Clínica Sonrisa', email: 'dental@demo.com', password: '123456', role: 'admin' },
  { id: 'u5', name: 'Dueño Gimnasio Fuerza', email: 'gym@demo.com', password: '123456', role: 'admin' },
  { id: 'u6', name: 'Super Administrador', email: 'superadmin@demo.com', password: '123456', role: 'superadmin' },
];
const OWNERS = { e2: 'u3', e3: 'u4', e4: 'u5' };
const ACTIVE = ['pendiente', 'confirmada'];

module.exports = function registerAdmin(app, db, save, enrich) {
  // Migración: agrega cuentas nuevas y asigna dueños a los negocios que no tenían
  let changed = false;
  NEW_USERS.forEach((u) => {
    if (!db.users.some((x) => x.email === u.email)) {
      db.users.push(u);
      changed = true;
    }
  });
  db.establishments.forEach((e) => {
    if (!e.ownerId && OWNERS[e.id]) {
      e.ownerId = OWNERS[e.id];
      changed = true;
    }
  });
  if (changed) save();

  app.get('/admin/overview', (req, res) => {
    const user = db.users.find((u) => u.id === req.query.userId);
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Solo el super administrador puede ver esta información' });
    }

    const establishments = db.establishments.map((e) => {
      const list = db.reservations.filter((r) => r.establishmentId === e.id);
      const priceOf = (r) => e.services.find((s) => s.id === r.serviceId)?.price ?? 0;
      return {
        id: e.id,
        name: e.name,
        category: e.category,
        address: e.address,
        icon: e.icon,
        color: e.color,
        owner: db.users.find((u) => u.id === e.ownerId)?.name || 'Sin administrador',
        services: e.services.length,
        pendientes: list.filter((r) => r.status === 'pendiente').length,
        confirmadas: list.filter((r) => r.status === 'confirmada').length,
        finalizadas: list.filter((r) => r.status === 'finalizada').length,
        ingresos: list.filter((r) => r.status === 'finalizada').reduce((sum, r) => sum + priceOf(r), 0),
      };
    });

    const reservations = db.reservations
      .map(enrich)
      .sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);

    const totals = {
      establecimientos: db.establishments.length,
      citas: db.reservations.length,
      activas: db.reservations.filter((r) => ACTIVE.includes(r.status)).length,
      clientes: new Set(db.reservations.map((r) => r.userId)).size,
      ingresos: establishments.reduce((sum, e) => sum + e.ingresos, 0),
    };

    res.json({ totals, establishments, reservations });
  });
};
