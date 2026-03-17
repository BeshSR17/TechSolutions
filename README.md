# TechSolutions S.A. — Sistema de Gestión Empresarial

Sistema web full-stack para la gestión interna de clientes, proyectos, tareas y usuarios de TechSolutions S.A. Desarrollado con React, Python/Flask y Supabase.

---

## 📁 Estructura del repositorio

```
/
├── Frontend/          # Aplicación React + Vite
├── Backend/           # API REST Python + Flask
└── README.md          # Este archivo
```

---

## 🧩 Stack tecnológico

| Capa        | Tecnología                          |
|-------------|-------------------------------------|
| Frontend    | React 18, Vite, Supabase JS         |
| Backend     | Python 3, Flask, Flask-CORS         |
| Base de datos | Supabase (PostgreSQL)             |
| Autenticación | Supabase Auth + JWT               |
| Storage     | Supabase Storage (avatares)         |
| Realtime    | Supabase Realtime (chat)            |
| Despliegue  | Vercel (frontend) · Render (backend)|

---

## ⚡ Funcionalidades principales

- **Autenticación** — Login, registro y recuperación de contraseña con JWT
- **Roles** — Administrador y Usuario con vistas y permisos diferenciados
- **Clientes** — CRUD completo con proyectos vinculados
- **Proyectos** — Gestión con fechas, estados y avance calculado desde tareas
- **Tareas** — Asignación a proyectos y usuarios, prioridad, avance, historial de cambios, notas y links adjuntos
- **Chat en tiempo real** — Mensajería directa entre admin y colaboradores vía Supabase Realtime
- **Perfiles** — Avatar, biografía y cambio de contraseña

---

## 🚀 Instalación y ejecución local

### Requisitos previos
- Node.js 18+
- Python 3.10+
- Cuenta en [Supabase](https://supabase.com) con proyecto creado

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo
```

### 2. Configurar el Backend

```bash
cd Backend
pip install -r requirements.txt
```

Crear `.env` en la carpeta `Backend/`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=tu_service_role_key
```

Iniciar el servidor:

```bash
python app.py
```

El backend corre en `http://localhost:5000`

### 3. Configurar el Frontend

```bash
cd Frontend
npm install
```

Crear `.env` en la carpeta `Frontend/`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_ADMIN_ID=uuid-del-usuario-administrador
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

El frontend corre en `http://localhost:5173`

---

## 🗄️ Configuración de Supabase

### Tablas requeridas

```sql
-- Perfiles de usuarios
CREATE TABLE perfiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  nombre text,
  email text,
  rol text DEFAULT 'Usuario',
  estado text DEFAULT 'Activo',
  id_visual int8,
  biografia text,
  avatar_url text,
  creado_en timestamptz DEFAULT now()
);

-- Clientes
CREATE TABLE clientes (
  id int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_contacto text NOT NULL,
  empresa text NOT NULL,
  email text,
  telefono text,
  estado text DEFAULT 'Activo',
  creado_en timestamptz DEFAULT now()
);

-- Proyectos
CREATE TABLE proyectos (
  id int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id int4 REFERENCES clientes(id),
  nombre_proyecto text NOT NULL,
  descripcion text,
  fecha_inicio date,
  fecha_fin date,
  estado text DEFAULT 'Planificación',
  creado_en timestamptz DEFAULT now()
);

-- Tareas
CREATE TABLE tareas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id int4 REFERENCES proyectos(id),
  empleado_id uuid REFERENCES perfiles(id),
  codigo_serie text,
  titulo text NOT NULL,
  instrucciones text,
  prioridad text DEFAULT 'Media',
  avance int4 DEFAULT 0,
  estado text DEFAULT 'Pendiente',
  fecha_inicio timestamptz,
  fecha_finalizacion timestamptz,
  fecha_creacion timestamptz DEFAULT now()
);

-- Mensajes (chat)
CREATE TABLE mensajes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  remitente_id uuid REFERENCES perfiles(id),
  destinatario_id uuid REFERENCES perfiles(id),
  contenido text NOT NULL,
  leido boolean DEFAULT false,
  creado_en timestamptz DEFAULT now()
);
```

### Habilitar Realtime

En el dashboard de Supabase → **Table Editor** → tabla `mensajes` → activar **Realtime**.

### Bucket de Storage

Crear un bucket público llamado `avatars` en Supabase Storage.

---

## 🌐 Despliegue

| Servicio  | Plataforma | Variables de entorno necesarias              |
|-----------|------------|----------------------------------------------|
| Frontend  | Vercel     | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_ID` |
| Backend   | Render     | `SUPABASE_URL`, `SUPABASE_KEY`               |

> En Vercel, asegúrate de configurar el comando de build como `npm run build` y el directorio de salida como `dist`.

---

## 👥 Roles del sistema

| Rol           | Acceso                                                               |
|---------------|----------------------------------------------------------------------|
| Administrador | Gestión completa de clientes, proyectos, tareas, usuarios y chat     |
| Usuario       | Vista de sus tareas asignadas, chat con admin y configuración de perfil |

---

## 📄 Licencia

Proyecto académico — TechSolutions S.A.