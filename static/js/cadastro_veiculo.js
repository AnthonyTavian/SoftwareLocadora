let dadosCarros = {};

function calcularPercentualRestante(v) {
    function calcItem(intervaloKm, ultimaKm, intervaloDias, ultimaDias) {
        const percKm = ((intervaloKm - (v.kmAtual - ultimaKm)) / intervaloKm) * 100;
        const percDias = ((intervaloDias - ultimaDias) / intervaloDias) * 100;
        return Math.min(percKm, percDias);
    }

    const percOleo = calcItem(v.oleoKm, v.oleoUltimaKm, v.oleoDias, v.oleoUltimaDias);
    const percFiltroAr = calcItem(v.filtroArKm, v.filtroArUltimaKm, v.filtroArDias, v.filtroArUltimaDias);
    const percFiltroComb = calcItem(v.filtroCombustivelKm, v.filtroCombustivelUltimaKm, v.filtroCombustivelDias, v.filtroCombustivelUltimaDias);

    return Math.min(percOleo, percFiltroAr, percFiltroComb);
}

function calcularPercentualPorItem(v) {
    function calcItem(intervaloKm, ultimaKm, intervaloDias, ultimaDias) {
        const percKm = ((intervaloKm - (v.kmAtual - ultimaKm)) / intervaloKm) * 100;
        const percDias = ((intervaloDias - ultimaDias) / intervaloDias) * 100;
        return Math.min(percKm, percDias);
    }

    return {
        oleo: calcItem(v.oleoKm, v.oleoUltimaKm, v.oleoDias, v.oleoUltimaDias),
        filtroAr: calcItem(v.filtroArKm, v.filtroArUltimaKm, v.filtroArDias, v.filtroArUltimaDias),
        filtroComb: calcItem(v.filtroCombustivelKm, v.filtroCombustivelUltimaKm, v.filtroCombustivelDias, v.filtroCombustivelUltimaDias)
    };
}

function aplicarBordas(percentuais) {
    function corClasse(p) {
        if (p <= 10) return "borda-vermelha";
        if (p <= 50) return "borda-amarela";
        return "borda-verde";
    }

    document.querySelectorAll("#detalhesVeiculo h6").forEach(h6 => {
        const titulo = h6.textContent.trim().toLowerCase();
        let cor = null;

        if (titulo.includes("óleo")) cor = corClasse(percentuais.oleo);
        if (titulo.includes("filtro de ar")) cor = corClasse(percentuais.filtroAr);
        if (titulo.includes("filtro de combustível")) cor = corClasse(percentuais.filtroComb);

        if (cor) {
            const bloco = h6.parentElement.nextElementSibling;
            if (bloco) {
                bloco.classList.remove("borda-verde", "borda-amarela", "borda-vermelha");
                bloco.classList.add(cor);
            }
        }
    });
}

// Lista e renderiza veículos cadastrados
async function carregarVeiculos() {
    try {
        const resp = await fetch("/veiculos");
        const veiculos = await resp.json();

        const container = document.getElementById("listaVeiculos");
        container.innerHTML = "";

        if (!veiculos.length) {
            container.innerHTML = `<div class="col-12 text-center text-muted">
                Nenhum veículo cadastrado ainda.
            </div>`;
            return;
        }

       veiculos.forEach(v => {
            const percRestante = calcularPercentualRestante(v);

            let corClasse = "card-status-verde";
            if (percRestante <= 10) corClasse = "card-status-vermelho";
            else if (percRestante <= 50) corClasse = "card-status-amarelo";

            const col = document.createElement("div");
            col.classList.add("col"); 

            const card = document.createElement("div");
            card.classList.add("card", "h-100", "shadow-sm", "card-veiculo", corClasse);
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${v.marca} ${v.modelo} - ${v.ano}</h5>
                    <p class="card-text">${v.placa} - ${v.kmAtual} km</p>
                </div>
            `;

            card.addEventListener("click", () => {
                abrirModalDetalhes(v.placa);
            });

            col.appendChild(card);
            container.appendChild(col);
        });
        } catch (error) {
        console.error("Erro ao carregar veículos", error);
    }
}

// Preenche lista de marcas no modal
async function carregarMarcas() {
    const resp = await fetch("/dados-carros");
    dadosCarros = await resp.json();

    const marcaSel = document.getElementById("marca");
    marcaSel.innerHTML = '<option value="">Selecione...</option>';

    Object.keys(dadosCarros).forEach(marca => {
        marcaSel.innerHTML += `<option value="${marca}">${marca}</option>`;
    });

    document.getElementById("modelo").innerHTML = '<option value="">Selecione...</option>';
    document.getElementById("ano").innerHTML = '<option value="">Selecione...</option>';
}

// Função para abrir o modal e buscar os dados do veículo pela placa
async function abrirModalDetalhes(placa) {
    try {
        // Busca o veículo específico
        const resp = await fetch(`/veiculos/${placa}`);
        const veiculo = await resp.json();

        if (veiculo.erro) {
            alert(veiculo.erro);
            return;
        }

        // Monta o HTML inicial do modal
        const container = document.getElementById("detalhesVeiculo");
        container.innerHTML = montarHTMLVeiculo(veiculo);

        // Preenche selects
        preencherSelectsEdicao(veiculo);

        const percentuais = calcularPercentualPorItem(veiculo);
        aplicarBordas(percentuais);

        // Evento salvar
        document.getElementById("btnSalvarEdicao").onclick = async () => {
            const dadosAtualizados = coletarDadosFormulario();

            console.log("Enviando atualização:", dadosAtualizados);

            try {
                const resp = await fetch(`/veiculos/${dadosAtualizados.placa}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dadosAtualizados)
                });

                console.log("Status:", resp.status, "StatusText:", resp.statusText);

                // Busca novamente o veículo atualizado
                const respAtualizado = await fetch(`/veiculos/${dadosAtualizados.placa}`);
                const veiculoAtualizado = await respAtualizado.json();

                console.log("Recebido atualizado:", veiculoAtualizado);

                // Atualiza o HTML do modal com os dados novos
                document.getElementById("detalhesVeiculo").innerHTML = montarHTMLVeiculo(veiculoAtualizado);
                preencherSelectsEdicao(veiculoAtualizado);

                const novosPercentuais = calcularPercentualPorItem(veiculoAtualizado);
                document.querySelector("#detalhesVeiculo h6:nth-of-type(1)").parentElement.nextElementSibling
                    .classList.add(corClasse(novosPercentuais.oleo));
                document.querySelector("#detalhesVeiculo h6:nth-of-type(2)").parentElement.nextElementSibling
                    .classList.add(corClasse(novosPercentuais.filtroAr));
                document.querySelector("#detalhesVeiculo h6:nth-of-type(3)").parentElement.nextElementSibling
                    .classList.add(corClasse(novosPercentuais.filtroComb));

                if (resp.status >= 200 && resp.status < 300) {
                    alert("Veículo atualizado e previsão recalculada!");
                } else {
                    let erroServidor = {};
                    try { erroServidor = await resp.json(); } catch (e) {}
                    alert(`Erro ao atualizar veículo: ${erroServidor.erro || resp.statusText}`);
                }

            } catch (err) {
                console.error("Erro ao salvar alterações:", err);
                alert("Erro ao salvar alterações. Veja o console para mais detalhes.");
            }
        };

        // Abre o modal
        new bootstrap.Modal(document.getElementById("modalVisualizarVeiculo")).show();

    } catch (err) {
        console.error("Erro ao carregar dados do veículo:", err);
        alert("Erro ao buscar informações do veículo.");
    }
}

// Função para montar o HTML do modal (reutiliza seu template)
function montarHTMLVeiculo(v) {
    return `
        <div class="col-md-4">
            <label class="form-label">Marca</label>
            <select id="editMarca" class="form-select" required></select>
        </div>
        <div class="col-md-4">
            <label class="form-label">Modelo</label>
            <select id="editModelo" class="form-select" required></select>
        </div>
        <div class="col-md-4">
            <label class="form-label">Ano</label>
            <select id="editAno" class="form-select" required></select>
        </div>

        <div class="col-md-6">
            <label class="form-label">Placa</label>
            <input type="text" id="editPlaca" class="form-control" value="${v.placa || ''}">
        </div>
        <div class="col-md-6">
            <label class="form-label">KM Atual</label>
            <input type="number" id="editKmAtual" class="form-control" value="${v.kmAtual || ''}">
        </div>

        <!-- Troca Óleo -->
        <div class="col-12 mt-3"><h6>Troca Óleo</h6></div>
        <div class="row g-2 align-items-end">
            <div class="col-md-2">
                <label class="form-label">Intervalo (km)</label>
                <input type="number" id="editOleoKm" class="form-control" value="${v.oleoKm || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Última troca (km)</label>
                <input type="number" id="editOleoUltimaKm" class="form-control" value="${v.oleoUltimaKm || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Intervalo (dias)</label>
                <input type="number" id="editOleoDias" class="form-control" value="${v.oleoDias || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Última troca (dias)</label>
                <input type="number" id="editOleoUltimaDias" class="form-control" value="${v.oleoUltimaDias || ''}">
            </div>
            <div class="col-md-4">
                <label class="form-label">Próxima troca</label>
                <div class="form-control-plaintext text-muted">
                    ${v.proximaTroca?.["Óleo"] || '—'}
                </div>
            </div>
        </div>

        <!-- Filtro de Ar -->
        <div class="col-12 mt-3"><h6>Filtro de Ar</h6></div>
        <div class="row g-2 align-items-end">
            <div class="col-md-2">
                <label class="form-label">Intervalo (km)</label>
                <input type="number" id="editFiltroArKm" class="form-control" value="${v.filtroArKm || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Última troca (km)</label>
                <input type="number" id="editFiltroArUltimaKm" class="form-control" value="${v.filtroArUltimaKm || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Intervalo (dias)</label>
                <input type="number" id="editFiltroArDias" class="form-control" value="${v.filtroArDias || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Última troca (dias)</label>
                <input type="number" id="editFiltroArUltimaDias" class="form-control" value="${v.filtroArUltimaDias || ''}">
            </div>
            <div class="col-md-4">
                <label class="form-label">Próxima troca</label>
                <div class="form-control-plaintext text-muted">
                    ${v.proximaTroca?.["Filtro de Ar"] || '—'}
                </div>
            </div>
        </div>

        <!-- Filtro de Combustível -->
        <div class="col-12 mt-3"><h6>Filtro de Combustível</h6></div>
        <div class="row g-2 align-items-end">
            <div class="col-md-2">
                <label class="form-label">Intervalo (km)</label>
                <input type="number" id="editFiltroCombustivelKm" class="form-control" value="${v.filtroCombustivelKm || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Última troca (km)</label>
                <input type="number" id="editFiltroCombustivelUltimaKm" class="form-control" value="${v.filtroCombustivelUltimaKm || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Intervalo (dias)</label>
                <input type="number" id="editFiltroCombustivelDias" class="form-control" value="${v.filtroCombustivelDias || ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label">Última troca (dias)</label>
                <input type="number" id="editFiltroCombustivelUltimaDias" class="form-control" value="${v.filtroCombustivelUltimaDias || ''}">
            </div>
            <div class="col-md-4">
                <label class="form-label">Próxima troca</label>
                <div class="form-control-plaintext text-muted">
                    ${v.proximaTroca?.["Filtro de Combustível"] || '—'}
                </div>
            </div>
        </div>
    `;
}

// Função para coletar os dados do formulário
function coletarDadosFormulario() {
    return {
        marca: document.getElementById("editMarca").value,
        modelo: document.getElementById("editModelo").value,
        ano: parseInt(document.getElementById("editAno").value),
        placa: document.getElementById("editPlaca").value,
        kmAtual: parseInt(document.getElementById("editKmAtual").value),

        oleoKm: parseInt(document.getElementById("editOleoKm").value),
        oleoUltimaKm: parseInt(document.getElementById("editOleoUltimaKm").value),
        oleoDias: parseInt(document.getElementById("editOleoDias").value),
        oleoUltimaDias: parseInt(document.getElementById("editOleoUltimaDias").value),

        filtroArKm: parseInt(document.getElementById("editFiltroArKm").value),
        filtroArUltimaKm: parseInt(document.getElementById("editFiltroArUltimaKm").value),
        filtroArDias: parseInt(document.getElementById("editFiltroArDias").value),
        filtroArUltimaDias: parseInt(document.getElementById("editFiltroArUltimaDias").value),

        filtroCombustivelKm: parseInt(document.getElementById("editFiltroCombustivelKm").value),
        filtroCombustivelUltimaKm: parseInt(document.getElementById("editFiltroCombustivelUltimaKm").value),
        filtroCombustivelDias: parseInt(document.getElementById("editFiltroCombustivelDias").value),
        filtroCombustivelUltimaDias: parseInt(document.getElementById("editFiltroCombustivelUltimaDias").value)
    };
}

document.addEventListener("DOMContentLoaded", () => {
    // Quando clicar no botão "+", abre o modal de nova marca
    document.getElementById("btnAddMarca").addEventListener("click", () => {
        document.getElementById("novaMarca").value = "";
        new bootstrap.Modal(document.getElementById("modalAddMarca")).show();
    });
});

document.getElementById("salvarNovaMarca").addEventListener("click", async () => {
    const marca = document.getElementById("novaMarca").value.trim();
    if (!marca) {
        alert("Digite uma marca válida.");
        return;
    }

    try {
        const resp = await fetch("/manutencao_ref/marcas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ marca })
        });

        const data = await resp.json();

        if (resp.ok) {
            const selectMarca = document.getElementById("marca");
            const option = document.createElement("option");
            option.value = data.marca;
            option.textContent = data.marca;
            selectMarca.appendChild(option);
            selectMarca.value = data.marca;

            bootstrap.Modal.getInstance(document.getElementById("modalAddMarca")).hide();
            alert("Marca adicionada com sucesso!");
        } else {
            alert(data.erro || "Erro ao adicionar marca.");
        }
    } catch (err) {
        console.error("Erro ao salvar marca:", err);
        alert("Erro ao salvar marca. Veja o console.");
    }
});

document.getElementById("btnAddModelo").addEventListener("click", () => {
    document.getElementById("novoModelo").value = "";
    new bootstrap.Modal(document.getElementById("modalAddModelo")).show();
});

document.getElementById("salvarNovoModelo").addEventListener("click", async () => {
    const marca = document.getElementById("marca").value;
    const modelo = document.getElementById("novoModelo").value.trim();

    if (!marca) {
        alert("Selecione uma marca antes de adicionar um modelo.");
        return;
    }
    if (!modelo) {
        alert("Digite um modelo válido.");
        return;
    }

    const resp = await fetch("/manutencao_ref/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca, modelo })
    });

    const data = await resp.json();

    if (resp.ok) {
        const selectModelo = document.getElementById("modelo");
        const option = document.createElement("option");
        option.value = data.modelo;
        option.textContent = data.modelo;
        selectModelo.appendChild(option);
        selectModelo.value = data.modelo;

        bootstrap.Modal.getInstance(document.getElementById("modalAddModelo")).hide();
        alert("Modelo adicionado com sucesso!");
    } else {
        alert(data.erro || "Erro ao adicionar modelo.");
    }
});

document.getElementById("btnAddAno").addEventListener("click", () => {
    document.getElementById("novoAno").value = "";
    new bootstrap.Modal(document.getElementById("modalAddAno")).show();
});

document.getElementById("salvarNovoAno").addEventListener("click", async () => {
    const marca = document.getElementById("marca").value;
    const modelo = document.getElementById("modelo").value;
    const ano = document.getElementById("novoAno").value.trim();

    if (!marca || !modelo) {
        alert("Selecione marca e modelo antes de adicionar um ano.");
        return;
    }
    if (!ano) {
        alert("Digite um ano válido.");
        return;
    }

    const resp = await fetch("/manutencao_ref/anos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca, modelo, ano })
    });

    const data = await resp.json();

    if (resp.ok) {
        const selectAno = document.getElementById("ano");
        const option = document.createElement("option");
        option.value = data.ano;
        option.textContent = data.ano;
        selectAno.appendChild(option);
        selectAno.value = data.ano;

        bootstrap.Modal.getInstance(document.getElementById("modalAddAno")).hide();
        alert("Ano adicionado com sucesso!");
    } else {
        alert(data.erro || "Erro ao adicionar ano.");
    }
});

async function preencherSelectsEdicao(veiculo) {
    if (Object.keys(dadosCarros).length === 0) {
        const resp = await fetch("/dados-carros");
        dadosCarros = await resp.json();
    }

    const marcaSel = document.getElementById("editMarca");
    const modeloSel = document.getElementById("editModelo");
    const anoSel = document.getElementById("editAno");

    // Limpa selects
    marcaSel.innerHTML = '<option value="">Selecione...</option>';
    modeloSel.innerHTML = '<option value="">Selecione...</option>';
    anoSel.innerHTML = '<option value="">Selecione...</option>';

    const marcaKey = Object.keys(dadosCarros)
        .find(m => m.toLowerCase() === veiculo.marca.toLowerCase());

    // Preenche marcas
    Object.keys(dadosCarros).forEach(marca => {
        marcaSel.innerHTML += `<option value="${marca}" ${marcaKey === marca ? 'selected' : ''}>${marca}</option>`;
    });

    // Se achou a marca, preenche modelos
    let modeloKey = null;
    if (marcaKey) {
        modeloKey = Object.keys(dadosCarros[marcaKey])
            .find(mod => mod.toLowerCase() === veiculo.modelo.toLowerCase());

        Object.keys(dadosCarros[marcaKey]).forEach(modelo => {
            modeloSel.innerHTML += `<option value="${modelo}" ${modeloKey === modelo ? 'selected' : ''}>${modelo}</option>`;
        });
    }

    // Se achou modelo, preenche anos
    if (marcaKey && modeloKey) {
        Object.keys(dadosCarros[marcaKey][modeloKey]).forEach(ano => {
            anoSel.innerHTML += `<option value="${ano}" ${veiculo.ano == ano ? 'selected' : ''}>${ano}</option>`;
        });
    }

    // Eventos encadeados
    marcaSel.addEventListener("change", () => {
        modeloSel.innerHTML = '<option value="">Selecione...</option>';
        anoSel.innerHTML = '<option value="">Selecione...</option>';

        const novaMarcaKey = Object.keys(dadosCarros)
            .find(m => m.toLowerCase() === marcaSel.value.toLowerCase());

        if (novaMarcaKey) {
            Object.keys(dadosCarros[novaMarcaKey]).forEach(modelo => {
                modeloSel.innerHTML += `<option value="${modelo}">${modelo}</option>`;
            });
        }
    });

    modeloSel.addEventListener("change", () => {
        anoSel.innerHTML = '<option value="">Selecione...</option>';

        const novaMarcaKey = Object.keys(dadosCarros)
            .find(m => m.toLowerCase() === marcaSel.value.toLowerCase());
        const novoModeloKey = Object.keys(dadosCarros[novaMarcaKey] || {})
            .find(mod => mod.toLowerCase() === modeloSel.value.toLowerCase());

        if (novaMarcaKey && novoModeloKey) {
            Object.keys(dadosCarros[novaMarcaKey][novoModeloKey]).forEach(ano => {
                anoSel.innerHTML += `<option value="${ano}">${ano}</option>`;
            });
        }
    });
}




// Eventos dos selects
document.getElementById("marca").addEventListener("change", e => {
    const marca = e.target.value;
    const modeloSel = document.getElementById("modelo");
    modeloSel.innerHTML = '<option value="">Selecione...</option>';

    if (marca) {
        Object.keys(dadosCarros[marca]).forEach(modelo => {
            modeloSel.innerHTML += `<option value="${modelo}">${modelo}</option>`;
        });
    }
    document.getElementById("ano").innerHTML = '<option value="">Selecione...</option>';
});

document.getElementById("modelo").addEventListener("change", e => {
    const marca = document.getElementById("marca").value;
    const modelo = e.target.value;
    const anoSel = document.getElementById("ano");
    anoSel.innerHTML = '<option value="">Selecione...</option>';

    if (modelo) {
        Object.keys(dadosCarros[marca][modelo]).forEach(ano => {
            anoSel.innerHTML += `<option value="${ano}">${ano}</option>`;
        });
    }
});

document.getElementById("ano").addEventListener("change", e => {
    const marca = document.getElementById("marca").value;
    const modelo = document.getElementById("modelo").value;
    const ano = e.target.value;

    if (ano) {
        const dadosAno = dadosCarros[marca][modelo][ano];

        // Preenche os intervalos automáticos
        document.getElementById("oleoKm").value = dadosAno["Óleo do motor"].intervalo_km;
        document.getElementById("oleoDias").value = dadosAno["Óleo do motor"].intervalo_dias;
        document.getElementById("filtroArKm").value = dadosAno["Filtro de ar"].intervalo_km;
        document.getElementById("filtroArDias").value = dadosAno["Filtro de ar"].intervalo_dias;
        document.getElementById("filtroCombustivelKm").value = dadosAno["Filtro de combustível"].intervalo_km;
        document.getElementById("filtroCombustivelDias").value = dadosAno["Filtro de combustível"].intervalo_dias;

        // Limpa os campos manuais
        document.getElementById("placa").value = "";
        document.getElementById("oleoUltimaKm").value = "";
        document.getElementById("oleoUltimaDias").value = "";
        document.getElementById("filtroArUltimaKm").value = "";
        document.getElementById("filtroArUltimaDias").value = "";
        document.getElementById("filtroCombustivelUltimaKm").value = "";
        document.getElementById("filtroCombustivelUltimaDias").value = "";
    }
});

// Envia novo veículo
document.getElementById("formCadastroVeiculo").addEventListener("submit", async function (e) {
    e.preventDefault();

    const veiculo = {
        marca: document.getElementById("marca").value,
        modelo: document.getElementById("modelo").value,
        ano: parseInt(document.getElementById("ano").value),
        placa: document.getElementById("placa").value,
        kmAtual: parseInt(document.getElementById("kmAtual").value),

        oleoKm: parseInt(document.getElementById("oleoKm").value),
        oleoUltimaKm: parseInt(document.getElementById("oleoUltimaKm").value),
        oleoDias: parseInt(document.getElementById("oleoDias").value),
        oleoUltimaDias: parseInt(document.getElementById("oleoUltimaDias").value),

        filtroArKm: parseInt(document.getElementById("filtroArKm").value),
        filtroArUltimaKm: parseInt(document.getElementById("filtroArUltimaKm").value),
        filtroArDias: parseInt(document.getElementById("filtroArDias").value),
        filtroArUltimaDias: parseInt(document.getElementById("filtroArUltimaDias").value),

        filtroCombustivelKm: parseInt(document.getElementById("filtroCombustivelKm").value),
        filtroCombustivelUltimaKm: parseInt(document.getElementById("filtroCombustivelUltimaKm").value),
        filtroCombustivelDias: parseInt(document.getElementById("filtroCombustivelDias").value),
        filtroCombustivelUltimaDias: parseInt(document.getElementById("filtroCombustivelUltimaDias").value)
    };

    try {
        const resp = await fetch("/veiculos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(veiculo)
        });

        const data = await resp.json();

        if (resp.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById("modalCadastroVeiculo"));
            modal.hide();

            carregarVeiculos();

            alert("Veículo cadastrado com sucesso!");
        } else {
            alert(data.erro || "Erro ao cadastrar veículo");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão ao cadastrar veículo");
    }
});

// Ao abrir o modal de cadastro, carrega marcas
document.getElementById('modalCadastroVeiculo').addEventListener('show.bs.modal', carregarMarcas);

// Ao carregar a página, lista veículos
document.addEventListener("DOMContentLoaded", carregarVeiculos);