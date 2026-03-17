# Frontend — TechSolutions App

Aplicación web desarrollada con React 18 y Vite. Incluye panel de administración completo y portal del colaborador, con autenticación, chat en tiempo real y gestión de proyectos y tareas.

---

## 📋 Requisitos

- Node.js 18 o superior
- npm

---

## 📦 Instalación

```bash
npm install
```

---

## ⚙️ Configuración de entorno

Crea un archivo `.env` en la raíz de esta carpeta:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_ADMIN_ID=uuid-del-usuario-administrador
```

> `VITE_ADMIN_ID` es el UUID del usuario con rol Administrador en la tabla `perfiles` de Supabase. Los usuarios lo usan para abrir el chat directo con el admin.

---

## ▶️ Iniciar en desarrollo

```bash
npm run dev
```

La aplicación corre en `http://localhost:5173`

## 🏗️ Build para producción

```bash
npm run build
```

Los archivos generados quedan en la carpeta `dist/`.

---

## 📁 Estructura del proyecto

```
Frontend/
├── src/
│   ├── components/
│   │   ├── Admin/
│   │   │   ├── AdminDashboard.jsx     # Layout y navegación del admin
│   │   │   ├── AdminDashboard.css
│   │   │   ├── ClientesView.jsx       # CRUD de clientes
│   │   │   ├── ProyectosView.jsx      # CRUD de proyectos
│   │   │   ├── TareasView.jsx         # CRUD de tareas (admin)
│   │   │   └── UsuariosView.jsx       # Gestión de colaboradores
│   │   ├── users/
│   │   │   ├── UsersDashboard.jsx     # Layout del portal de usuario
│   │   │   ├── UsersDashboard.css
│   │   │   └── TareasView.jsx         # Vista de tareas del colaborador
│   │   └── shared/
│   │       ├── Chat.jsx               # Componente de chat en tiempo real
│   │       ├── Chat.css
│   │       └── Perfil.jsx             # Configuración de perfil
│   ├── hooks/
│   │   └── useChat.js                 # Hook para Supabase Realtime
│   ├── admin-design-system.css        # Sistema de diseño compartido (admin)
│   ├── apiClient.js                   # Cliente HTTP con JWT automático
│   ├── supabaseClient.js              # Instancia centralizada de Supabase
│   ├── App.jsx                        # Raíz: auth + routing por rol
│   └── App.css                        # Estilos globales + pantalla de login
├── .env                               # Variables de entorno (no versionar)
├── .env.example                       # Plantilla de variables
└── package.json
```

---

## 🔑 Autenticación y roles

El sistema detecta automáticamente el rol del usuario al iniciar sesión:

- **Administrador** → accede a `AdminDashboard` con gestión completa
- **Usuario** → accede a `UsersDashboard` con sus tareas y chat

El token JWT de Supabase se inyecta automáticamente en cada llamada al backend a través de `apiClient.js`.

---

## 💬 Chat en tiempo real

El chat usa **Supabase Realtime** directamente desde el frontend sin pasar por el backend Flask. Para que funcione, la tabla `mensajes` debe tener Realtime habilitado en el dashboard de Supabase.

---

## 📦 Dependencias principales

```
react
react-dom
vite
@supabase/supabase-js
```

---

## 🌐 Despliegue en Vercel

1. Conecta tu repositorio en [vercel.com](https://vercel.com)
2. Directorio raíz: `Frontend`
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Agrega las variables de entorno en el dashboard de Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_ID`