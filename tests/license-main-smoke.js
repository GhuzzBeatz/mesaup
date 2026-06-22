const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesaup-license-gate-'))
const root = path.join(__dirname, '..')
app.setAppPath(root)
process.chdir(root)
process.argv.push(`--data-dir=${dataDir}`)
require('../main.js')

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

app.whenReady().then(async () => {
  await wait(900)
  const windows = BrowserWindow.getAllWindows().filter(w => !w.isDestroyed())
  if (windows.length !== 1) throw new Error(`Esperava uma janela, encontrou ${windows.length}.`)

  const win = windows[0]
  if (win.webContents.getURL().includes('/tests/')) throw new Error(`Caminho do app incorreto: ${win.webContents.getURL()}`)
  if (!/\/pages\/licenca\.html$/i.test(decodeURIComponent(new URL(win.webContents.getURL()).pathname))) {
    throw new Error(`Tela inicial sem licenca incorreta: ${win.webContents.getURL()}`)
  }

  await win.webContents.executeJavaScript("window.location.replace('../index.html')")
  await wait(350)
  const finalUrl = win.webContents.getURL()
  if (!/\/pages\/licenca\.html$/i.test(decodeURIComponent(new URL(finalUrl).pathname))) {
    throw new Error(`O conteudo foi liberado sem licenca: ${finalUrl}`)
  }

  process.stdout.write(JSON.stringify({ windows: windows.length, blocked: true, url: finalUrl }))
  win.destroy()
  fs.rmSync(dataDir, { recursive: true, force: true })
  app.quit()
}).catch(error => {
  process.stderr.write(error.stack || String(error))
  app.exit(1)
})
