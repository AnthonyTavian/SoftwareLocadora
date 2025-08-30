import json
from pathlib import Path

Path("dados").mkdir(exist_ok=True)

dados_brutos = {
    "Chevrolet": ["Onix", "Prisma", "S10", "Tracker", "Spin"],
    "Fiat": ["Argo", "Cronos", "Toro", "Uno", "Mobi"],
    "Volkswagen": ["Gol", "Polo", "T-Cross", "Virtus", "Saveiro"],
    "Hyundai": ["HB20", "Creta", "Tucson"],
    "Toyota": ["Corolla", "Etios", "Hilux", "Yaris"],
    "Honda": ["Civic", "City", "Fit", "HR-V"],
    "Renault": ["Kwid", "Duster", "Captur", "Sandero", "Logan"],
    "Nissan": ["Kicks", "Versa", "Frontier", "March"],
    "Jeep": ["Renegade", "Compass", "Commander"],
    "Peugeot": ["208", "2008", "3008"],
    "Citroën": ["C3", "C4 Cactus"],
    "Mitsubishi": ["L200 Triton", "ASX", "Outlander"],
    "Ford": ["Ka", "EcoSport", "Ranger", "Fusion"]
}

intervalos_padrao = {
    "Óleo do motor": {"intervalo_km": 10000, "intervalo_dias": 365},
    "Filtro de ar": {"intervalo_km": 15000, "intervalo_dias": 365},
    "Filtro de combustível": {"intervalo_km": 20000, "intervalo_dias": 730}
}

base_manutencao = {}
for marca, modelos in dados_brutos.items():
    base_manutencao[marca] = {}
    for modelo in modelos:
        base_manutencao[marca][modelo] = {
            "2020": intervalos_padrao,
            "2021": intervalos_padrao,
            "2022": intervalos_padrao,
            "2023": intervalos_padrao,
            "2024": intervalos_padrao
        }

with open("dados/manutencao_ref.json", "w", encoding="utf-8") as f:
    json.dump(base_manutencao, f, ensure_ascii=False, indent=2)

print("Arquivo manutencao_ref.json gerado com sucesso!")