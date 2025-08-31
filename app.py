from flask import Flask, jsonify, render_template, request
import json
from pathlib import Path
import os, sys
import threading
import webview
from datetime import date, datetime

def resource_path(rel_path):
    """Retorna o caminho absoluto para rodar no Python normal e no executável"""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, rel_path)
    return os.path.join(os.path.abspath("."), rel_path)

app = Flask(__name__)

MANUTENCAO_PATH = Path(resource_path("dados/manutencao_ref.json"))
VEICULOS_PATH = Path(resource_path("dados/veiculos_cadastrados.json"))

if not VEICULOS_PATH.exists():
    VEICULOS_PATH.write_text("[]", encoding="utf-8")

def atualizar_ultimas_trocas_dias(veiculos):
    hoje = date.today()
    alterou = False

    for v in veiculos:
        # Se não tiver data registrada, cria agora
        if "ultimaAtualizacaoDias" not in v:
            v["ultimaAtualizacaoDias"] = hoje.isoformat()
            alterou = True
            continue

        ultima_data = datetime.strptime(v["ultimaAtualizacaoDias"], "%Y-%m-%d").date()
        dias_passados = (hoje - ultima_data).days

        if dias_passados > 0:
            v["oleoUltimaDias"] += dias_passados
            v["filtroArUltimaDias"] += dias_passados
            v["filtroCombustivelUltimaDias"] += dias_passados
            v["ultimaAtualizacaoDias"] = hoje.isoformat()
            alterou = True

    return alterou

@app.route("/")
def index():
    return render_template("index.html")

# --- Rotas que leem sempre do disco ---
@app.route("/marcas", methods=["GET"])
def get_marcas():
    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)
    return jsonify(list(dados.keys()))

@app.route("/modelos/<marca>", methods=["GET"])
def get_modelos(marca):
    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)
    modelos = dados.get(marca)
    return jsonify(list(modelos.keys()) if modelos else [])

@app.route("/anos/<marca>/<modelo>", methods=["GET"])
def get_anos(marca, modelo):
    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)
    try:
        anos = dados[marca][modelo]
        return jsonify(list(anos.keys()))
    except KeyError:
        return jsonify({"erro": "Veículo não encontrado"}), 404

@app.route("/manutencao/<marca>/<modelo>/<ano>", methods=["GET"])
def get_manutencao(marca, modelo, ano):
    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)
    try:
        return jsonify(dados[marca][modelo][ano])
    except KeyError:
        return jsonify({"erro": "Veículo não encontrado"}), 404

@app.route("/dados-carros", methods=["GET"])
def dados_carros():
    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)
    return jsonify(dados)

# --- Veículos ---
@app.route("/veiculos", methods=["GET"])
def listar_veiculos():
    with open(VEICULOS_PATH, "r", encoding="utf-8") as f:
        veiculos = json.load(f)
    if atualizar_ultimas_trocas_dias(veiculos):
        with open(VEICULOS_PATH, "w", encoding="utf-8") as f:
            json.dump(veiculos, f, ensure_ascii=False, indent=2)
    
    return jsonify(veiculos)

@app.route("/veiculos", methods=["POST"])
def adicionar_veiculo():
    novo_veiculo = request.json
    campos_obrigatorios = {"marca", "modelo", "ano", "placa", "cor"}

    if "status" not in novo_veiculo or not novo_veiculo["status"]:
        novo_veiculo["status"] = "disponivel"

    if not novo_veiculo or not campos_obrigatorios.issubset(novo_veiculo):
        return jsonify({"erro": "JSON inválido ou incompleto"}), 400

    if not isinstance(novo_veiculo["ano"], int):
        return jsonify({"erro": "'ano' deve ser um número inteiro"}), 400

    with open(VEICULOS_PATH, "r", encoding="utf-8") as f:
        veiculos = json.load(f)

    novo_veiculo["ultimaAtualizacaoDias"] = date.today().isoformat()

    veiculos.append(novo_veiculo)

    with open(VEICULOS_PATH, "w", encoding="utf-8") as f:
        json.dump(veiculos, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok"}), 201


@app.route("/veiculos_cadastrados")
def veiculos_cadastrados():
    with open(VEICULOS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

def calcular_proxima_troca(km_atual, intervalo_km, ultima_km, intervalo_dias, ultimos_dias):
    km_restante = intervalo_km - (km_atual - ultima_km)
    dias_restante = intervalo_dias - ultimos_dias
    if km_restante <= dias_restante:
        return f"em {km_restante} km"
    else:
        return f"em {dias_restante} dias"

@app.route("/veiculos/<placa>", methods=["GET"])
def get_veiculo_por_placa(placa):
    with open(VEICULOS_PATH, "r", encoding="utf-8") as f:
        veiculos = json.load(f)

    if atualizar_ultimas_trocas_dias(veiculos):
        with open(VEICULOS_PATH, "w", encoding="utf-8") as f:
            json.dump(veiculos, f, ensure_ascii=False, indent=2)
    
    for v in veiculos:
        if v["placa"].upper() == placa.upper():
            # Garante status padrão
            if "status" not in v or not v["status"]:
                v["status"] = "disponivel"

            v["proximaTroca"] = {
                "Óleo": calcular_proxima_troca(
                    v["kmAtual"], v["oleoKm"], v["oleoUltimaKm"],
                    v["oleoDias"], v["oleoUltimaDias"]
                ),
                "Filtro de Ar": calcular_proxima_troca(
                    v["kmAtual"], v["filtroArKm"], v["filtroArUltimaKm"],
                    v["filtroArDias"], v["filtroArUltimaDias"]
                ),
                "Filtro de Combustível": calcular_proxima_troca(
                    v["kmAtual"], v["filtroCombustivelKm"], v["filtroCombustivelUltimaKm"],
                    v["filtroCombustivelDias"], v["filtroCombustivelUltimaDias"]
                )
            }
            return jsonify(v)

    return jsonify({"erro": "Veículo não encontrado"}), 404


@app.route("/veiculos/<placa>", methods=["PUT"])
def atualizar_veiculo(placa):
    dados_atualizados = request.json

    with open(VEICULOS_PATH, "r", encoding="utf-8") as f:
        veiculos = json.load(f)

    for idx, v in enumerate(veiculos):
        if v["placa"].upper() == placa.upper():
            # Atualiza apenas os campos enviados
            for chave, valor in dados_atualizados.items():
                v[chave] = valor

            veiculos[idx] = v

            with open(VEICULOS_PATH, "w", encoding="utf-8") as fw:
                json.dump(veiculos, fw, ensure_ascii=False, indent=2)

            return jsonify({"status": "ok"}), 200

    return jsonify({"erro": "Veículo não encontrado"}), 404


@app.route("/veiculos/<placa>", methods=["DELETE"])
def excluir_veiculo(placa):
    with open(VEICULOS_PATH, "r", encoding="utf-8") as f:
        veiculos = json.load(f)

    novos_veiculos = [v for v in veiculos if v["placa"].upper() != placa.upper()]

    if len(novos_veiculos) == len(veiculos):
        return jsonify({"erro": "Veículo não encontrado"}), 404

    with open(VEICULOS_PATH, "w", encoding="utf-8") as f:
        json.dump(novos_veiculos, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok"}), 200


# --- Adicionar nova marca ---
@app.route("/manutencao_ref/marcas", methods=["POST"])
def adicionar_marca():
    nova_marca = request.json.get("marca", "").strip()

    if not nova_marca:
        return jsonify({"erro": "Marca inválida"}), 400

    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)

    if any(m.lower() == nova_marca.lower() for m in dados.keys()):
        return jsonify({"erro": "Marca já existe"}), 400

    dados[nova_marca] = {}

    with open(MANUTENCAO_PATH, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok", "marca": nova_marca}), 201

@app.route("/manutencao_ref/modelos", methods=["POST"])
def adicionar_modelo():
    marca = request.json.get("marca", "").strip()
    novo_modelo = request.json.get("modelo", "").strip()

    if not marca or not novo_modelo:
        return jsonify({"erro": "Marca e modelo são obrigatórios"}), 400

    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)

    if marca not in dados:
        return jsonify({"erro": "Marca não encontrada"}), 404

    if novo_modelo in dados[marca]:
        return jsonify({"erro": "Modelo já existe"}), 400

    dados[marca][novo_modelo] = {}

    with open(MANUTENCAO_PATH, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok", "modelo": novo_modelo}), 201

@app.route("/manutencao_ref/anos", methods=["POST"])
def adicionar_ano():
    marca = request.json.get("marca", "").strip()
    modelo = request.json.get("modelo", "").strip()
    novo_ano = str(request.json.get("ano", "")).strip()

    if not marca or not modelo or not novo_ano:
        return jsonify({"erro": "Marca, modelo e ano são obrigatórios"}), 400

    with open(MANUTENCAO_PATH, "r", encoding="utf-8") as f:
        dados = json.load(f)

    if marca not in dados or modelo not in dados[marca]:
        return jsonify({"erro": "Marca ou modelo não encontrado"}), 404

    if novo_ano in dados[marca][modelo]:
        return jsonify({"erro": "Ano já existe"}), 400

    # Estrutura padrão para novo ano
    dados[marca][modelo][novo_ano] = {
        "Óleo do motor": {"intervalo_km": 10000, "intervalo_dias": 365},
        "Filtro de ar": {"intervalo_km": 15000, "intervalo_dias": 365},
        "Filtro de combustível": {"intervalo_km": 20000, "intervalo_dias": 730}
    }

    with open(MANUTENCAO_PATH, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    return jsonify({"status": "ok", "ano": novo_ano}), 201

def start_flask():
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)

if __name__ == "__main__":
    flask_thread = threading.Thread(target=start_flask)
    flask_thread.daemon = True
    flask_thread.start()

    webview.create_window("Software Novo", "http://127.0.0.1:5000/", width=1200, height=800)
    webview.start()