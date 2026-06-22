const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const root = path.join(__dirname, '..')
const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesaup-visual-'))
const dataDir = path.join(runDir, 'data')
const outputDir = path.join(runDir, 'output')
fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(outputDir, { recursive: true })

ipcMain.handle('license:device-info', async () => ({ device_hash: 'visual-test', device_name: 'Visual Test' }))
ipcMain.handle('license:get-state', async () => ({ active: true }))
ipcMain.handle('license:validate', async () => ({ ok: true, license_key: 'MESAUP-TESTE-VISUAL', customer_name: 'Teste Visual', last_seen_at: new Date().toISOString() }))

const now = new Date()
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const timestamp = `${date} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`

function save(name, value) {
  fs.writeFileSync(path.join(dataDir, `${name}.json`), JSON.stringify(value, null, 2), 'utf8')
}

save('config', { bar_nome: 'Restaurante Teste' })
save('garcons', [
  { id: 1, codigo: '01', nome: 'Ana Silva', ativo: true, criado_em: timestamp },
  { id: 2, codigo: '02', nome: 'Bruno Souza', ativo: false, criado_em: timestamp }
])
save('mesas', [
  { id: 1, numero: '1', capacidade: 4, formato: 'quadrada', pos_x: 8, pos_y: 12, status: 'livre', criado_em: timestamp },
  { id: 2, numero: '2', capacidade: 2, formato: 'redonda', pos_x: 46, pos_y: 12, status: 'ocupada', criado_em: timestamp },
  { id: 3, numero: '3', capacidade: 6, formato: 'retangular', pos_x: 80, pos_y: 12, status: 'livre', criado_em: timestamp },
  { id: 4, numero: '4', capacidade: 4, formato: 'redonda', pos_x: 15, pos_y: 68, status: 'livre', criado_em: timestamp },
  { id: 5, numero: '5', capacidade: 8, formato: 'retangular', pos_x: 50, pos_y: 70, status: 'livre', criado_em: timestamp },
  { id: 6, numero: '6', capacidade: 4, formato: 'quadrada', pos_x: 86, pos_y: 70, status: 'livre', criado_em: timestamp }
])
save('estoque', [
  { id: 1, nome: 'Hambúrguer', categoria: 'Lanches', unidade: 'un', quantidade: 20, qtd_minima: 5, preco: 25, interno: 0, disponivel: 1, setor_preparo: 'cozinha' },
  { id: 2, nome: 'Refrigerante', categoria: 'Bebidas', unidade: 'un', quantidade: 30, qtd_minima: 5, preco: 8, interno: 0, disponivel: 1, setor_preparo: 'balcao' }
])
save('comandas', [
  {
    id: 1, mesa_id: 1, mesa_num: '1', consumidor: 'Cliente Teste', garcom_id: 1, garcom_codigo: '01', garcom: 'Ana Silva',
    status: 'fechada', forma_pgto: 'PIX', abertura: timestamp, fechamento: timestamp, total: 58,
    itens: [
      { item_id: 1, produto_id: 1, nome: 'Hambúrguer', preco: 25, qtd: 2, obs: 'Sem cebola', setor_preparo: 'cozinha' },
      { item_id: 2, produto_id: 2, nome: 'Refrigerante', preco: 8, qtd: 1, obs: '', setor_preparo: 'balcao' }
    ]
  },
  {
    id: 2, mesa_id: 2, mesa_num: '2', cliente_id: 1, consumidor: 'Marcos Cliente', garcom_id: 1, garcom_codigo: '01', garcom: 'Ana Silva',
    status: 'aberta', abertura: timestamp, fechamento: null, total: 25,
    itens: [{ item_id: 1, produto_id: 1, nome: 'Hambúrguer', preco: 25, qtd: 1, obs: '', setor_preparo: 'cozinha' }]
  }
])
save('financeiro', [{ id: 1, data: date, tipo: 'Receita', descricao: 'Mesa 1', valor: 58, forma_pgto: 'PIX', comanda_id: 1, criado_em: timestamp }])
save('clientes', [{ id: 1, nome: 'Marcos Cliente', telefone: '(11) 99999-0000', endereco: 'Rua Teste, 10', origem: 'Mesa', limite_credito: 300, dia_vencimento: 5, total_compras: 3, total_gasto: 145, ultima_compra: timestamp, criado_em: timestamp }])
save('contas_clientes', [
  { id: 1, cliente_id: 1, tipo: 'debito', valor: 80, descricao: 'Comanda #8 - Mesa 4', comanda_id: 8, saldo_apos: 80, criado_em: timestamp },
  { id: 2, cliente_id: 1, tipo: 'pagamento', valor: 30, descricao: 'Pagamento semanal', forma_pgto: 'PIX', saldo_apos: 50, criado_em: timestamp }
])
save('vendas', [])

async function waitForRender(win) {
  await new Promise(resolve => setTimeout(resolve, 450))
  await win.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : true')
}

async function capture(win, page, fileName, query) {
  await win.loadFile(path.join(root, 'pages', page), query ? { query } : undefined)
  await waitForRender(win)
  const image = await win.webContents.capturePage()
  const filePath = path.join(outputDir, fileName)
  fs.writeFileSync(filePath, image.toPNG())
  return filePath
}

async function captureApp(win, fileName) {
  await win.loadFile(path.join(root, 'index.html'))
  await new Promise(resolve => setTimeout(resolve, 120))
  const license = JSON.stringify({ active: true, license_key: 'MESAUP-TESTE-VISUAL', customer_name: 'Teste Visual', last_validated_at: new Date().toISOString() })
  const session = JSON.stringify({ ok: true, at: new Date().toISOString() })
  await win.webContents.executeJavaScript(`localStorage.setItem('@MESAUP:licenca_cache', ${JSON.stringify(license)}); sessionStorage.setItem('@MESAUP:licenca_sessao', ${JSON.stringify(session)})`)
  await win.loadFile(path.join(root, 'index.html'))
  await waitForRender(win)
  const image = await win.webContents.capturePage()
  const filePath = path.join(outputDir, fileName)
  fs.writeFileSync(filePath, image.toPNG())
  return filePath
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    show: false,
    backgroundColor: '#111827',
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
      offscreen: true,
      additionalArguments: [`--data-dir=${dataDir}`]
    }
  })

  const outputs = []
  outputs.push(await captureApp(win, '00-app.png'))
  outputs.push(await capture(win, 'garcons.html', '01-garcons.png'))
  outputs.push(await capture(win, 'mesas.html', '02-mesas.png'))
  outputs.push(await capture(win, 'comandas.html', '03-comandas.png'))
  await win.webContents.executeJavaScript('abrirDetalhe(2)')
  await waitForRender(win)
  const openDetailImage = await win.webContents.capturePage()
  const openDetailPath = path.join(outputDir, '04-comanda-aberta.png')
  fs.writeFileSync(openDetailPath, openDetailImage.toPNG())
  outputs.push(openDetailPath)

  outputs.push(await capture(win, 'clientes.html', '05-clientes.png'))
  await win.webContents.executeJavaScript('abrirConta(1)')
  await waitForRender(win)
  const accountImage = await win.webContents.capturePage()
  const accountPath = path.join(outputDir, '06-conta-cliente.png')
  fs.writeFileSync(accountPath, accountImage.toPNG())
  outputs.push(accountPath)

  await capture(win, 'comandas.html', '03-comandas.png')
  await win.webContents.executeJavaScript('abrirDetalhe(1)')
  await waitForRender(win)
  const detailImage = await win.webContents.capturePage()
  const detailPath = path.join(outputDir, '07-comanda-fechada.png')
  fs.writeFileSync(detailPath, detailImage.toPNG())
  outputs.push(detailPath)

  const receiptHtml = await win.webContents.executeJavaScript('gerarHTMLContaMesa(getComanda(1))')
  const pdfWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } })
  await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(receiptHtml))
  const contentHeightPx = await pdfWin.webContents.executeJavaScript("Math.ceil((document.querySelector('.wrap') || document.body).getBoundingClientRect().height + 4)")
  const pdf = await pdfWin.webContents.printToPDF({
    pageSize: { width: 80 / 25.4, height: Math.max(2, Number(contentHeightPx || 0) / 96 + 0.12) },
    printBackground: true,
    margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
  })
  const pdfPath = path.join(outputDir, '08-comanda.pdf')
  fs.writeFileSync(pdfPath, pdf)
  outputs.push(pdfPath)
  pdfWin.destroy()
  win.destroy()

  process.stdout.write(JSON.stringify({ runDir, outputs }))
  app.quit()
}).catch(error => {
  process.stderr.write(error.stack || String(error))
  app.exit(1)
})
