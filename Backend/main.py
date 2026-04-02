from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
import os
import logging
from dotenv import load_dotenv
from functools import wraps
from datetime import datetime, timezone

load_dotenv()

# --- LOGGING (errores internos, nunca expuestos al cliente) ---
logging.basicConfig(
    level=logging.ERROR,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# --- CORS: solo orígenes permitidos ---
ALLOWED_ORIGINS = [
    "https://tech-solutions-rust.vercel.app",  # producción web
    "http://localhost:5173",                    # desarrollo local web (Vite)
]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# --- WHITELIST de campos permitidos por tabla ---
CAMPOS_CLIENTE = {"nombre_contacto", "empresa", "email", "telefono", "estado"}
CAMPOS_PROYECTO = {"cliente_id", "nombre_proyecto", "descripcion", "fecha_inicio", "fecha_fin", "estado"}
CAMPOS_TAREA = {"proyecto_id", "empleado_id", "titulo", "instrucciones", "prioridad", "avance", "estado", "fecha_inicio", "fecha_finalizacion", "codigo_serie"}
CAMPOS_PERFIL = {"nombre", "biografia", "avatar_url"}
CAMPOS_EXTRA = {"tipo", "contenido"}

def filtrar_campos(datos: dict, campos_permitidos: set) -> dict:
    """Retorna solo los campos de la whitelist, ignorando el resto."""
    return {k: v for k, v in datos.items() if k in campos_permitidos}

def validar_requeridos(datos: dict, requeridos: list) -> str | None:
    """Retorna mensaje de error si falta algún campo requerido, None si todo ok."""
    for campo in requeridos:
        if not datos.get(campo) or not str(datos[campo]).strip():
            return f"Campo requerido faltante o vacío: {campo}"
    return None

# --- MIDDLEWARE: usuario autenticado ---
def requiere_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No autorizado"}), 401
        try:
            token = auth_header.split(" ")[1]
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"error": "Sesión inválida"}), 401
            request.user_id = user_response.user.id
        except Exception as e:
            logger.error(f"requiere_auth error: {e}")
            return jsonify({"error": "Token inválido"}), 401
        return f(*args, **kwargs)
    return decorated

# --- MIDDLEWARE: administradores ---
def requiere_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No autorizado"}), 401
        try:
            token = auth_header.split(" ")[1]
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({"error": "Sesión inválida"}), 401

            request.user_id = user_response.user.id

            perfil = supabase.table('perfiles') \
                .select('rol') \
                .eq('id', request.user_id) \
                .single() \
                .execute()

            if not perfil.data or perfil.data['rol'] != 'Administrador':
                return jsonify({"error": "Acceso denegado — se requiere rol Administrador"}), 403

        except Exception as e:
            logger.error(f"requiere_admin error: {e}")
            return jsonify({"error": "Token inválido"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def home():
    return {"status": "API TechSolutions operando con Seguridad JWT"}

# --- CLIENTES (admin) ---

@app.route('/api/clientes', methods=['GET'])
@requiere_admin
def get_clientes():
    try:
        response = supabase.table('clientes').select("*, proyectos(*)").execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_clientes: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/clientes', methods=['POST'])
@requiere_admin
def crear_cliente():
    try:
        datos = filtrar_campos(request.json or {}, CAMPOS_CLIENTE)
        error = validar_requeridos(datos, ["nombre_contacto", "empresa"])
        if error:
            return jsonify({"error": error}), 400
        response = supabase.table("clientes").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        logger.error(f"crear_cliente: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/clientes/<id>', methods=['PUT'])
@requiere_admin
def actualizar_cliente(id):
    try:
        datos = filtrar_campos(request.json or {}, CAMPOS_CLIENTE)
        if not datos:
            return jsonify({"error": "No se enviaron campos válidos para actualizar"}), 400
        response = supabase.table('clientes').update(datos).eq('id', id).execute()
        return jsonify({"status": "success", "data": response.data}), 200
    except Exception as e:
        logger.error(f"actualizar_cliente {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/clientes/<id>', methods=['DELETE'])
@requiere_admin
def eliminar_cliente(id):
    try:
        supabase.table('clientes').delete().eq('id', id).execute()
        return jsonify({"status": "success", "message": "Cliente eliminado"}), 200
    except Exception as e:
        logger.error(f"eliminar_cliente {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

# --- PROYECTOS (admin) ---

@app.route('/api/proyectos', methods=['GET'])
@requiere_admin
def get_proyectos():
    try:
        response = supabase.table("proyectos").select("*, clientes(nombre_contacto, empresa)").execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_proyectos: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/proyectos', methods=['POST'])
@requiere_admin
def crear_proyecto():
    try:
        datos = filtrar_campos(request.json or {}, CAMPOS_PROYECTO)
        error = validar_requeridos(datos, ["nombre_proyecto"])
        if error:
            return jsonify({"error": error}), 400
        response = supabase.table("proyectos").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        logger.error(f"crear_proyecto: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/proyectos/<id>', methods=['PUT'])
@requiere_admin
def actualizar_proyecto(id):
    try:
        datos = filtrar_campos(request.json or {}, CAMPOS_PROYECTO)
        if not datos:
            return jsonify({"error": "No se enviaron campos válidos para actualizar"}), 400
        response = supabase.table("proyectos").update(datos).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        logger.error(f"actualizar_proyecto {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/proyectos/<id>', methods=['DELETE'])
@requiere_admin
def eliminar_proyecto(id):
    try:
        supabase.table("proyectos").delete().eq('id', id).execute()
        return jsonify({"message": "Proyecto eliminado"}), 200
    except Exception as e:
        logger.error(f"eliminar_proyecto {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

# --- TAREAS ---

@app.route('/api/tareas/mis-tareas', methods=['GET'])
@requiere_auth
def get_mis_tareas():
    try:
        user_id = request.user_id
        response = supabase.table("tareas") \
            .select("*, perfiles(nombre), proyectos(nombre_proyecto)") \
            .eq("empleado_id", user_id) \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_mis_tareas user={request.user_id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas/extras/<extra_id>', methods=['DELETE'])
@requiere_auth
def eliminar_extra(extra_id):
    try:
        extra = supabase.table('tarea_extras') \
            .select('usuario_id') \
            .eq('id', extra_id) \
            .single() \
            .execute()
        if not extra.data:
            return jsonify({"error": "Extra no encontrado"}), 404
        if extra.data['usuario_id'] != request.user_id:
            return jsonify({"error": "No autorizado"}), 403
        supabase.table('tarea_extras').delete().eq('id', extra_id).execute()
        return jsonify({"message": "Eliminado correctamente"}), 200
    except Exception as e:
        logger.error(f"eliminar_extra {extra_id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas', methods=['GET'])
@requiere_admin
def get_todas_las_tareas():
    try:
        response = supabase.table("tareas") \
            .select("*, perfiles(nombre), proyectos(nombre_proyecto, clientes(empresa, nombre_contacto))") \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_todas_las_tareas: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas', methods=['POST'])
@requiere_admin
def crear_tarea():
    try:
        datos = filtrar_campos(request.json or {}, CAMPOS_TAREA)
        error = validar_requeridos(datos, ["titulo", "proyecto_id"])
        if error:
            return jsonify({"error": error}), 400
        response = supabase.table("tareas").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        logger.error(f"crear_tarea: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas/<id>', methods=['PUT'])
@requiere_auth
def actualizar_tarea(id):
    try:
        # --- Ownership check: solo el dueño o un admin puede editar ---
        tarea = supabase.table('tareas') \
            .select('empleado_id') \
            .eq('id', id) \
            .single() \
            .execute()

        if not tarea.data:
            return jsonify({"error": "Tarea no encontrada"}), 404

        perfil = supabase.table('perfiles') \
            .select('rol') \
            .eq('id', request.user_id) \
            .single() \
            .execute()

        es_admin = perfil.data and perfil.data['rol'] == 'Administrador'
        es_dueno = tarea.data['empleado_id'] == request.user_id

        if not es_admin and not es_dueno:
            return jsonify({"error": "No autorizado para modificar esta tarea"}), 403

        datos = filtrar_campos(request.json or {}, CAMPOS_TAREA)
        if not datos:
            return jsonify({"error": "No se enviaron campos válidos para actualizar"}), 400

        if datos.get('estado') == 'Completada':
            datos['fecha_completada'] = datetime.now(timezone.utc).isoformat()
        elif 'estado' in datos and datos.get('estado') != 'Completada':
            datos['fecha_completada'] = None

        response = supabase.table('tareas').update(datos).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        logger.error(f"actualizar_tarea {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas/<id>', methods=['DELETE'])
@requiere_admin
def eliminar_tarea(id):
    try:
        supabase.table('tareas').delete().eq('id', id).execute()
        return jsonify({"message": "Tarea eliminada"}), 200
    except Exception as e:
        logger.error(f"eliminar_tarea {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas/proyecto/<id>', methods=['GET'])
@requiere_admin
def get_tareas_por_proyecto(id):
    try:
        response = supabase.table("tareas") \
            .select("*, perfiles(nombre), proyectos(nombre_proyecto)") \
            .eq("proyecto_id", id) \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_tareas_por_proyecto {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas/<tarea_id>/extras', methods=['GET'])
@requiere_auth
def get_extras(tarea_id):
    try:
        response = supabase.table('tarea_extras') \
            .select('*, perfiles(nombre, avatar_url)') \
            .eq('tarea_id', tarea_id) \
            .order('creado_en', desc=True) \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_extras tarea={tarea_id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/tareas/<tarea_id>/extras', methods=['POST'])
@requiere_auth
def crear_extra(tarea_id):
    try:
        datos = filtrar_campos(request.json or {}, CAMPOS_EXTRA)
        error = validar_requeridos(datos, ["contenido"])
        if error:
            return jsonify({"error": error}), 400
        datos['tarea_id']   = tarea_id
        datos['usuario_id'] = request.user_id
        response = supabase.table('tarea_extras').insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        logger.error(f"crear_extra tarea={tarea_id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

# --- USUARIOS ---

@app.route('/api/usuarios', methods=['GET'])
@requiere_admin
def get_usuarios():
    try:
        response = supabase.table("perfiles") \
            .select("id, nombre") \
            .eq("rol", "Usuario") \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_usuarios: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

# --- PERFILES ---

@app.route('/api/perfiles', methods=['GET'])
@requiere_admin
def get_todos_los_perfiles():
    try:
        response = supabase.table("perfiles").select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        logger.error(f"get_todos_los_perfiles: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/perfiles', methods=['POST'])
@requiere_admin
def crear_perfil():
    try:
        datos = filtrar_campos(request.json or {}, CAMPOS_PERFIL | {"email", "rol", "estado", "id_visual"})
        error = validar_requeridos(datos, ["nombre"])
        if error:
            return jsonify({"error": error}), 400
        response = supabase.table("perfiles").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        logger.error(f"crear_perfil: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/perfiles/avatar/<id>', methods=['PATCH'])
@requiere_auth
def actualizar_avatar(id):
    try:
        # Solo el propio usuario puede cambiar su avatar
        if id != request.user_id:
            return jsonify({"error": "No autorizado"}), 403
        url_avatar = (request.json or {}).get('avatar_url')
        if not url_avatar or not isinstance(url_avatar, str):
            return jsonify({"error": "avatar_url requerido"}), 400
        response = supabase.table("perfiles").update({"avatar_url": url_avatar}).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        logger.error(f"actualizar_avatar {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/perfiles/<id>', methods=['GET'])
@requiere_auth
def get_perfil_usuario(id):
    try:
        query = supabase.table("perfiles").select("*").eq("id", id).execute()
        if not query.data or len(query.data) == 0:
            return jsonify({"error": "Perfil no encontrado"}), 404
        return jsonify(query.data[0])
    except Exception as e:
        logger.error(f"get_perfil_usuario {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/perfiles/<id>', methods=['PUT'])
@requiere_auth
def actualizar_perfil(id):
    try:
        # Solo el propio usuario puede editar su perfil (o un admin)
        perfil_solicitante = supabase.table('perfiles') \
            .select('rol') \
            .eq('id', request.user_id) \
            .single() \
            .execute()

        es_admin = perfil_solicitante.data and perfil_solicitante.data['rol'] == 'Administrador'
        es_dueno = id == request.user_id

        if not es_admin and not es_dueno:
            return jsonify({"error": "No autorizado para editar este perfil"}), 403

        datos = filtrar_campos(request.json or {}, CAMPOS_PERFIL)
        if not datos:
            return jsonify({"error": "No se enviaron campos válidos para actualizar"}), 400

        response = supabase.table("perfiles").update(datos).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        logger.error(f"actualizar_perfil {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/perfiles/<id>', methods=['DELETE'])
@requiere_admin
def eliminar_perfil(id):
    try:
        supabase.table("perfiles").delete().eq('id', id).execute()
        return jsonify({"message": "Perfil eliminado"}), 200
    except Exception as e:
        logger.error(f"eliminar_perfil {id}: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

# --- PRODUCCIÓN: usar Gunicorn, no este bloque ---
# Comando para Render: gunicorn app:app --workers 2
if __name__ == '__main__':
    app.run(debug=False, port=5000)