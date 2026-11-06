# App de gestión de servicios y reservaciones

Aplicación móvil que permite a los usuarios explorar establecimientos, consultar sus servicios y realizar reservaciones de manera sencilla. Incluye dos tipos de usuario (cliente y administrador) y un super administrador para la vista global.

## Tecnologías

- **App móvil:** React Native con Expo (SDK 58), React Navigation, Context con `useReducer`, AsyncStorage y expo-notifications.
- **Backend:** Node.js con Express, persistencia en archivo JSON (`backend/data.json`).
- **Comunicación:** API REST con `fetch`.

## Estructura del proyecto

```
App.js                      Punto de entrada
src/
  context/AuthContext.js    Estado de sesión (useReducer + Context)
  navigation/               Navegación por rol
  screens/                  Pantallas de cliente, administrador y super administrador
  components/               Componentes reutilizables (botones, badges, animaciones)
  services/api.js           Cliente de la API REST
  services/config.js        URL del backend
  services/notifications.js Notificaciones locales
backend/
  server.js                 API REST y reglas de negocio
  admin.js                  Dueños de prueba y vista del super administrador
  data.json                 Base de datos persistente
```

## Requisitos

- Node.js 18 o superior
- Cuenta de GitHub (para Codespaces) o un entorno local
- Expo Go en el celular (para probar en dispositivo)

## Cómo ejecutarlo

**1. Backend** (en una terminal):

```bash
cd backend && npm install && npm start
```

Debe mostrar `API de reservaciones corriendo en el puerto 3000`.

**2. Puerto público:** en Codespaces, abre la pestaña PORTS, haz clic derecho en el puerto 3000 y marca **Public**.

**3. Configurar la URL:** en `src/services/config.js` escribe la URL pública del puerto 3000 de tu Codespace.

**4. Aplicación** (en otra terminal, desde la raíz del proyecto):

```bash
npm install
npx expo start --web          # navegador
npx expo start --tunnel ngrok # celular con Expo Go
```

## Cuentas de prueba

Contraseña para todas: `123456`

| Correo | Rol | Qué ve |
|---|---|---|
| cliente@demo.com | Cliente | Negocios, reservaciones y notificaciones |
| admin@demo.com | Administrador | Barbería El Corte |
| spa@demo.com | Administrador | Spa Luna |
| dental@demo.com | Administrador | Clínica Dental Sonrisa |
| gym@demo.com | Administrador | Gimnasio Fuerza |
| superadmin@demo.com | Super administrador | Todos los negocios, servicios y citas |

## Funcionalidades

### Cliente
- Registro e inicio de sesión.
- Explorar establecimientos, buscar por nombre, categoría o servicio y filtrar por categoría.
- Consultar precios, descripciones, duración y horarios disponibles.
- Reservar eligiendo servicio, día y hora.
- Cancelar reservaciones (hasta 2 horas antes de la cita).
- Historial de citas con su estado.
- Notificaciones de cambios en sus citas, con revisión cada 15 segundos.

### Administrador
- Registrar su establecimiento con ícono, dirección y horario.
- CRUD de servicios: agregar, editar y eliminar, con precio y duración.
- Configurar horario de atención.
- Consultar reservaciones con filtros por estado.
- Confirmar, finalizar y cancelar citas.
- Resumen con citas de hoy, pendientes, confirmadas, ingresos y clientes.

### Super administrador
- Totales globales de negocios, citas, clientes e ingresos.
- Lista de todos los negocios con su administrador.
- Todas las citas del sistema, con acciones de confirmar, finalizar y cancelar.

## Reglas de negocio

- No se permiten reservaciones en horarios ocupados.
- La disponibilidad considera la duración de cada servicio.
- No se permiten reservaciones en fechas pasadas.
- Se requiere al menos 1 hora de anticipación.
- Se puede reservar hasta 60 días adelante.
- Un cliente puede tener máximo 3 citas activas.
- El cliente no puede cancelar a menos de 2 horas de la cita.
- Las citas confirmadas se finalizan solas cuando termina su tiempo.
- No se puede cambiar el horario si quedan citas activas fuera de él.
- No se puede cambiar la duración de un servicio con citas activas.

Las reglas se validan en el servidor, no solo en la app.

## Estados de una reservación

```
pendiente → confirmada → finalizada
    ↓            ↓
 cancelada   cancelada
```

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | /auth/login | Iniciar sesión |
| POST | /auth/register | Registrar cliente |
| GET | /establishments | Listar negocios |
| GET | /establishments/:id | Detalle de un negocio |
| POST | /establishments | Registrar negocio |
| PUT | /establishments/:id | Editar datos del negocio |
| PUT | /establishments/:id/hours | Configurar horario |
| POST | /establishments/:id/services | Agregar servicio |
| PUT | /establishments/:id/services/:sid | Editar servicio |
| DELETE | /establishments/:id/services/:sid | Eliminar servicio |
| GET | /establishments/:id/slots | Horarios disponibles |
| POST | /reservations | Crear reservación |
| PATCH | /reservations/:id | Cambiar estado |
| GET | /users/:id/reservations | Citas de un cliente |
| GET | /establishments/:id/reservations | Citas de un negocio |
| GET | /establishments/:id/stats | Estadísticas del negocio |
| GET | /users/:id/notifications | Notificaciones |
| GET | /admin/overview | Vista global (super admin) |

## Limitaciones conocidas

- Las contraseñas se guardan en texto plano y no hay tokens de sesión. En producción se usaría hash (bcrypt) y JWT.
- Los negocios usan íconos y colores en lugar de fotos.
- Las notificaciones se consultan periódicamente, no llegan por push en tiempo real.
- No hay pruebas automatizadas.

## Autor

Jorge Luis Gámez Ramírez · Universidad Autónoma de Tamaulipas, Facultad de Ingeniería Tampico
