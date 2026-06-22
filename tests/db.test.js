const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesaup-test-'))
process.argv.push(`--data-dir=${dataDir}`)
const db = require('../js/db.js')

function resetData() {
  for (const nome of ['garcons', 'mesas', 'comandas', 'estoque', 'financeiro', 'clientes', 'contas_clientes', 'vendas']) {
    fs.writeFileSync(path.join(dataDir, `${nome}.json`), '[]', 'utf8')
  }
  fs.writeFileSync(path.join(dataDir, 'config.json'), '{}', 'utf8')
}

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }))

test('cadastra garcons com codigo unico e atualiza comandas abertas', () => {
  resetData()
  const ana = db.inserirGarcom({ nome: 'Ana' })
  const bruno = db.inserirGarcom({ nome: 'Bruno', codigo: '10' })
  assert.equal(ana.ok, true)
  assert.equal(ana.garcom.codigo, '01')
  assert.equal(bruno.garcom.codigo, '10')
  assert.equal(db.inserirGarcom({ nome: 'Duplicado', codigo: '10' }).ok, false)

  const mesa = db.inserirMesa({ numero: '1', capacidade: 4 }).mesa
  const comanda = db.inserirComanda({ mesa_id: mesa.id, mesa_num: mesa.numero, garcom_id: ana.garcom.id })
  assert.equal(comanda.garcom, 'Ana')
  assert.equal(comanda.garcom_codigo, '01')
  assert.equal(db.deletarGarcom(ana.garcom.id).ok, false)

  const atualizacao = db.atualizarGarcom({ id: ana.garcom.id, nome: 'Ana Silva', codigo: '02' })
  assert.equal(atualizacao.ok, true)
  assert.equal(db.getComanda(comanda.id).garcom, 'Ana Silva')
  assert.equal(db.getComanda(comanda.id).garcom_codigo, '02')
})

test('fecha comanda uma vez, baixa estoque e consolida vendas por garcom', () => {
  resetData()
  const garcom = db.inserirGarcom({ nome: 'Carlos', codigo: '7' }).garcom
  const mesa = db.inserirMesa({ numero: '5', capacidade: 2 }).mesa
  db.inserirEstoque({ nome: 'Suco', categoria: 'Bebidas', quantidade: 10, preco: 8, disponivel: 1 })
  const produto = db.listarEstoque()[0]
  const comanda = db.inserirComanda({ mesa_id: mesa.id, mesa_num: mesa.numero, consumidor: 'Cliente', garcom_id: garcom.id })
  db.adicionarItemComanda(comanda.id, { produto_id: produto.id, nome: produto.nome, preco: produto.preco, qtd: 2 })

  const fechada = db.fecharComanda(comanda.id, 'PIX')
  assert.equal(fechada.total, 16)
  assert.equal(db.fecharComanda(comanda.id, 'PIX'), null)
  assert.equal(db.listarFinanceiro().length, 1)
  assert.equal(db.listarEstoque()[0].quantidade, 8)
  assert.equal(db.getMesa(mesa.id).status, 'livre')

  const data = String(fechada.fechamento).slice(0, 10)
  const relatorio = db.getRelatorioGarcons({ inicio: data, fim: data })
  const linha = relatorio.garcons.find(g => g.garcom_id === garcom.id)
  assert.equal(linha.comandas, 1)
  assert.equal(linha.itens, 2)
  assert.equal(linha.total, 16)
  assert.equal(linha.ticket_medio, 16)
  assert.equal(relatorio.total, 16)
})

test('preserva o historico ao excluir garcom sem comandas abertas', () => {
  resetData()
  const garcom = db.inserirGarcom({ nome: 'Daniel', codigo: '3' }).garcom
  const mesa = db.inserirMesa({ numero: '9' }).mesa
  const comanda = db.inserirComanda({ mesa_id: mesa.id, mesa_num: mesa.numero, garcom_id: garcom.id })
  db.adicionarItemComanda(comanda.id, { nome: 'Prato', preco: 25, qtd: 1 })
  const fechada = db.fecharComanda(comanda.id, 'Dinheiro')
  assert.equal(db.deletarGarcom(garcom.id).ok, true)

  const data = String(fechada.fechamento).slice(0, 10)
  const linha = db.getRelatorioGarcons({ inicio: data, fim: data }).garcons.find(g => g.garcom_id === garcom.id)
  assert.equal(linha.nome, 'Daniel')
  assert.equal(linha.total, 25)
})

test('persiste formato e posicao da mesa na planta', () => {
  resetData()
  const mesa = db.inserirMesa({ numero: '12', capacidade: 6, formato: 'retangular' }).mesa
  assert.equal(mesa.formato, 'retangular')
  assert.equal(mesa.pos_x, null)
  assert.equal(mesa.pos_y, null)

  const atualizada = db.atualizarMesa({ id: mesa.id, pos_x: 42.5, pos_y: 68.25 }).mesa
  assert.equal(atualizada.pos_x, 42.5)
  assert.equal(atualizada.pos_y, 68.25)
})

test('ordena mesas e comandas naturalmente e evita comanda duplicada', () => {
  resetData()
  const mesa10 = db.inserirMesa({ numero: '10' }).mesa
  const mesa2 = db.inserirMesa({ numero: '2' }).mesa
  const mesa1 = db.inserirMesa({ numero: '1' }).mesa
  assert.deepEqual(db.listarMesas().map(m => m.numero), ['1', '2', '10'])

  const c10 = db.inserirComanda({ mesa_id: mesa10.id, mesa_num: mesa10.numero })
  const c2 = db.inserirComanda({ mesa_id: mesa2.id, mesa_num: mesa2.numero })
  const c1 = db.inserirComanda({ mesa_id: mesa1.id, mesa_num: mesa1.numero })
  assert.deepEqual(db.listarComandas({ status: 'aberta' }).map(c => c.mesa_num), ['1', '2', '10'])
  assert.equal(db.inserirComanda({ mesa_id: mesa2.id, mesa_num: mesa2.numero }).id, c2.id)
  assert.notEqual(c10.id, c1.id)
})

test('transfere comanda somente para mesa livre', () => {
  resetData()
  const origem = db.inserirMesa({ numero: '1' }).mesa
  const destino = db.inserirMesa({ numero: '2' }).mesa
  const ocupada = db.inserirMesa({ numero: '3' }).mesa
  const comanda = db.inserirComanda({ mesa_id: origem.id, mesa_num: origem.numero })
  db.inserirComanda({ mesa_id: ocupada.id, mesa_num: ocupada.numero })

  assert.equal(db.transferirComanda(comanda.id, ocupada.id).ok, false)
  const resultado = db.transferirComanda(comanda.id, destino.id)
  assert.equal(resultado.ok, true)
  assert.equal(resultado.comanda.mesa_num, '2')
  assert.equal(db.getMesa(origem.id).status, 'livre')
  assert.equal(db.getMesa(destino.id).status, 'ocupada')
  assert.equal(resultado.comanda.transferencias.length, 1)
})

test('fiado libera mesa, respeita limite e aceita pagamentos parciais', () => {
  resetData()
  const cliente = db.inserirCliente({ nome: 'Cliente Fiado', limite_credito: 100, dia_vencimento: 5 })
  const mesa = db.inserirMesa({ numero: '4' }).mesa
  const comanda = db.inserirComanda({ mesa_id: mesa.id, mesa_num: mesa.numero, cliente_id: cliente.id })
  db.adicionarItemComanda(comanda.id, { nome: 'Consumo', preco: 60, qtd: 1 })

  const fechada = db.fecharComanda(comanda.id, 'Fiado')
  assert.equal(fechada.status, 'fechada')
  assert.equal(db.getMesa(mesa.id).status, 'livre')
  assert.equal(db.getCliente(cliente.id).saldo_devedor, 60)
  assert.equal(db.listarFinanceiro().length, 0)
  assert.equal(db.listarMovimentosCliente(cliente.id).length, 1)
  assert.equal(db.deletarCliente(cliente.id).ok, false)

  const mesa2 = db.inserirMesa({ numero: '5' }).mesa
  const comanda2 = db.inserirComanda({ mesa_id: mesa2.id, mesa_num: mesa2.numero, cliente_id: cliente.id })
  db.adicionarItemComanda(comanda2.id, { nome: 'Novo consumo', preco: 50, qtd: 1 })
  const limite = db.fecharComanda(comanda2.id, 'Fiado')
  assert.equal(limite.ok, false)
  assert.equal(db.getComanda(comanda2.id).status, 'aberta')

  assert.equal(db.registrarPagamentoCliente(cliente.id, 25, 'PIX').ok, true)
  assert.equal(db.getCliente(cliente.id).saldo_devedor, 35)
  assert.equal(db.listarFinanceiro()[0].valor, 25)
  assert.equal(db.registrarPagamentoCliente(cliente.id, 40, 'Dinheiro').ok, false)
  assert.equal(db.registrarPagamentoCliente(cliente.id, 35, 'Dinheiro').ok, true)
  assert.equal(db.getCliente(cliente.id).saldo_devedor, 0)
})
