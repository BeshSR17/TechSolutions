from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

@app.route('/')
def home():
    return {"status": "API TechSolutions operando 🚀"}

# --- SECCIÓN DE CLIENTES ---

@app.route('/api/clientes', methods=['GET'])
def get_clientes():
    # Obtener todos los clientes ordenados por nombre
    response = supabase.table("clientes").select("*").order("empresa").execute()
    return jsonify(response.data)

@app.route('/api/clientes', methods=['POST'])
def crear_cliente():
    datos = request.json
    # Datos esperados: nombre_contacto, empresa, email, telefono
    response = supabase.table("clientes").insert(datos).execute()
    return jsonify(response.data), 201

# --- SECCIÓN DE PROYECTOS ---

@app.route('/api/proyectos', methods=['GET'])
def get_proyectos():
    # Trae proyectos incluyendo el nombre de la empresa del cliente (Relación)
    response = supabase.table("proyectos").select("*, clientes(empresa)").execute()
    return jsonify(response.data)

@app.route('/api/proyectos', methods=['POST'])
def crear_proyecto():
    datos = request.json
    # Datos esperados: cliente_id, nombre_proyecto, descripcion, fecha_inicio, fecha_fin
    response = supabase.table("proyectos").insert(datos).execute()
    return jsonify(response.data), 201

# --- SECCIÓN DE TAREAS ----

@app.route('/api/tareas/proyecto/<int:p_id>', methods=['GET'])
def get_tareas_por_proyecto(p_id):
    # Obtener tareas de un proyecto específico
    response = supabase.table("tareas").select("*").eq("proyecto_id", p_id).execute()
    return jsonify(response.data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)