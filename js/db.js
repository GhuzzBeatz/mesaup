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
function arredondarMoeda(valor) { return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100 }
function compararNatural(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR', { numeric: true, sensitivity: 'base' })
}

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
function listarMesas() { return lerJSON('mesas').sort((a, b) => compararNatural(a.numero, b.numero) || Number(a.id) - Number(b.id)) }
function getMesa(id)   { return lerJSON('mesas').find(m => m.id === id) || null }
function normalizarNumeroMesa(numero) { return String(numero || '').trim() }
function numeroMesaDuplicado(lista, numero, ignorarId = null) {
  const chave = normalizarNumeroMesa(numero).toLowerCase()
  return lista.some(m => m.id !== ignorarId && normalizarNumeroMesa(m.numero).toLowerCase() === chave)
}
function inserirMesa(d) {
  const lista = lerJSON('mesas')
  const numero = normalizarNumeroMesa(d.numero)
  if (!numero) return { ok: false, erro: 'Informe o numero da mesa.' }
  if (numeroMesaDuplicado(lista, numero)) return { ok: false, erro: `A Mesa ${numero} ja esta cadastrada.` }
  const formatos = ['quadrada', 'redonda', 'retangular']
  const nova = {
    id: nextId(lista),
    numero,
    capacidade: d.capacidade || 4,
    formato: formatos.includes(d.formato) ? d.formato : 'quadrada',
    pos_x: d.pos_x !== null && d.pos_x !== undefined && Number.isFinite(Number(d.pos_x)) ? Number(d.pos_x) : null,
    pos_y: d.pos_y !== null && d.pos_y !== undefined && Number.isFinite(Number(d.pos_y)) ? Number(d.pos_y) : null,
    status: 'livre',
    criado_em: agora()
  }
  lista.push(nova)
  salvarJSON('mesas', lista)
  return { ok: true, mesa: nova }
}
function atualizarMesa(d) {
  const lista = lerJSON('mesas')
  const i = lista.findIndex(m => m.id === d.id)
  if (i < 0) return { ok: false, erro: 'Mesa nao encontrada.' }

  const numeroAnterior = normalizarNumeroMesa(lista[i].numero)
  const novoNumero = d.numero !== undefined ? normalizarNumeroMesa(d.numero) : numeroAnterior
  if (!novoNumero) return { ok: false, erro: 'Informe o numero da mesa.' }
  if (d.numero !== undefined && numeroMesaDuplicado(lista, novoNumero, d.id)) {
    return { ok: false, erro: `A Mesa ${novoNumero} ja esta cadastrada.` }
  }

  lista[i] = { ...lista[i], ...d, numero: novoNumero }
  salvarJSON('mesas', lista)

  // Comandas abertas acompanham a mesa atual; as fechadas preservam o historico.
  if (novoNumero !== numeroAnterior) {
    const comandas = lerJSON('comandas')
    let alterouComanda = false
    comandas.forEach(c => {
      if (c.status === 'aberta' && Number(c.mesa_id) === Number(d.id)) {
        c.mesa_num = novoNumero
        alterouComanda = true
      }
    })
    if (alterouComanda) salvarJSON('comandas', comandas)
  }

  return { ok: true, mesa: lista[i] }
}
function deletarMesa(id) { salvarJSON('mesas', lerJSON('mesas').filter(m => m.id !== id)) }

// GARCONS / ATENDENTES
function normalizarCodigoGarcom(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 6)
}
function proximoCodigoGarcom(lista) {
  const maior = lista.reduce((max, g) => Math.max(max, Number(normalizarCodigoGarcom(g.codigo) || 0)), 0)
  return String(maior + 1).padStart(2, '0')
}
function listarGarcons(filtros = {}) {
  let lista = lerJSON('garcons')
  if (filtros.ativo === true) lista = lista.filter(g => g.ativo !== false)
  if (filtros.ativo === false) lista = lista.filter(g => g.ativo === false)
  if (filtros.busca) {
    const busca = String(filtros.busca).trim().toLowerCase()
    lista = lista.filter(g => String(g.nome || '').toLowerCase().includes(busca) || String(g.codigo || '').includes(busca))
  }
  return lista.sort((a, b) => Number(b.ativo !== false) - Number(a.ativo !== false) ||
    String(a.codigo || '').localeCompare(String(b.codigo || ''), 'pt-BR', { numeric: true }) ||
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
}
function getGarcom(id) { return lerJSON('garcons').find(g => Number(g.id) === Number(id)) || null }
function validarGarcom(d, lista, ignorarId = null) {
  const nome = String(d.nome || '').trim().replace(/\s+/g, ' ')
  const codigo = normalizarCodigoGarcom(d.codigo) || proximoCodigoGarcom(lista)
  if (!nome) return { ok: false, erro: 'Informe o nome do garcom.' }
  if (lista.some(g => Number(g.id) !== Number(ignorarId) && normalizarCodigoGarcom(g.codigo) === codigo)) {
    return { ok: false, erro: `O codigo ${codigo} ja esta em uso.` }
  }
  return { ok: true, nome, codigo }
}
function inserirGarcom(d = {}) {
  const lista = lerJSON('garcons')
  const validacao = validarGarcom(d, lista)
  if (!validacao.ok) return validacao
  const novo = {
    id: nextId(lista),
    codigo: validacao.codigo,
    nome: validacao.nome,
    ativo: d.ativo !== false,
    criado_em: agora()
  }
  lista.push(novo)
  salvarJSON('garcons', lista)
  return { ok: true, garcom: novo }
}
function atualizarGarcom(d = {}) {
  const lista = lerJSON('garcons')
  const i = lista.findIndex(g => Number(g.id) === Number(d.id))
  if (i < 0) return { ok: false, erro: 'Garcom nao encontrado.' }
  const validacao = validarGarcom({ ...lista[i], ...d }, lista, d.id)
  if (!validacao.ok) return validacao
  lista[i] = {
    ...lista[i],
    ...d,
    id: lista[i].id,
    codigo: validacao.codigo,
    nome: validacao.nome,
    ativo: d.ativo !== undefined ? Boolean(d.ativo) : lista[i].ativo !== false,
    atualizado_em: agora()
  }
  salvarJSON('garcons', lista)

  const comandas = lerJSON('comandas')
  let alterouComanda = false
  comandas.forEach(c => {
    if (c.status === 'aberta' && Number(c.garcom_id) === Number(d.id)) {
      c.garcom_codigo = lista[i].codigo
      c.garcom = lista[i].nome
      alterouComanda = true
    }
  })
  if (alterouComanda) salvarJSON('comandas', comandas)
  return { ok: true, garcom: lista[i] }
}
function deletarGarcom(id) {
  const emUso = lerJSON('comandas').some(c => c.status === 'aberta' && Number(c.garcom_id) === Number(id))
  if (emUso) return { ok: false, erro: 'Este garcom possui comanda aberta. Inative-o ou feche a comanda antes de excluir.' }
  const lista = lerJSON('garcons')
  if (!lista.some(g => Number(g.id) === Number(id))) return { ok: false, erro: 'Garcom nao encontrado.' }
  salvarJSON('garcons', lista.filter(g => Number(g.id) !== Number(id)))
  return { ok: true }
}

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
  if (filtros.mesa_id) lista = lista.filter(c => Number(c.mesa_id) === Number(filtros.mesa_id))
  return lista.sort((a, b) => compararNatural(a.mesa_num, b.mesa_num) || Number(b.id) - Number(a.id))
}
function getComanda(id) { return lerJSON('comandas').find(c => c.id === id) || null }
function inserirComanda(d) {
  const lista = lerJSON('comandas')
  const garcom = d.garcom_id ? getGarcom(d.garcom_id) : null
  const cliente = d.cliente_id ? getCliente(Number(d.cliente_id)) : null
  const existente = lista.find(c => c.status === 'aberta' && (
    Number(c.mesa_id) === Number(d.mesa_id) ||
    normalizarNumeroMesa(c.mesa_num).toLowerCase() === normalizarNumeroMesa(d.mesa_num).toLowerCase()
  ))
  if (existente) {
    atualizarMesa({ id: existente.mesa_id, status: 'ocupada' })
    return existente
  }
  const nova = {
    id: nextId(lista),
    mesa_id: d.mesa_id,
    mesa_num: d.mesa_num,
    cliente_id: cliente ? cliente.id : null,
    consumidor: cliente ? cliente.nome : String(d.consumidor || '').trim(),
    garcom_id: garcom ? garcom.id : null,
    garcom_codigo: garcom ? garcom.codigo : String(d.garcom_codigo || '').trim(),
    garcom: garcom ? garcom.nome : String(d.garcom || '').trim(),
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
function transferirComanda(comanda_id, nova_mesa_id) {
  const lista = lerJSON('comandas')
  const i = lista.findIndex(c => Number(c.id) === Number(comanda_id))
  if (i < 0 || lista[i].status !== 'aberta') return { ok: false, erro: 'Comanda aberta nao encontrada.' }

  const origemId = Number(lista[i].mesa_id)
  const destino = getMesa(Number(nova_mesa_id))
  if (!destino) return { ok: false, erro: 'Mesa de destino nao encontrada.' }
  if (Number(destino.id) === origemId) return { ok: false, erro: 'Escolha uma mesa diferente.' }

  const destinoOcupado = destino.status !== 'livre' || lista.some(c => c.status === 'aberta' && Number(c.id) !== Number(comanda_id) && (
    Number(c.mesa_id) === Number(destino.id) ||
    normalizarNumeroMesa(c.mesa_num).toLowerCase() === normalizarNumeroMesa(destino.numero).toLowerCase()
  ))
  if (destinoOcupado) return { ok: false, erro: `A Mesa ${destino.numero} ja possui uma comanda aberta.` }

  const origem = getMesa(origemId)
  lista[i].transferencias = Array.isArray(lista[i].transferencias) ? lista[i].transferencias : []
  lista[i].transferencias.push({
    de_mesa_id: origemId,
    de_mesa_num: lista[i].mesa_num,
    para_mesa_id: destino.id,
    para_mesa_num: destino.numero,
    data: agora()
  })
  lista[i].mesa_id = destino.id
  lista[i].mesa_num = destino.numero
  salvarJSON('comandas', lista)
  const origemAindaOcupada = lista.some(c => c.status === 'aberta' && Number(c.mesa_id) === origemId)
  if (origem) atualizarMesa({ id: origem.id, status: origemAindaOcupada ? 'ocupada' : 'livre' })
  atualizarMesa({ id: destino.id, status: 'ocupada' })
  return { ok: true, comanda: lista[i] }
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
  if (i < 0 || lista[i].status !== 'aberta') return null
  const forma = forma_pgto || 'Dinheiro'
  const fiado = String(forma).toLowerCase() === 'fiado'
  if (fiado) {
    const credito = validarDebitoCliente(lista[i].cliente_id, lista[i].total)
    if (!credito.ok) return credito
  }
  lista[i].status     = 'fechada'
  lista[i].forma_pgto = forma
  lista[i].fechamento = agora()
  const comanda = lista[i]
  salvarJSON('comandas', lista)
  // libera mesa
  const mesaAindaOcupada = lista.some(c => c.status === 'aberta' && Number(c.mesa_id) === Number(comanda.mesa_id))
  atualizarMesa({ id: comanda.mesa_id, status: mesaAindaOcupada ? 'ocupada' : 'livre' })
  baixarEstoqueItens(comanda.itens || [])
  const cliente = upsertCliente({
    id: comanda.cliente_id,
    nome: comanda.consumidor || '',
    origem: 'Mesa',
    valor: comanda.total
  })
  if (fiado) {
    registrarDebitoCliente(cliente?.id, comanda.total, {
      descricao: `Comanda #${comanda.id} - Mesa ${comanda.mesa_num}`,
      comanda_id: comanda.id
    })
  } else {
    inserirFinanceiro({
      data: dataHoje(),
      tipo: 'Receita',
      descricao: `Mesa ${comanda.mesa_num}${comanda.consumidor ? ' - ' + comanda.consumidor : ''} - ${comanda.itens.length} item(s)`,
      valor: comanda.total,
      forma_pgto: forma,
      comanda_id: comanda_id
    })
  }
  return comanda
}
function cancelarComanda(comanda_id) {
  const lista = lerJSON('comandas')
  const i = lista.findIndex(c => c.id === comanda_id)
  if (i < 0) return
  lista[i].status = 'cancelada'
  lista[i].fechamento = agora()
  salvarJSON('comandas', lista)
  const mesaAindaOcupada = lista.some(c => c.status === 'aberta' && Number(c.mesa_id) === Number(lista[i].mesa_id))
  atualizarMesa({ id: lista[i].mesa_id, status: mesaAindaOcupada ? 'ocupada' : 'livre' })
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
  const saldos = mapaSaldosClientes()
  return lista.map(c => enriquecerCliente(c, saldos)).sort((a, b) => String(b.ultima_compra || b.criado_em || '').localeCompare(String(a.ultima_compra || a.criado_em || '')))
}
function getCliente(id) {
  const cliente = lerJSON('clientes').find(c => Number(c.id) === Number(id))
  return cliente ? enriquecerCliente(cliente) : null
}
function upsertCliente(d = {}) {
  const nome = String(d.nome || '').trim()
  const telefone = String(d.telefone || '').trim()
  if (!nome && !telefone) return null

  const lista = lerJSON('clientes')
  const nomeKey = nome.toLowerCase()
  const i = lista.findIndex(c => Number(d.id) > 0
    ? Number(c.id) === Number(d.id)
    : ((telefone && String(c.telefone || '') === telefone) || (nome && String(c.nome || '').toLowerCase() === nomeKey)))
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
      limite_credito: d.limite_credito !== undefined ? Math.max(0, Number(d.limite_credito || 0)) : Number(lista[i].limite_credito || 0),
      dia_vencimento: d.dia_vencimento !== undefined ? Math.max(0, Math.min(31, Number(d.dia_vencimento || 0))) : Number(lista[i].dia_vencimento || 0),
      ultima_compra: valor > 0 ? agora() : lista[i].ultima_compra,
      atualizado_em: agora()
    }
    salvarJSON('clientes', lista)
    return enriquecerCliente(lista[i])
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
    limite_credito: Math.max(0, Number(d.limite_credito || 0)),
    dia_vencimento: Math.max(0, Math.min(31, Number(d.dia_vencimento || 0))),
    ultima_compra: valor > 0 ? agora() : null,
    criado_em: agora()
  }
  lista.push(novo)
  salvarJSON('clientes', lista)
  return enriquecerCliente(novo)
}
function inserirCliente(d) { return upsertCliente(d) }
function atualizarCliente(d) {
  const lista = lerJSON('clientes')
  const i = lista.findIndex(c => c.id === d.id)
  if (i >= 0) lista[i] = {
    ...lista[i],
    ...d,
    limite_credito: Math.max(0, Number(d.limite_credito ?? lista[i].limite_credito ?? 0)),
    dia_vencimento: Math.max(0, Math.min(31, Number(d.dia_vencimento ?? lista[i].dia_vencimento ?? 0))),
    atualizado_em: agora()
  }
  salvarJSON('clientes', lista)
  return i >= 0 ? { ok: true, cliente: enriquecerCliente(lista[i]) } : { ok: false, erro: 'Cliente nao encontrado.' }
}
function deletarCliente(id) {
  const cliente = getCliente(id)
  if (!cliente) return { ok: false, erro: 'Cliente nao encontrado.' }
  if (Number(cliente.saldo_devedor || 0) > 0) return { ok: false, erro: 'Quite o saldo de fiado antes de excluir o cliente.' }
  const comandaAberta = lerJSON('comandas').some(c => c.status === 'aberta' && Number(c.cliente_id) === Number(id))
  if (comandaAberta) return { ok: false, erro: 'O cliente possui uma comanda aberta.' }
  salvarJSON('clientes', lerJSON('clientes').filter(c => Number(c.id) !== Number(id)))
  return { ok: true }
}

// CONTAS DE CLIENTES / FIADO
function mapaSaldosClientes() {
  return lerJSON('contas_clientes').reduce((saldos, m) => {
    const id = Number(m.cliente_id)
    saldos[id] = arredondarMoeda(Number(saldos[id] || 0) + (m.tipo === 'debito' ? Number(m.valor || 0) : -Number(m.valor || 0)))
    return saldos
  }, {})
}
function saldoCliente(cliente_id) {
  return Number(mapaSaldosClientes()[Number(cliente_id)] || 0)
}
function enriquecerCliente(cliente, saldos = null) {
  const saldo = saldos ? Number(saldos[Number(cliente.id)] || 0) : saldoCliente(cliente.id)
  return { ...cliente, saldo_devedor: Math.max(0, arredondarMoeda(saldo)) }
}
function listarMovimentosCliente(cliente_id) {
  return lerJSON('contas_clientes').filter(m => Number(m.cliente_id) === Number(cliente_id))
    .sort((a, b) => Number(b.id) - Number(a.id))
}
function validarDebitoCliente(cliente_id, valor) {
  const cliente = getCliente(cliente_id)
  if (!cliente) return { ok: false, erro: 'Selecione um cliente cadastrado para usar Fiado.' }
  const total = arredondarMoeda(valor)
  if (!(total > 0)) return { ok: false, erro: 'O valor do debito deve ser maior que zero.' }
  const limite = Number(cliente.limite_credito || 0)
  const novoSaldo = arredondarMoeda(Number(cliente.saldo_devedor || 0) + total)
  if (limite > 0 && novoSaldo > limite) {
    return { ok: false, erro: `Limite de fiado excedido. Disponivel: R$ ${Math.max(0, limite - Number(cliente.saldo_devedor || 0)).toFixed(2).replace('.', ',')}.` }
  }
  return { ok: true, cliente, novo_saldo: novoSaldo }
}
function registrarDebitoCliente(cliente_id, valor, dados = {}) {
  const validacao = validarDebitoCliente(cliente_id, valor)
  if (!validacao.ok) return validacao
  const lista = lerJSON('contas_clientes')
  const movimento = {
    id: nextId(lista),
    cliente_id: Number(cliente_id),
    tipo: 'debito',
    valor: arredondarMoeda(valor),
    descricao: String(dados.descricao || 'Compra fiado'),
    comanda_id: dados.comanda_id || null,
    saldo_apos: validacao.novo_saldo,
    criado_em: agora()
  }
  lista.push(movimento)
  salvarJSON('contas_clientes', lista)
  return { ok: true, movimento, saldo: validacao.novo_saldo }
}
function registrarPagamentoCliente(cliente_id, valor, forma_pgto = 'Dinheiro', observacao = '') {
  const cliente = getCliente(cliente_id)
  if (!cliente) return { ok: false, erro: 'Cliente nao encontrado.' }
  const total = arredondarMoeda(valor)
  const saldo = Number(cliente.saldo_devedor || 0)
  if (!(total > 0)) return { ok: false, erro: 'Informe um valor de pagamento maior que zero.' }
  if (total > saldo + 0.001) return { ok: false, erro: 'O pagamento nao pode ser maior que o saldo em aberto.' }
  const lista = lerJSON('contas_clientes')
  const novoSaldo = Math.max(0, arredondarMoeda(saldo - total))
  const movimento = {
    id: nextId(lista),
    cliente_id: Number(cliente_id),
    tipo: 'pagamento',
    valor: total,
    descricao: String(observacao || `Pagamento - ${forma_pgto}`),
    forma_pgto,
    saldo_apos: novoSaldo,
    criado_em: agora()
  }
  lista.push(movimento)
  salvarJSON('contas_clientes', lista)
  inserirFinanceiro({
    data: dataHoje(),
    tipo: 'Receita',
    descricao: `Pagamento fiado - ${cliente.nome}`,
    valor: total,
    forma_pgto,
    cliente_id: Number(cliente_id),
    conta_movimento_id: movimento.id
  })
  return { ok: true, movimento, saldo: novoSaldo }
}

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

function getRelatorioGarcons(filtros = {}) {
  const periodo = normalizarPeriodo(filtros)
  const grupos = new Map()

  listarGarcons().forEach(g => {
    grupos.set(`id:${g.id}`, {
      garcom_id: g.id,
      codigo: g.codigo || '',
      nome: g.nome || 'Garcom',
      ativo: g.ativo !== false,
      comandas: 0,
      itens: 0,
      total: 0
    })
  })

  lerJSON('comandas')
    .filter(c => c.status === 'fechada' && dentroPeriodo(c.fechamento, periodo.inicio, periodo.fim))
    .forEach(c => {
      const nome = String(c.garcom || '').trim()
      const codigo = String(c.garcom_codigo || '').trim()
      const chave = c.garcom_id ? `id:${c.garcom_id}` : codigo ? `codigo:${codigo}` : nome ? `nome:${nome.toLowerCase()}` : 'sem-garcom'
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          garcom_id: c.garcom_id || null,
          codigo: codigo || '--',
          nome: nome || 'Sem garcom',
          ativo: c.garcom_id ? null : false,
          comandas: 0,
          itens: 0,
          total: 0
        })
      }
      const grupo = grupos.get(chave)
      grupo.comandas += 1
      grupo.itens += (c.itens || []).reduce((s, item) => s + Number(item.qtd || 0), 0)
      grupo.total += Number(c.total || 0)
    })

  const garcons = Array.from(grupos.values())
    .map(g => ({ ...g, ticket_medio: g.comandas ? g.total / g.comandas : 0 }))
    .sort((a, b) => b.total - a.total || b.comandas - a.comandas || String(a.codigo).localeCompare(String(b.codigo), 'pt-BR', { numeric: true }))

  const comVendas = garcons.filter(g => g.comandas > 0)
  const total = comVendas.reduce((s, g) => s + g.total, 0)
  const comandas = comVendas.reduce((s, g) => s + g.comandas, 0)
  return {
    periodo,
    garcons,
    total,
    comandas,
    itens: comVendas.reduce((s, g) => s + g.itens, 0),
    ticket_medio: comandas ? total / comandas : 0
  }
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

function dataHoje() { return agora().slice(0, 10) }

module.exports = {
  getConfig, setConfig,
  listarMesas, getMesa, inserirMesa, atualizarMesa, deletarMesa,
  listarGarcons, getGarcom, inserirGarcom, atualizarGarcom, deletarGarcom, getRelatorioGarcons,
  listarCardapio, getCardapioItem, inserirCardapio, atualizarCardapio, deletarCardapio,
  listarComandas, getComanda, inserirComanda, transferirComanda, adicionarItemComanda, removerItemComanda, fecharComanda, cancelarComanda,
  listarFinanceiro, inserirFinanceiro, atualizarFinanceiro, deletarFinanceiro,
  listarEstoque, getEstoqueItem, inserirEstoque, atualizarEstoque, deletarEstoque, toggleDisponivel, toggleInterno,
  listarClientes, getCliente, inserirCliente, atualizarCliente, deletarCliente, listarMovimentosCliente, registrarDebitoCliente, registrarPagamentoCliente,
  listarVendas, getVenda, registrarVenda, atualizarStatusVenda,
  getDashStats
}

