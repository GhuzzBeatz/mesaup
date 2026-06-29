const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')

test('scripts inline das telas possuem sintaxe valida', () => {
  const arquivos = [path.join(root, 'index.html'), ...fs.readdirSync(path.join(root, 'pages'))
    .filter(nome => nome.endsWith('.html'))
    .map(nome => path.join(root, 'pages', nome))]

  for (const arquivo of arquivos) {
    const html = fs.readFileSync(arquivo, 'utf8')
    const blocos = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    for (const [, codigo] of blocos) {
      assert.doesNotThrow(() => new Function(codigo), `JavaScript invalido em ${path.basename(arquivo)}`)
    }
  }
})

test('navegacao e acoes novas estao ligadas', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  const comandas = fs.readFileSync(path.join(root, 'pages', 'comandas.html'), 'utf8')
  assert.match(index, /pages\/garcons\.html/)
  assert.match(comandas, /salvarContaPDF/)
  assert.match(comandas, /salvar-pdf/)
  assert.match(comandas, /transferirComandaAtual/)
  assert.match(comandas, /taxaGarcomAtiva/)
  assert.match(comandas, /atualizarTaxaGarcomComanda/)
  assert.match(comandas, /<option>Fiado<\/option>/)
  const configuracoes = fs.readFileSync(path.join(root, 'pages', 'configuracoes.html'), 'utf8')
  assert.match(configuracoes, /taxaGarcomPadrao/)
  const clientes = fs.readFileSync(path.join(root, 'pages', 'clientes.html'), 'utf8')
  assert.match(clientes, /registrarPagamentoCliente/)
  const mesas = fs.readFileSync(path.join(root, 'pages', 'mesas.html'), 'utf8')
  assert.match(mesas, /comandaClienteId/)
})

test('janela usa moldura personalizada e suporte compacto', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8')
  assert.doesNotMatch(index, /class="app-titlebar"/)
  assert.match(index, /class="content-titlebar"/)
  assert.match(index, /class="support-card"/)
  assert.match(index, /assets\/logo-ghz\.png/)
  assert.match(main, /frame:\s*false/)
  assert.match(main, /window:toggle-maximize/)
})

test('licenca bloqueia segunda instancia e conteudo antes da validacao', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8')
  const backend = fs.readFileSync(path.join(root, 'js', 'ghz-backend.js'), 'utf8')
  assert.match(main, /requestSingleInstanceLock/)
  assert.match(main, /validateForStartup/)
  assert.match(main, /isSessionAuthorized/)
  assert.match(main, /loadFile\('pages\/licenca\.html'\)/)
  assert.doesNotMatch(index, /catch\(\(\)\s*=>\s*ghzLicense\.markSession/)
  assert.match(backend, /sessionAuthorized = true/)
})

test('atualizador valida o instalador e release publica hash', () => {
  const backend = fs.readFileSync(path.join(root, 'js', 'ghz-backend.js'), 'utf8')
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'build-release.yml'), 'utf8')
  assert.match(backend, /createHash\('sha256'\)/)
  assert.match(backend, /falhou na verificacao de seguranca/)
  assert.match(workflow, /SETUP_SHA256/)
  assert.match(workflow, /sha256 = \$env:SETUP_SHA256/)
  assert.doesNotMatch(workflow, /schedule:/)
})
