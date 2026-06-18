const SALT_MU   = 'GHZ2026MESAUP'
const LS_KEY_MU = '@MESAUP:licenca'
const PREFIX_MU = 'MESAUP'

function gerarChaveMU(n) {
  const p1 = String(n).padStart(4, '0')
  const p2 = btoa(n + SALT_MU).replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()
  const p3 = String((n * 17) % 9999).padStart(4, '0')
  return `${PREFIX_MU}-${p1}-${p2}-${p3}`
}

function validarChaveMU(key) {
  if (!key) return false
  const clean = key.trim().toUpperCase()
  const parts = clean.split('-')
  if (parts.length !== 4 || parts[0] !== PREFIX_MU) return false
  const n = parseInt(parts[1])
  if (isNaN(n)) return false
  return gerarChaveMU(n) === clean
}

function licencaAtivaMU() {
  try { return validarChaveMU(localStorage.getItem(LS_KEY_MU) || '') }
  catch(e) { return false }
}

function salvarLicencaMU(key) {
  localStorage.setItem(LS_KEY_MU, key.trim().toUpperCase())
}
