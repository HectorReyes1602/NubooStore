# NUBO — Tienda de refacciones automotrices

Aplicación web con frontend estático para GitHub Pages y backend REST en PHP alojado de forma independiente.

## Arquitectura desplegada

- Frontend: `https://jeolfr85-afk.github.io/tienda/`
- Backend: `https://morfosdigital.com/Nuboback`
- Base de datos: MySQL/MariaDB remota.
- Comunicación: JSON sobre HTTPS con CORS limitado al origen de GitHub Pages.

El frontend no accede directamente a la base de datos. Catálogo, usuarios, carrito, stock, totales y pedidos se obtienen o modifican exclusivamente mediante el backend.

## Funciones

- Registro e inicio de sesión.
- Contraseñas protegidas con bcrypt en el servidor.
- JWT de acceso y renovación con roles `customer` y `admin`.
- Recuperación de contraseña mediante código de seis dígitos enviado por correo.
- Catálogo y categorías obtenidos desde la API.
- Carrito persistente por usuario.
- Checkout con cálculo de precios y validación de stock en servidor.
- Consulta de confirmación del pedido desde la base de datos.
- Dashboard de usuario con compras, CRUD de direcciones, métodos de pago y perfil.
- Operaciones administrativas protegidas por rol.

## Estructura

```text
├── index.html, login.html, carrito.html, checkout.html, confirmacion.html, cuenta.html
├── js/
│   ├── api.js          # Cliente HTTP, JWT y renovación de sesión
│   ├── auth.js         # Login, registro y recuperación
│   ├── data.js         # Datos compartidos y presentación
│   ├── catalog.js      # Catálogo consumido desde backend
│   ├── cart.js         # Carrito remoto
│   └── checkout.js     # Pedidos y confirmación remotos
├── backend/            # Proyecto PHP desplegable en /Nuboback
├── database/           # Esquema y migraciones
└── data/products.json  # Fuente utilizada sólo por el script de carga inicial
```

## Configuración importante

La URL del backend está centralizada en `js/api.js`:

```js
const API_BASE_URL = 'https://morfosdigital.com/Nuboback';
```

El `.env` del backend debe contener:

```dotenv
APP_BASE_PATH=/Nuboback
FRONTEND_URL=https://jeolfr85-afk.github.io/tienda/
CORS_ORIGINS=https://jeolfr85-afk.github.io
```

El origen CORS no lleva `/tienda/`, porque un origen sólo contiene esquema, dominio y puerto.

Consulta [backend/README.md](backend/README.md) para los endpoints y pasos de despliegue.

## Datos almacenados en el navegador

El navegador conserva únicamente:

- Información pública del usuario autenticado.
- Refresh token JWT para mantener la sesión.
- Access token temporal dentro de `sessionStorage`.

No se guardan contraseñas, hashes de contraseña, carrito, productos ni pedidos en el navegador.
