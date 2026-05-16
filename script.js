// ===============================
// VARIÁVEIS GLOBAIS
// ===============================

const irmas = ["Amanda", "Aninha", "Talita", "Thais"];

let usuarioAtual = null;
let moduloAtual = "despesas";
let despesas = [];
let agendamentos = [];

// ELEMENTOS
const loginSection = document.getElementById("loginSection");
const mainSection = document.getElementById("mainSection");
const currentUserTag = document.getElementById("currentUserTag");
const btnLogout = document.getElementById("btnLogout");
const moduleTitle = document.getElementById("moduleTitle");
const tabButtons = document.querySelectorAll(".tab-btn");

const despesasSection = document.getElementById("despesasSection");
const saudeSection = document.getElementById("saudeSection");
const dashboardSection = document.getElementById("dashboardSection");

const formDespesa = document.getElementById("formDespesa");
const despesasLista = document.getElementById("despesasLista");
const despesasResumo = document.getElementById("despesasResumo");

const formSaude = document.getElementById("formSaude");
const saudeLista = document.getElementById("saudeLista");
const saudeResumoLista = document.getElementById("saudeResumoLista");
const saudeLembretes = document.getElementById("saudeLembretes");

const filtroMes = document.getElementById("filtroMes");
const filtroAno = document.getElementById("filtroAno");
const btnAplicarFiltro = document.getElementById("btnAplicarFiltro");

const btnGeneratePdf = document.getElementById("btnGeneratePdf");
const pdfTipo = document.getElementById("pdfTipo");
const pdfEscopo = document.getElementById("pdfEscopo");

// ===============================
// LOGIN
// ===============================

document.querySelectorAll(".sister-btn").forEach(btn => {
  btn.addEventListener("click", () => login(btn.dataset.sister));
});

function login(nome) {
  usuarioAtual = nome;
  currentUserTag.textContent = `Logada: ${nome}`;
  currentUserTag.classList.remove("hidden");
  btnLogout.classList.remove("hidden");

  loginSection.classList.add("hidden");
  mainSection.classList.remove("hidden");

  preencherFiltros();
  atualizarListaDespesas();
  atualizarDashboard();
  atualizarLembretesSaude();
  salvarEstadoLocal();
}

btnLogout.addEventListener("click", () => {
  usuarioAtual = null;
  currentUserTag.classList.add("hidden");
  btnLogout.classList.add("hidden");

  mainSection.classList.add("hidden");
  loginSection.classList.remove("hidden");

  salvarEstadoLocal();
});

// ===============================
// TROCA DE MÓDULO
// ===============================

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => mudarModulo(btn.dataset.module));
});

function mudarModulo(modulo) {
  moduloAtual = modulo;

  tabButtons.forEach(b => b.classList.toggle("active", b.dataset.module === modulo));

  if (modulo === "despesas") {
    moduleTitle.textContent = "Despesas";
    despesasSection.classList.remove("hidden");
    saudeSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    atualizarDashboard();
  } else {
    moduleTitle.textContent = "Saúde";
    saudeSection.classList.remove("hidden");
    despesasSection.classList.add("hidden");
    dashboardSection.classList.add("hidden");
    atualizarLembretesSaude();
  }

  salvarEstadoLocal();
}

// ===============================
// FORMULÁRIO DE DESPESAS
// ===============================

formDespesa.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = document.getElementById("despesaData").value;
  const descricao = document.getElementById("despesaDescricao").value.trim();
  const valor = parseFloat(document.getElementById("despesaValor").value);
  const parcelas = parseInt(document.getElementById("despesaParcelas").value);
  const pagou = document.getElementById("despesaPagou").value;

  const divideEntre = [];
  document.querySelectorAll(".despesa-divide").forEach(chk => {
    if (chk.checked) divideEntre.push(chk.value);
  });

  if (!data || !descricao || !valor || !pagou || divideEntre.length === 0) {
    alert("Preencha todos os campos e selecione quem divide.");
    return;
  }

  despesas.push({
    id: Date.now(),
    data,
    descricao,
    valor,
    parcelas,
    pagou,
    divideEntre,
    criadoPor: usuarioAtual,
    criadoEm: new Date().toISOString()
  });

  salvarEstadoLocal();
  preencherFiltros();
  atualizarListaDespesas();
  atualizarDashboard();
  formDespesa.reset();
  document.getElementById("despesaParcelas").value = 1;
});

// ===============================
// GERAR PARCELAS MENSAIS
// ===============================

function gerarParcelas(despesa) {
  const parcelas = [];
  const [ano, mes, dia] = despesa.data.split("-").map(Number);

  for (let i = 0; i < despesa.parcelas; i++) {
    const dataParcela = new Date(ano, mes - 1 + i, dia);
    const anoP = dataParcela.getFullYear();
    const mesP = String(dataParcela.getMonth() + 1).padStart(2, "0");

    const valorParcela = despesa.valor / despesa.parcelas;
    const valorPorPessoa = valorParcela / despesa.divideEntre.length;

    parcelas.push({
      ...despesa,
      dataParcela: `${anoP}-${mesP}-${String(dia).padStart(2, "0")}`,
      valorParcela,
      valorPorPessoa
    });
  }

  return parcelas;
}

// ===============================
// LISTA DE DESPESAS
// ===============================

function atualizarListaDespesas() {
  despesasLista.innerHTML = "";

  const mes = filtroMes.value;
  const ano = filtroAno.value;

  const despesasFiltradas = despesas
    .flatMap(d => gerarParcelas(d))
    .filter(p => p.dataParcela.startsWith(`${ano}-${mes}`));

  if (despesasFiltradas.length === 0) {
    despesasLista.innerHTML = "<div class='muted'>Nenhuma despesa registrada neste mês.</div>";
    despesasResumo.textContent = "";
    return;
  }

  let total = despesasFiltradas.reduce((s, d) => s + d.valorParcela, 0);
  despesasResumo.textContent = `Total: R$ ${total.toFixed(2)} | Itens: ${despesasFiltradas.length}`;

  despesasFiltradas.forEach(d => {
    const original = despesas.find(x => x.id === d.id);
    const item = document.createElement("div");
    item.className = "list-item";

    item.innerHTML = `
      <div class="list-item-header">
        <span>${formatarData(d.dataParcela)} • ${d.descricao}</span>
        <span>R$ ${d.valorParcela.toFixed(2)}</span>
      </div>

      <div class="chips">
        <span class="chip ${classeIrma(d.pagou)}">Pagou: ${d.pagou}</span>
        ${d.divideEntre.map(n => `
          <span class="chip ${classeIrma(n)}">${n} paga ~ R$ ${d.valorPorPessoa.toFixed(2)}</span>
        `).join("")}
      </div>

      <div class="muted">
        Registrado por ${d.criadoPor} em ${new Date(d.criadoEm).toLocaleString()}
        ${original.alteradoPor ? `<br>Editado por ${original.alteradoPor} em ${new Date(original.alteradoEm).toLocaleString()}` : ""}
      </div>

      <div class="actions">
        <button class="btn secondary" onclick="editarDespesa(${d.id})">Editar</button>
        <button class="btn outline" onclick="excluirDespesa(${d.id})">Excluir</button>
      </div>
    `;

    despesasLista.appendChild(item);
  });
}

// ===============================
// FORMULÁRIO DE SAÚDE
// ===============================

formSaude.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = document.getElementById("saudeData").value;
  const hora = document.getElementById("saudeHora").value;
  const tipo = document.getElementById("saudeTipo").value.trim();
  const local = document.getElementById("saudeLocal").value.trim();
  const acompanhante = document.getElementById("saudeAcompanhante").value;
  const resumo = document.getElementById("saudeResumo").value.trim();

  if (!data || !hora || !tipo || !acompanhante) {
    alert("Preencha data, hora, tipo e acompanhante.");
    return;
  }

  agendamentos.push({
    id: Date.now(),
    data,
    hora,
    tipo,
    local,
    acompanhante,
    resumo,
    criadoPor: usuarioAtual,
    criadoEm: new Date().toISOString()
  });

  salvarEstadoLocal();
  atualizarListaSaude();
  atualizarLembretesSaude();
  formSaude.reset();
});

// ===============================
// LISTA DE SAÚDE
// ===============================

function atualizarListaSaude() {
  saudeLista.innerHTML = "";

  if (agendamentos.length === 0) {
    saudeLista.innerHTML = "<div class='muted'>Nenhum agendamento registrado.</div>";
    saudeResumoLista.textContent = "";
    return;
  }

  saudeResumoLista.textContent = `Total: ${agendamentos.length}`;

  agendamentos
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .forEach(a => {
      const item = document.createElement("div");
      item.className = "list-item";

      item.innerHTML = `
        <div class="list-item-header">
          <span>${formatarData(a.data)} • ${a.hora}</span>
          <span>${a.tipo}</span>
        </div>

        <div class="chips">
          <span class="chip ${classeIrma(a.acompanhante)}">Acompanhante: ${a.acompanhante}</span>
          ${a.local ? `<span class="chip">Local: ${a.local}</span>` : ""}
        </div>

        <div class="muted">${a.resumo || "Sem resumo."}</div>

        <div class="muted">
          Registrado por ${a.criadoPor} em ${new Date(a.criadoEm).toLocaleString()}
          ${a.alteradoPor ? `<br>Editado por ${a.alteradoPor} em ${new Date(a.alteradoEm).toLocaleString()}` : ""}
        </div>

        <div class="actions">
          <button class="btn secondary" onclick="editarSaude(${a.id})">Editar</button>
          <button class="btn outline" onclick="excluirSaude(${a.id})">Excluir</button>
        </div>
      `;

      saudeLista.appendChild(item);
    });
}

// ===============================
// LEMBRETES DE SAÚDE
// ===============================

function atualizarLembretesSaude() {
  saudeLembretes.innerHTML = "";

  const hoje = new Date();

  const lembretes = agendamentos
    .filter(a => new Date(a.data + "T" + a.hora) >= hoje)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .slice(0, 5);

  if (lembretes.length === 0) {
    saudeLembretes.innerHTML = "<div class='muted'>Nenhum compromisso futuro.</div>";
    return;
  }

  lembretes.forEach(a => {
    const item = document.createElement("div");
    item.className = "list-item";

    item.innerHTML = `
      <strong>${formatarData(a.data)} ${a.hora}</strong> — ${a.tipo}<br>
      <span class="muted">Acompanhante: ${a.acompanhante}</span>
    `;

    saudeLembretes.appendChild(item);
  });
}

// ===============================
// FILTROS DE MÊS E ANO
// ===============================

function preencherFiltros() {
  const meses = [
    "01 - Janeiro", "02 - Fevereiro", "03 - Março", "04 - Abril",
    "05 - Maio", "06 - Junho", "07 - Julho", "08 - Agosto",
    "09 - Setembro", "10 - Outubro", "11 - Novembro", "12 - Dezembro"
  ];

  const agora = new Date();
  const mesAtual = String(agora.getMonth() + 1).padStart(2, "0");
  const anoAtual = String(agora.getFullYear());

  filtroMes.innerHTML = meses
    .map((m, i) => `<option value="${String(i+1).padStart(2,"0")}">${m}</option>`)
    .join("");

  let anos = new Set(despesas.map(d => d.data.substring(0,4)));
  if (anos.size === 0) anos.add(anoAtual);

  filtroAno.innerHTML = [...anos]
    .sort()
    .map(a => `<option value="${a}">${a}</option>`)
    .join("");

  if (!filtroMes.value) filtroMes.value = mesAtual;
  if (!filtroAno.value) filtroAno.value = anoAtual;
}

btnAplicarFiltro.addEventListener("click", () => {
  atualizarListaDespesas();
  atualizarDashboard();
});

// ===============================
// DASHBOARD FINANCEIRO
// ===============================

function atualizarDashboard() {
  if (!usuarioAtual) return;

  const mes = filtroMes.value;
  const ano = filtroAno.value;

  const despesasFiltradas = despesas
    .flatMap(d => gerarParcelas(d))
    .filter(p => p.dataParcela.startsWith(`${ano}-${mes}`));

  const totalMes = despesasFiltradas.reduce((s, d) => s + d.valorParcela, 0);
  document.getElementById("dashTotalMes").textContent =
    `R$ ${totalMes.toFixed(2)}`;

  const minhas = despesasFiltradas.filter(d => d.pagou === usuarioAtual);
  const totalMinhas = minhas.reduce((s, d) => s + d.valorParcela, 0);
  document.getElementById("dashMinhasDespesas").textContent =
    `R$ ${totalMinhas.toFixed(2)}`;

  const compensado = compensarSaldosMensais(mes, ano);

  let devo = 0;
  let receber = 0;

  compensado.forEach(r => {
    if (r.de === usuarioAtual) devo += r.valor;
    if (r.para === usuarioAtual) receber += r.valor;
  });

  document.getElementById("dashDevo").textContent =
    `R$ ${devo.toFixed(2)}`;
  document.getElementById("dashReceber").textContent =
    `R$ ${receber.toFixed(2)}`;
}

// ===============================
// CÁLCULO DE SALDOS MENSAIS
// ===============================

function calcularSaldosMensais(mes, ano) {
  const saldos = {};
  irmas.forEach(a => {
    saldos[a] = {};
    irmas.forEach(b => saldos[a][b] = 0);
  });

  const parcelasMes = despesas
    .flatMap(d => gerarParcelas(d))
    .filter(p => p.dataParcela.startsWith(`${ano}-${mes}`));

  parcelasMes.forEach(p => {
    p.divideEntre.forEach(irma => {
      if (irma !== p.pagou) {
        saldos[irma][p.pagou] += p.valorPorPessoa;
      }
    });
  });

  return saldos;
}

// ===============================
// COMPENSAÇÃO MENSAL
// ===============================

function compensarSaldosMensais(mes, ano) {
  const saldos = calcularSaldosMensais(mes, ano);
  const resultado = [];

  irmas.forEach(a => {
    irmas.forEach(b => {
      if (a === b) return;

      const ab = saldos[a][b];
      const ba = saldos[b][a];

      if (ab > ba) {
        resultado.push({
          de: a,
          para: b,
          valor: +(ab - ba).toFixed(2)
        });
      }
    });
  });

  const filtrado = [];
  const vistos = new Set();

  resultado.forEach(r => {
    const chave1 = `${r.de}-${r.para}`;
    const chave2 = `${r.para}-${r.de}`;

    if (!vistos.has(chave1) && !vistos.has(chave2) && r.valor > 0) {
      vistos.add(chave1);
      filtrado.push(r);
    }
  });

  return filtrado;
}

// ===============================
// RESUMO MENSAL DE DESPESAS
// ===============================

function gerarResumoMensalDespesas(mes, ano) {
  const despesasMes = despesas
    .flatMap(d => gerarParcelas(d))
    .filter(p => p.dataParcela.startsWith(`${ano}-${mes}`));

  let texto = `Resumo de Despesas - ${mes}/${ano}\n\n`;

  let total = despesasMes.reduce((s, d) => s + d.valorParcela, 0);
  texto += `Total do mês: R$ ${total.toFixed(2)}\n\n`;

  texto += "DESPESAS DO MÊS:\n";
  despesasMes.forEach(d => {
    texto += `${formatarData(d.dataParcela)} - ${d.descricao} - R$ ${d.valorParcela.toFixed(2)}\n`;
  });

  texto += "\nDÍVIDAS BRUTAS (antes da compensação):\n";

  const saldos = calcularSaldosMensais(mes, ano);
  irmas.forEach(a => {
    irmas.forEach(b => {
      if (a !== b && saldos[a][b] > 0) {
        texto += `${a} deve R$ ${saldos[a][b].toFixed(2)} para ${b}\n`;
      }
    });
  });

  const compensado = compensarSaldosMensais(mes, ano);

  texto += "\nAPÓS COMPENSAÇÃO:\n";

  if (compensado.length === 0) {
    texto += "Não há valores a pagar.\n";
  } else {
    compensado.forEach(r => {
      texto += `${r.de} deve pagar R$ ${r.valor.toFixed(2)} para ${r.para}\n`;
    });
  }

  texto += `\nOBSERVAÇÃO DO USUÁRIO (${usuarioAtual}):\n`;
  texto += `A compensação foi calculada considerando apenas as despesas deste mês, eliminando dívidas cruzadas e mantendo apenas o saldo final entre cada par de irmãs.\n`;

  return texto;
}

// ===============================
// RELATÓRIO COMPLETO — MÊS A MÊS
// ===============================

function gerarResumoTotalDespesas() {
  if (despesas.length === 0) {
    return "Nenhuma despesa registrada.";
  }

  const mesesAnos = new Set();

  despesas
    .flatMap(d => gerarParcelas(d))
    .forEach(p => {
      const [ano, mes] = p.dataParcela.split("-");
      mesesAnos.add(`${mes}/${ano}`);
    });

  const listaOrdenada = [...mesesAnos].sort((a, b) => {
    const [mesA, anoA] = a.split("/");
    const [mesB, anoB] = b.split("/");
    return anoA !== anoB ? anoA - anoB : mesA - mesB;
  });

  let textoFinal = "RELATÓRIO COMPLETO DE DESPESAS\n\n";

  listaOrdenada.forEach(item => {
    const [mes, ano] = item.split("/");

    textoFinal += "==============================\n";
    textoFinal += `MÊS: ${mes}/${ano}\n`;
    textoFinal += "==============================\n\n";

    textoFinal += gerarResumoMensalDespesas(mes, ano);
    textoFinal += "\n\n";
  });

  return textoFinal;
}

// ===============================
// SAÚDE — RESUMOS
// ===============================

function gerarResumoMensalSaude(mes, ano) {
  const agMes = agendamentos.filter(a => a.data.startsWith(`${ano}-${mes}`));

  let texto = `Resumo de Saúde - ${mes}/${ano}\n\n`;

  if (agMes.length === 0) {
    texto += "Nenhum compromisso neste mês.\n";
    return texto;
  }

  agMes
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .forEach(a => {
      texto += `${formatarData(a.data)} ${a.hora} - ${a.tipo} (${a.local || "sem local"}) - Acompanhante: ${a.acompanhante}\nResumo: ${a.resumo || "Sem resumo."}\n\n`;
    });

  return texto;
}

function gerarResumoTotalSaude() {
  let texto = "RELATÓRIO COMPLETO DE SAÚDE\n\n";

  if (agendamentos.length === 0) {
    texto += "Nenhum compromisso registrado.\n";
    return texto;
  }

  agendamentos
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    .forEach(a => {
      texto += `${formatarData(a.data)} ${a.hora} - ${a.tipo} (${a.local || "sem local"}) - Acompanhante: ${a.acompanhante}\nResumo: ${a.resumo || "Sem resumo."}\n\n`;
    });

  return texto;
}

// ===============================
// PDF — COM QUEBRA DE LINHA CORRETA
// ===============================

btnGeneratePdf.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  if (!usuarioAtual) {
    alert("Faça login para gerar o PDF.");
    return;
  }

  const mes = filtroMes.value;
  const ano = filtroAno.value;

  let texto = "";
  let titulo = "";

  if (pdfTipo.value === "despesas") {
    if (pdfEscopo.value === "mes") {
      texto = gerarResumoMensalDespesas(mes, ano);
      titulo = `Despesas - ${mes}/${ano}`;
    } else {
      texto = gerarResumoTotalDespesas();
      titulo = "Despesas - Todo o período";
    }
  } else {
    if (pdfEscopo.value === "mes") {
      texto = gerarResumoMensalSaude(mes, ano);
      titulo = `Saúde - ${mes}/${ano}`;
    } else {
      texto = gerarResumoTotalSaude();
      titulo = "Saúde - Todo o período";
    }
  }

  doc.setFontSize(14);
  doc.text(titulo, 10, 10);

  doc.setFontSize(10);

  const linhas = doc.splitTextToSize(texto, 180);

  let y = 20;
  linhas.forEach(linha => {
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
    doc.text(linha, 10, y);
    y += 6;
  });

  const nomeArquivo = titulo.toLowerCase().replace(/\s+/g, "_") + ".pdf";
  doc.save(nomeArquivo);
});

// ===============================
// EDITAR / EXCLUIR DESPESAS
// ===============================

function excluirDespesa(id) {
  if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

  despesas = despesas.filter(d => d.id !== id);

  salvarEstadoLocal();
  atualizarListaDespesas();
  atualizarDashboard();
}

function editarDespesa(id) {
  const d = despesas.find(x => x.id === id);
  if (!d) return;

  // EDITAR TODOS OS CAMPOS
  const novaData = prompt("Nova data (AAAA-MM-DD):", d.data);
  if (!novaData) return;

  const novaDescricao = prompt("Nova descrição:", d.descricao);
  if (!novaDescricao) return;

  const novoValor = parseFloat(prompt("Novo valor total:", d.valor));
  if (isNaN(novoValor)) return;

  const novasParcelas = parseInt(prompt("Número de parcelas:", d.parcelas));
  if (isNaN(novasParcelas) || novasParcelas < 1) return;

  const novoPagou = prompt("Quem pagou? (Amanda, Aninha, Talita, Thais):", d.pagou);
  if (!novoPagou || !irmas.includes(novoPagou)) return;

  const novoDivide = prompt(
    "Quem divide? (separe por vírgula):",
    d.divideEntre.join(", ")
  );

  const divideEntre = novoDivide
    .split(",")
    .map(s => s.trim())
    .filter(s => irmas.includes(s));

  if (divideEntre.length === 0) {
    alert("Selecione ao menos uma pessoa válida para dividir.");
    return;
  }

  // SALVAR ALTERAÇÕES
  d.data = novaData;
  d.descricao = novaDescricao;
  d.valor = novoValor;
  d.parcelas = novasParcelas;
  d.pagou = novoPagou;
  d.divideEntre = divideEntre;

  // REGISTRO DE ALTERAÇÃO
  d.alteradoPor = usuarioAtual;
  d.alteradoEm = new Date().toISOString();

  salvarEstadoLocal();
  atualizarListaDespesas();
  atualizarDashboard();
}

// ===============================
// EDITAR / EXCLUIR SAÚDE
// ===============================

function excluirSaude(id) {
  if (!confirm("Excluir este agendamento?")) return;

  agendamentos = agendamentos.filter(a => a.id !== id);

  salvarEstadoLocal();
  atualizarListaSaude();
  atualizarLembretesSaude();
}

function editarSaude(id) {
  const a = agendamentos.find(x => x.id === id);
  if (!a) return;

  const novaData = prompt("Nova data (AAAA-MM-DD):", a.data);
  if (!novaData) return;

  const novaHora = prompt("Nova hora (HH:MM):", a.hora);
  if (!novaHora) return;

  const novoTipo = prompt("Novo tipo de consulta/exame:", a.tipo);
  if (!novoTipo) return;

  const novoLocal = prompt("Novo local:", a.local || "");

  const novoAcompanhante = prompt(
    "Novo acompanhante (Amanda, Aninha, Talita, Thais):",
    a.acompanhante
  );
  if (!novoAcompanhante || !irmas.includes(novoAcompanhante)) return;

  const novoResumo = prompt("Novo resumo:", a.resumo || "");

  // SALVAR ALTERAÇÕES
  a.data = novaData;
  a.hora = novaHora;
  a.tipo = novoTipo;
  a.local = novoLocal;
  a.acompanhante = novoAcompanhante;
  a.resumo = novoResumo;

  // REGISTRO DE ALTERAÇÃO
  a.alteradoPor = usuarioAtual;
  a.alteradoEm = new Date().toISOString();

  salvarEstadoLocal();
  atualizarListaSaude();
  atualizarLembretesSaude();
}

// ===============================
// UTILITÁRIOS
// ===============================

function formatarData(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function classeIrma(nome) {
  return nome.toLowerCase();
}

// ===============================
// LOCAL STORAGE
// ===============================

function salvarEstadoLocal() {
  localStorage.setItem("controleIrmas", JSON.stringify({
    usuarioAtual,
    moduloAtual,
    despesas,
    agendamentos
  }));
}

function carregarEstadoLocal() {
  const raw = localStorage.getItem("controleIrmas");
  if (!raw) {
    preencherFiltros();
    return;
  }

  try {
    const estado = JSON.parse(raw);

    usuarioAtual = estado.usuarioAtual;
    moduloAtual = estado.moduloAtual || "despesas";
    despesas = estado.despesas || [];
    agendamentos = estado.agendamentos || [];

    if (usuarioAtual) {
      currentUserTag.textContent = `Logada: ${usuarioAtual}`;
      currentUserTag.classList.remove("hidden");
      btnLogout.classList.remove("hidden");

      loginSection.classList.add("hidden");
      mainSection.classList.remove("hidden");
    }

    preencherFiltros();
    mudarModulo(moduloAtual);
    atualizarListaDespesas();
    atualizarListaSaude();
    atualizarDashboard();
    atualizarLembretesSaude();

  } catch (e) {
    console.error("Erro ao carregar estado:", e);
    preencherFiltros();
  }
}

// ===============================
// INICIALIZAÇÃO FINAL
// ===============================

carregarEstadoLocal();

filtroMes.addEventListener("change", () => {
  atualizarListaDespesas();
  atualizarDashboard();
});

filtroAno.addEventListener("change", () => {
  atualizarListaDespesas();
  atualizarDashboard();
});

if (moduloAtual === "saude") {
  atualizarLembretesSaude();
}

if (!filtroMes.value || !filtroAno.value) {
  preencherFiltros();
}

console.log("Sistema carregado com sucesso.");
// Fim do script
