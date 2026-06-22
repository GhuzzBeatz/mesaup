const { app, BrowserWindow, ipcMain, dialog, session } = require('electron')
const path = require('path')
const fs   = require('fs')

app.setName('MesaUp')

function getDataDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'data')
    : path.join(__dirname, 'data')
}

let win = null

function createWindow() {
  const dir = getDataDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    title: 'MesaUp',
    backgroundColor: '#111827',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#111827',
      symbolColor: '#e8eaf0',
      height: 28
    },
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,  // OBRIGATÓRIO — app usa iframes
      contextIsolation: false,
      webSecurity: false,
      additionalArguments: ['--data-dir=' + dir]
    }
  })

  win.loadFile('index.html')
  win.once('ready-to-show', () => { win.show(); win.focus() })
  setTimeout(() => { if (win && !win.isVisible()) win.show() }, 4000)
  win.on('page-title-updated', e => e.preventDefault())
}

// ── SALVAR PDF ─────────────────────────────────────────────
ipcMain.handle('salvar-pdf', async (event, { htmlContent, nomeArquivo }) => {
  let pdfWin = null
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      defaultPath: nomeArquivo,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return { sucesso: false, motivo: 'cancelado' }
    pdfWin = new BrowserWindow({
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })
    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent))
    const contentHeightPx = await pdfWin.webContents.executeJavaScript(`
      Math.ceil((document.querySelector('.wrap') || document.body).getBoundingClientRect().height + 4)
    `)
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: {
        width: 80 / 25.4,
        height: Math.max(2, Number(contentHeightPx || 0) / 96 + 0.12)
      },
      printBackground: true,
      preferCSSPageSize: false,
      margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
    })
    fs.writeFileSync(filePath, pdfBuffer)
    return { sucesso: true, caminho: filePath }
  } catch(err) {
    return { sucesso: false, motivo: 'erro', mensagem: err.message }
  } finally {
    if (pdfWin && !pdfWin.isDestroyed()) pdfWin.destroy()
  }
})


// ── SALVAR CSV ─────────────────────────────────────────────
ipcMain.handle('salvar-csv', async (event, { conteudo, nomeArquivo }) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      defaultPath: nomeArquivo,
      filters: [{ name: 'Excel/CSV', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return { sucesso: false, motivo: 'cancelado' }
    fs.writeFileSync(filePath, conteudo, 'utf8')
    return { sucesso: true, caminho: filePath }
  } catch(err) {
    return { sucesso: false, motivo: 'erro', mensagem: err.message }
  }
})

// ── SALVAR HTML ─────────────────────────────────────────────
ipcMain.handle('salvar-html', async (event, { htmlContent, nomeArquivo }) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      defaultPath: nomeArquivo,
      filters: [{ name: 'HTML', extensions: ['html'] }]
    })
    if (canceled || !filePath) return { sucesso: false, motivo: 'cancelado' }
    fs.writeFileSync(filePath, htmlContent, 'utf8')
    return { sucesso: true, caminho: filePath }
  } catch(err) {
    return { sucesso: false, motivo: 'erro', mensagem: err.message }
  }
})


// ── SERVIDOR LOCAL DO CARDÁPIO (QR CODE) ──────────────────
const http = require('http')
const os   = require('os')

let servidorCardapio = null
let portaCardapio    = 3030

function getLocalIP() {
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

ipcMain.handle('iniciar-servidor-cardapio', async (event, htmlCardapio) => {
  try {
    // Para servidor anterior se existir
    if (servidorCardapio) {
      servidorCardapio.close()
      servidorCardapio = null
    }
    servidorCardapio = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(htmlCardapio)
    })
    await new Promise((resolve, reject) => {
      servidorCardapio.listen(portaCardapio, '0.0.0.0', resolve)
      servidorCardapio.on('error', reject)
    })
    const ip  = getLocalIP()
    const url = `http://${ip}:${portaCardapio}`
    return { sucesso: true, url }
  } catch(err) {
    return { sucesso: false, mensagem: err.message }
  }
})

ipcMain.handle('parar-servidor-cardapio', async () => {
  if (servidorCardapio) { servidorCardapio.close(); servidorCardapio = null }
  return { sucesso: true }
})

// ── GHZ Backend (licença + atualização) ──────────────────
require('./js/ghz-backend')({
  app, ipcMain, getDataDir,
  appId: 'mesaup',
  manifestUrl: 'https://raw.githubusercontent.com/GhuzzBeatz/mesaup/master/update-manifest.json'
})

app.whenReady().then(async () => {
  // Evita que uma atualização continue exibindo páginas da versão anterior.
  await session.defaultSession.clearCache().catch(() => {})
  createWindow()
})
app.on('window-all-closed', () => { if (servidorCardapio) servidorCardapio.close(); if (process.platform !== 'darwin') app.quit() })
