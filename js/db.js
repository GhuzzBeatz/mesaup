const fs   = require('fs')
const path = require('path')

function getDataDir() {
  try {
    const arg = process.argv.find(a => a.startsWith('--data-dir='))
    if (arg) return arg.replace('--data-dir=', '')
  } catch(e) {}
  return path.join(__dirname, '..', 'data')
}

const DATA_DIR = getDataDir()
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function lerJSON(nome, padrao = []) {
  const f = path.join(DATA_DIR, nome + '.json')
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch(e) { return padrao }
}
function salvarJSON(nome, dados) {
  fs.writeFileSync(path.join(DATA_DIR, nome + '.json'), JSON.stringify(dados, null, 2))
}
function nextId(lista) {
  return lista.length ? Math.max(...lista.map(x => x.id || 0)) + 1 : 1
}
function agora() { return new Date().toLocaleString('sv-SE') }

// â”€â”€ CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getConfig(chave, padrao = '') {
  const cfg = lerJSON('config', {})
  return cfg[chave] !== undefined ? cfg[chave] : padrao
}
function setConfig(chave, valor) {
  const cfg = lerJSON('config', {})
  cfg[chave] = String(valor)
  salvarJSON('config', cfg)
}

// â”€â”€ MESAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function listarMesas() { return lerJSON('mesas') }
function getMesa(id)   { return lerJSON('mesas').find(m => m.id === id) || null }
function inserirMesa(d) {
  const lista = lerJSON('mesas')
  lista.push({ id: nextId(lista), numero: d.numero, capacidade: d.capacidade||4, status:'livre', criado_em: agora() })
  salvarJSON('mesas', lista)
}
function atualizarMesa(d) {
  const lista = lerJSON('mesas')
  const i = lista.findIndex(m => m.id === d.id)
  if (i >= 0) lista[i] = { ...lista[i], ...d }
  salvarJSON('mesas', lista)
}
function deletarMesa(id) { salvarJSON('mesas', lerJSON('mesas').filter(m => m.id !== id)) }

// â”€â”€ CARDÃPIO (alias do Estoque â€” mesmo dado) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CardÃ¡pio = produtos do Estoque com preco > 0
// 'disponivel' controla se aparece no QR Code
function listarCardapio(busca = '') {
  let lista = lerJSON('estoque').filter(e => Number(e.interno||0) === 0)
  if (busca) {
    const b = busca.toLowerCase()
    lista = lista.filter(p => (p.nome||'').toLowerCase().includes(b) || (p.categoria||'').toLowerCase().includes(b))
  }
  return lista.sort((a,b) => (a.categoria||'').localeCompare(b.categoria||'') || a.nome.localeCompare(b.nome))
}
function getCardapioItem(id) { return lerJSON('estoque').find(p => p.id === id) || null }
function inserirCardapio(d) { inserirEstoque(d) }
function atualizarCardapio(d) { atualizarEstoque(d) }
function deletarCardapio(id) { deletarEstoque(id) }
function toggleDisponivel(id, valor) {
  const l = lerJSON('estoque')
  const i = l.findIndex(e => e.id === id)
  if (i >= 0) l[i].disponivel = Number(valor)
  salvarJSON('estoque', l)
}
function toggleInterno(id, valor) {
  const l = lerJSON('estoque')
  const i = l.findIndex(e => e.id === id)
  if (i >= 0) { l[i].interno = Number(valor); if(Number(valor)===1) l[i].disponivel=0 }
  salvarJSON('estoque', l)
}

// â”€â”€ COMANDAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function listarComandas(filtros = {}) {
  let lista = lerJSON('comandas')
  if (filtros.status) lista = lista.filter(c => c.status === filtros.status)
  if (filtros.mesa_id) lista = lista.filter(c => c.mesa_id === filtros.mesa_id)
  return lista.sort((a,b) => b.id - a.id)
}
function getComanda(id) { return lerJSON('comandas').find(c => c.id === id) || null }
function inserirComanda(d) {
  const lista = lerJSON('comandas')
  const nova = {
    id: nextId(lista),
    mesa_id: d.mesa_id,
    mesa_num: d.mesa_num,
    consumidor: String(d.consumidor || '').trim(),
    garcom: d.garcom || '',
    status: 'aberta',
    itens: [],
    total: 0,
    abertura: agora(),
    fechamento: null
  }
  lista.push(nova)
  salvarJSON('comandas', lista)
  // atualiza status da mesa
  atualizarMesa({ id: d.mesa_id, status: 'ocupada' })
  return nova
}
function adicionarItemComanda(comanda_id, item) {
  const lista = lerJSON('comandas')
  const i = lista.findIndex(c => c.id === comanda_id)
  if (i < 0) return
  if (!lista[i].itens) lista[i].itens = []
  const itemId = lista[i].itens.length ? Math.max(...lista[i].itens.map(x=>x.item_id||0))+1 : 1
  lista[i].itens.push({
    item_id: itemId,
    produto_id: item.produto_id,
    nome: item.nome,
    preco: Number(item.preco),
    qtd: Number(item.qtd||1),
    obs: item.obs||'',
    setor_preparo: item.setor_preparo || ''
  })
  lista[i].total = lista[i].itens.reduce((s,it) => s + it.preco * it.qtd, 0)
  salvarJSON('comandas', lista)
}
function removerItemComanda(comanda_id, item_id) {
  const lista = lerJSON('comandas')
  const i = lista.findIndex(c => c.id === comanda_id)
  if (i < 0) return
  lista[i].itens = (lista[i].itens||[]).filter(it => it.item_id !== item_id)
  lista[i].total = lista[i].itens.reduce((s,it) => s + it.preco * it.qtd, 0)
  salvarJSON('comandas', lista)
}
function fecharComanda(comanda_id, forma_pgto) {
  const lista = lerJSON('comandas')
  const i = lista.findIndex(c => c.id === comanda_id)
  if (i < 0) return null
  lista[i].status     = 'fechada'
  lista[i].forma_pgto = forma_pgto || 'Dinheiro'
  lista[i].fechamento = agora()
  const comanda = lista[i]
  salvarJSON('comandas', lista)
  // libera mesa
  atualizarMesa({ id: comanda.mesa_id, status: 'livre' })
  // lanÃ§a no financeiro
  inserirFinanceiro({
    data: dataHoje(),
    tipo: 'Receita',
    descricao: `Mesa ${comanda.mesa_num}${comanda.consumidor ? ' - ' + comanda.consumidor : ''} - ${comanda.itens.length} item(s)`,
    valor: comanda.total,
    forma_pgto: forma_pgto || 'Dinheiro',
    comanda_id: comanda_id
  })
  baixarEstoqueItens(comanda.itens || [])
  upsertCliente({
    nome: comanda.consumidor || '',
    origem: 'Mesa',
    valor: comanda.total
  })
  return comanda
}
function cancelarComanda(comanda_id) {
  const lista = lerJSON('comandas')
  const i = lista.findIndex(c => c.id === comanda_id)
  if (i < 0) return
  lista[i].status = 'cancelada'
  lista[i].fechamento = agora()
  atualizarMesa({ id: lista[i].mesa_id, status: 'livre' })
  salvarJSON('comandas', lista)
}

// â”€â”€ FINANCEIRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function listarFinanceiro(filtros = {}) {
  let lista = lerJSON('financeiro')
  if (filtros.mes)  lista = lista.filter(l => (l.data||'').startsWith(filtros.mes))
  if (filtros.tipo) lista = lista.filter(l => l.tipo === filtros.tipo)
  return lista.sort((a,b) => b.data.localeCompare(a.data) || b.id - a.id)
}
function inserirFinanceiro(d) {
  const lista = lerJSON('financeiro')
  lista.push({ id: nextId(lista), ...d, criado_em: agora() })
  salvarJSON('financeiro', lista)
}
function atualizarFinanceiro(d) {
  const lista = lerJSON('financeiro')
  const i = lista.findIndex(f => f.id === d.id)
  if (i >= 0) lista[i] = { ...lista[i], ...d }
  salvarJSON('financeiro', lista)
}
function deletarFinanceiro(id) { salvarJSON('financeiro', lerJSON('financeiro').filter(f => f.id !== id)) }

// â”€â”€ ESTOQUE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function listarEstoque(busca = '') {
  let lista = lerJSON('estoque')
  if (busca) {
    const b = busca.toLowerCase()
    lista = lista.filter(e => (e.nome||'').toLowerCase().includes(b) || (e.categoria||'').toLowerCase().includes(b))
  }
  return lista.sort((a,b) => a.nome.localeCompare(b.nome))
}
function getEstoqueItem(id) { return lerJSON('estoque').find(e => e.id === id) || null }
function normalizarSetorPreparo(v) {
  return ['cozinha', 'balcao'].includes(String(v || '')) ? String(v) : ''
}
function inserirEstoque(d)  { const l=lerJSON('estoque'); l.push({ id:nextId(l), nome:d.nome, categoria:d.categoria||'', unidade:d.unidade||'un', quantidade:Number(d.quantidade||0), qtd_minima:Number(d.qtd_minima||0), preco:Number(d.preco||0), interno:Number(d.interno||0), disponivel:Number(d.disponivel!==undefined?d.disponivel:1), setor_preparo:normalizarSetorPreparo(d.setor_preparo), validade:d.validade||null, fornecedor:d.fornecedor||'', obs:d.obs||'', criado_em:agora() }); salvarJSON('estoque',l) }
function atualizarEstoque(d){ const l=lerJSON('estoque'); const i=l.findIndex(e=>e.id===d.id); if(i>=0)l[i]={...l[i],...d, preco:Number(d.preco||0), interno:Number(d.interno||0), disponivel:Number(d.disponivel!==undefined?d.disponivel:l[i].disponivel), setor_preparo:d.setor_preparo!==undefined?normalizarSetorPreparo(d.setor_preparo):normalizarSetorPreparo(l[i].setor_preparo)}; salvarJSON('estoque',l) }
function deletarEstoque(id) { salvarJSON('estoque', lerJSON('estoque').filter(e=>e.id!==id)) }

function baixarEstoqueItens(itens = []) {
  const estoque = lerJSON('estoque')
  let alterou = false
  ;(itens || []).forEach(item => {
    const produtoId = Number(item.produto_id || 0)
    const qtd = Number(item.qtd || 0)
    if (!produtoId || qtd <= 0) return
    const i = estoque.findIndex(e => Number(e.id) === produtoId)
    if (i < 0) return
    estoque[i].quantidade = Math.max(0, Number(estoque[i].quantidade || 0) - qtd)
    alterou = true
  })
  if (alterou) salvarJSON('estoque', estoque)
}

// CLIENTES / CRM
function listarClientes(busca = '') {
  let lista = lerJSON('clientes')
  if (busca) {
    const b = busca.toLowerCase()
    lista = lista.filter(c =>
      (c.nome || '').toLowerCase().includes(b) ||
      (c.telefone || '').toLowerCase().includes(b)
    )
  }
  return lista.sort((a, b) => String(b.ultima_compra || b.criado_em || '').localeCompare(String(a.ultima_compra || a.criado_em || '')))
}
function getCliente(id) { return lerJSON('clientes').find(c => c.id === id) || null }
function upsertCliente(d = {}) {
  const nome = String(d.nome || '').trim()
  const telefone = String(d.telefone || '').trim()
  if (!nome && !telefone) return null

  const lista = lerJSON('clientes')
  const nomeKey = nome.toLowerCase()
  const i = lista.findIndex(c =>
    (telefone && String(c.telefone || '') === telefone) ||
    (nome && String(c.nome || '').toLowerCase() === nomeKey)
  )
  const valor = Number(d.valor || 0)
  if (i >= 0) {
    lista[i] = {
      ...lista[i],
      nome: nome || lista[i].nome,
      telefone: telefone || lista[i].telefone || '',
      endereco: d.endereco || lista[i].endereco || '',
      aniversario: d.aniversario || lista[i].aniversario || '',
      origem: d.origem || lista[i].origem || 'MesaUp',
      total_compras: Number(lista[i].total_compras || 0) + (valor > 0 ? 1 : 0),
      total_gasto: Number(lista[i].total_gasto || 0) + valor,
      ultima_compra: valor > 0 ? agora() : lista[i].ultima_compra
    }
    salvarJSON('clientes', lista)
    return lista[i]
  }

  const novo = {
    id: nextId(lista),
    nome: nome || 'Cliente sem nome',
    telefone,
    endereco: d.endereco || '',
    aniversario: d.aniversario || '',
    origem: d.origem || 'MesaUp',
    total_compras: valor > 0 ? 1 : 0,
    total_gasto: valor,
    ultima_compra: valor > 0 ? agora() : null,
    criado_em: agora()
  }
  lista.push(novo)
  salvarJSON('clientes', lista)
  return novo
}
function inserirCliente(d) { return upsertCliente(d) }
function atualizarCliente(d) {
  const lista = lerJSON('clientes')
  const i = lista.findIndex(c => c.id === d.id)
  if (i >= 0) lista[i] = { ...lista[i], ...d }
  salvarJSON('clientes', lista)
}
function deletarCliente(id) { salvarJSON('clientes', lerJSON('clientes').filter(c => c.id !== id)) }

// PDV / DELIVERY
function listarVendas(filtros = {}) {
  let lista = lerJSON('vendas')
  if (filtros.tipo) lista = lista.filter(v => v.tipo === filtros.tipo)
  if (filtros.status) lista = lista.filter(v => v.status === filtros.status)
  if (filtros.data) lista = lista.filter(v => String(v.data || v.criado_em || '').startsWith(filtros.data))
  return lista.sort((a, b) => b.id - a.id)
}
function getVenda(id) { return lerJSON('vendas').find(v => v.id === id) || null }
function registrarVenda(d = {}) {
  const lista = lerJSON('vendas')
  const itens = (d.itens || []).map((it, idx) => ({
    item_id: idx + 1,
    produto_id: Number(it.produto_id || 0),
    nome: it.nome,
    preco: Number(it.preco || 0),
    qtd: Number(it.qtd || 1),
    obs: it.obs || ''
  }))
  const subtotal = itens.reduce((s, it) => s + it.preco * it.qtd, 0)
  const taxaEntrega = Number(d.taxa_entrega || 0)
  const desconto = Number(d.desconto || 0)
  const tipo = d.tipo || 'Balcao'
  const total = Math.max(0, subtotal + taxaEntrega - desconto)
  const nova = {
    id: nextId(lista),
    tipo,
    status: d.status || (tipo === 'Delivery' ? 'preparando' : 'finalizada'),
    cliente_nome: String(d.cliente_nome || '').trim(),
    telefone: String(d.telefone || '').trim(),
    endereco: String(d.endereco || '').trim(),
    forma_pgto: d.forma_pgto || 'Dinheiro',
    itens,
    subtotal,
    taxa_entrega: taxaEntrega,
    desconto,
    total,
    obs: d.obs || '',
    data: dataHoje(),
    criado_em: agora()
  }
  lista.push(nova)
  salvarJSON('vendas', lista)
  baixarEstoqueItens(itens)
  inserirFinanceiro({
    data: dataHoje(),
    tipo: 'Receita',
    descricao: `${tipo} - ${nova.cliente_nome || 'Cliente'} - ${itens.length} item(s)`,
    valor: total,
    forma_pgto: nova.forma_pgto,
    venda_id: nova.id
  })
  upsertCliente({
    nome: nova.cliente_nome,
    telefone: nova.telefone,
    endereco: nova.endereco,
    origem: tipo,
    valor: total
  })
  return nova
}
function atualizarStatusVenda(id, status) {
  const lista = lerJSON('vendas')
  const i = lista.findIndex(v => v.id === id)
  if (i >= 0) {
    lista[i].status = status
    lista[i].atualizado_em = agora()
  }
  salvarJSON('vendas', lista)
}

function soData(valor) {
  return String(valor || '').slice(0, 10)
}
function dentroPeriodo(valor, inicio, fim) {
  const d = soData(valor)
  return d && d >= inicio && d <= fim
}
function normalizarPeriodo(filtros = {}) {
  const hoje = dataHoje()
  const inicio = filtros.inicio || hoje
  const fim = filtros.fim || inicio
  return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio }
}

// â”€â”€ DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getDashStats(filtros = {}) {
  const hoje = dataHoje()
  const mes  = hoje.slice(0,7)
  const periodo = normalizarPeriodo(filtros)
  const comandas   = lerJSON('comandas')
  const financeiro = lerJSON('financeiro')
  const estoque    = lerJSON('estoque')
  const mesas      = lerJSON('mesas')
  const vendas      = lerJSON('vendas')
  const clientes    = lerJSON('clientes')
  const vendasHoje  = vendas.filter(v => String(v.data || v.criado_em || '').startsWith(hoje))
  const receitasHoje = financeiro.filter(f => f.tipo==='Receita'&&(f.data||'').startsWith(hoje))
  const receitasPeriodo = financeiro.filter(f => f.tipo === 'Receita' && dentroPeriodo(f.data || f.criado_em, periodo.inicio, periodo.fim))
  const despesasPeriodo = financeiro.filter(f => f.tipo === 'Despesa' && dentroPeriodo(f.data || f.criado_em, periodo.inicio, periodo.fim))
  const comandasPeriodo = comandas.filter(c => c.status === 'fechada' && dentroPeriodo(c.fechamento, periodo.inicio, periodo.fim))
  const vendasPeriodo = vendas.filter(v => dentroPeriodo(v.data || v.criado_em, periodo.inicio, periodo.fim))
  const pagamentosPeriodo = receitasPeriodo.reduce((acc, f) => {
    const k = f.forma_pgto || 'Outro'
    acc[k] = (acc[k] || 0) + Number(f.valor || 0)
    return acc
  }, {})
  const itensVendidos = []
  comandasPeriodo.forEach(c => itensVendidos.push(...(c.itens || [])))
  vendasPeriodo.forEach(v => itensVendidos.push(...(v.itens || [])))
  const topProdutos = Object.values(itensVendidos.reduce((acc, it) => {
    const nome = it.nome || 'Produto'
    if (!acc[nome]) acc[nome] = { nome, qtd: 0, total: 0 }
    acc[nome].qtd += Number(it.qtd || 0)
    acc[nome].total += Number(it.qtd || 0) * Number(it.preco || 0)
    return acc
  }, {})).sort((a,b) => b.qtd - a.qtd).slice(0, 5)
  const faturamentoPeriodo = receitasPeriodo.reduce((s,f)=>s+Number(f.valor||0),0)
  const despesaPeriodo = despesasPeriodo.reduce((s,f)=>s+Number(f.valor||0),0)
  return {
    periodo,
    totalMesas:      mesas.length,
    mesasOcupadas:   mesas.filter(m=>m.status==='ocupada').length,
    mesasLivres:     mesas.filter(m=>m.status==='livre').length,
    comandasAbertas: comandas.filter(c=>c.status==='aberta').length,
    comandasHoje:    comandas.filter(c=>c.status==='fechada'&&(c.fechamento||'').startsWith(hoje)).length,
    faturamentoHoje: financeiro.filter(f=>f.tipo==='Receita'&&(f.data||'').startsWith(hoje)).reduce((s,f)=>s+Number(f.valor||0),0),
    faturamentoMes:  financeiro.filter(f=>f.tipo==='Receita'&&(f.data||'').startsWith(mes)).reduce((s,f)=>s+Number(f.valor||0),0),
    despesasMes:     financeiro.filter(f=>f.tipo==='Despesa'&&(f.data||'').startsWith(mes)).reduce((s,f)=>s+Number(f.valor||0),0),
    comandasPeriodo: comandasPeriodo.length,
    faturamentoPeriodo,
    despesasPeriodo: despesaPeriodo,
    saldoPeriodo:    faturamentoPeriodo - despesaPeriodo,
    alertasEstoque:  estoque.filter(e=>Number(e.quantidade||0)<=Number(e.qtd_minima||0)).length,
    clientesAtivos:  clientes.length,
    vendasHoje:      vendasHoje.length,
    vendasPeriodo:   vendasPeriodo.length,
    deliveryPendentes: vendas.filter(v=>v.tipo==='Delivery' && !['entregue','cancelada','finalizada'].includes(v.status)).length,
    ticketMedioHoje: receitasHoje.length ? receitasHoje.reduce((s,f)=>s+Number(f.valor||0),0) / receitasHoje.length : 0,
    ticketMedioPeriodo: receitasPeriodo.length ? faturamentoPeriodo / receitasPeriodo.length : 0,
    pagamentosHoje: pagamentosPeriodo,
    pagamentosPeriodo,
    topProdutos,
    ultimasComanadas: comandasPeriodo.slice(-5).reverse()
  }
}

function dataHoje() { return new Date().toISOString().split('T')[0] }

module.exports = {
  getConfig, setConfig,
  listarMesas, getMesa, inserirMesa, atualizarMesa, deletarMesa,
  listarCardapio, getCardapioItem, inserirCardapio, atualizarCardapio, deletarCardapio,
  listarComandas, getComanda, inserirComanda, adicionarItemComanda, removerItemComanda, fecharComanda, cancelarComanda,
  listarFinanceiro, inserirFinanceiro, atualizarFinanceiro, deletarFinanceiro,
  listarEstoque, getEstoqueItem, inserirEstoque, atualizarEstoque, deletarEstoque, toggleDisponivel, toggleInterno,
  listarClientes, getCliente, inserirCliente, atualizarCliente, deletarCliente,
  listarVendas, getVenda, registrarVenda, atualizarStatusVenda,
  getDashStats
}

