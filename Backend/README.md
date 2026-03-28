# Backend — TechSolutions API

API REST desarrollada con Python y Flask. Gestiona clientes, proyectos, tareas y perfiles de usuario. Toda comunicación está protegida con autenticación JWT a través de Supabase Auth.

---

## 📋 Requisitos

- Python 3.10 o superior
- pip

---

## 📦 Instalación

```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuración de entorno

Crea un archivo `.env` en esta carpeta con las siguientes variables:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=tu_service_role_key
```


## ▶️ Iniciar el servidor

```bash
python main.py
```

El servidor corre en `http://localhost:5000` con soporte para múltiples peticiones simultáneas (`threaded=True`).

---

## 🔐 Autenticación

Todos los endpoints bajo `/api/*` requieren un header de autorización con el token JWT del usuario:

```
Authorization: Bearer <token>
```

El token es validado contra Supabase Auth en cada petición. Si el token es inválido o ha expirado, la API responde con `401 Unauthorized`.

---

## 📡 Endpoints disponibles

### Clientes
| Método | Ruta                  | Descripción               |
|--------|-----------------------|---------------------------|
| GET    | `/api/clientes`       | Listar todos los clientes (incluye proyectos) |
| POST   | `/api/clientes`       | Crear nuevo cliente       |
| PUT    | `/api/clientes/<id>`  | Actualizar cliente        |
| DELETE | `/api/clientes/<id>`  | Eliminar cliente          |

### Proyectos
| Método | Ruta                   | Descripción               |
|--------|------------------------|---------------------------|
| GET    | `/api/proyectos`       | Listar proyectos (incluye cliente) |
| POST   | `/api/proyectos`       | Crear nuevo proyecto      |
| PUT    | `/api/proyectos/<id>`  | Actualizar proyecto       |
| DELETE | `/api/proyectos/<id>`  | Eliminar proyecto         |

### Tareas
| Método | Ruta                         | Descripción                        |
|--------|------------------------------|------------------------------------|
| GET    | `/api/tareas`                | Listar todas las tareas            |
| GET    | `/api/tareas/mis-tareas`     | Tareas del usuario autenticado     |
| GET    | `/api/tareas/proyecto/<id>`  | Tareas de un proyecto específico   |
| POST   | `/api/tareas`                | Crear nueva tarea                  |
| PUT    | `/api/tareas/<id>`           | Actualizar tarea                   |
| DELETE | `/api/tareas/<id>`           | Eliminar tarea                     |

### Usuarios y Perfiles
| Método | Ruta                          | Descripción                        |
|--------|-------------------------------|------------------------------------|
| GET    | `/api/usuarios`               | Listar usuarios con rol Usuario    |
| GET    | `/api/perfiles`               | Listar todos los perfiles          |
| GET    | `/api/perfiles/<id>`          | Obtener perfil específico          |
| POST   | `/api/perfiles`               | Crear perfil                       |
| PUT    | `/api/perfiles/<id>`          | Actualizar perfil                  |
| DELETE | `/api/perfiles/<id>`          | Eliminar perfil                    |
| PATCH  | `/api/perfiles/avatar/<id>`   | Actualizar solo el avatar          |

---

## 📁 Estructura del proyecto

```
Backend/
├── main.py              # Aplicación Flask principal
├── requirements.txt    # Dependencias Python
└── .env                # Variables de entorno (no versionar)
```

---

## 📦 Dependencias principales

```
flask
flask-cors
supabase
python-dotenv
gunicorn
```

---
