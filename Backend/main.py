from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

@app.route('/')
def home():
    return {"status": "API TechSolutions operando"}

# --- SECCIÓN DE CLIENTES ---

@app.route('/api/clientes', methods=['GET'])
def get_clientes():
    response = supabase.table('clientes').select("*, proyectos(*)").execute()
    return jsonify(response.data)

@app.route('/api/clientes', methods=['POST'])
def crear_cliente():
    try:
        datos = request.json
        response = supabase.table("clientes").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clientes/<id>', methods=['DELETE'])
def eliminar_cliente(id):
    try:
        response = supabase.table('clientes').delete().eq('id', id).execute()
        return jsonify({"status": "success", "message": "Cliente eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clientes/<id>', methods=['PUT'])
def actualizar_cliente(id):
    try:
        datos_actualizados = request.json
        response = supabase.table('clientes').update(datos_actualizados).eq('id', id).execute()
        return jsonify({"status": "success", "data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- SECCIÓN DE PROYECTOS ---

@app.route('/api/proyectos', methods=['GET'])
def get_proyectos():
    try:
        response = supabase.table("proyectos").select("*, clientes(nombre_contacto, empresa)").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/proyectos', methods=['POST'])
def crear_proyecto():
    try:
        datos = request.json
        response = supabase.table("proyectos").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/proyectos/<id>', methods=['PUT'])
def actualizar_proyecto(id):
    try:
        datos = request.json
        response = supabase.table("proyectos").update(datos).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/proyectos/<id>', methods=['DELETE'])
def eliminar_proyecto(id):
    try:
        response = supabase.table("proyectos").delete().eq('id', id).execute()
        return jsonify({"message": "Proyecto eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- SECCIÓN DE TAREAS ----

@app.route('/api/tareas', methods=['GET'])
def get_todas_las_tareas():
    try:
        # SELECT MAESTRO: Trae Tarea + Empleado + Proyecto + Empresa del Cliente
        response = supabase.table("tareas") \
            .select("*, perfiles(nombre), proyectos(nombre_proyecto, clientes(empresa, nombre_contacto))") \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tareas/proyecto/<id>', methods=['GET'])
def get_tareas_por_proyecto(id):
    try:
        response = supabase.table("tareas") \
            .select("*, perfiles(nombre), proyectos(nombre_proyecto)") \
            .eq("proyecto_id", id) \
            .execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tareas', methods=['POST'])
def crear_tarea():
    try:
        datos = request.json
        response = supabase.table("tareas").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tareas/<id>', methods=['PUT'])
def actualizar_tarea(id):
    try:
        datos = request.json
        response = supabase.table("tareas").update(datos).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tareas/<id>', methods=['DELETE'])
def eliminar_tarea(id):
    try:
        response = supabase.table('tareas').delete().eq('id', id).execute()
        return jsonify({"message": "Tarea eliminada"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- SECCIÓN DE USUARIOS ---

@app.route('/api/usuarios', methods=['GET'])
def get_usuarios():
    try:
        response = supabase.table("perfiles")\
            .select("id, nombre")\
            .eq("rol", "Usuario")\
            .execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# --- SECCIÓN DE GESTIÓN DE USUARIOS (PERFILES) ---

@app.route('/api/perfiles', methods=['GET'])
def get_todos_los_perfiles():
    try:
        # Traemos el perfil y contamos cuántas tareas tiene (opcional)
        response = supabase.table("perfiles").select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/perfiles', methods=['POST'])
def crear_perfil():
    try:
        datos = request.json
        response = supabase.table("perfiles").insert(datos).execute()
        return jsonify(response.data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/perfiles/<id>', methods=['PUT'])
def actualizar_perfil(id):
    try:
        datos = request.json
        response = supabase.table("perfiles").update(datos).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/perfiles/<id>', methods=['DELETE'])
def eliminar_perfil(id):
    try:
        response = supabase.table("perfiles").delete().eq('id', id).execute()
        return jsonify({"message": "Perfil eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/perfiles/avatar/<id>', methods=['PATCH'])
def actualizar_avatar(id):
    try:
        url_avatar = request.json.get('avatar_url')
        response = supabase.table("perfiles").update({"avatar_url": url_avatar}).eq('id', id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)