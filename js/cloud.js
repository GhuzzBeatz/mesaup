const crypto = require('crypto')
const { getConfig, setConfig } = require('./db.js')

const MESAUP_CLOUD = {
  edgeUrl: 'https://wpkaaxarresldcstaatj.functions.supabase.co/publicar-cardapio',
  publicViewerBase: 'https://ghuzzbeatz.github.io/html-venda/cardapio/'
}

function slugify(v) {
  return String(v || 'mesaup')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'mesaup'
}

function randomCode(size = 5) {
  return crypto.randomBytes(size).toString('hex').toUpperCase()
}

function isCloudConfigured() {
  return !MESAUP_CLOUD.edgeUrl.includes('__MESAUP_SUPABASE_PROJECT_REF__')
}

function ensureCloudIdentity(nomeEstabelecimento = '') {
  let codigo = getConfig('cloud_codigo')
  let token = getConfig('cloud_token')

  if (!codigo) {
    codigo = `${slugify(nomeEstabelecimento || getConfig('bar_nome') || 'mesaup')}-${randomCode(3).toLowerCase()}`
    setConfig('cloud_codigo', codigo)
  }

  if (!token) {
    token = randomCode(24)
    setConfig('cloud_token', token)
  }

  return { codigo, token }
}

function getPublicCardapioUrl(codigo) {
  const code = codigo || getConfig('cloud_codigo')
  return code ? `${MESAUP_CLOUD.publicViewerBase}?c=${encodeURIComponent(code)}` : ''
}

async function publicarCardapioCloud({ htmlContent, estabelecimento = {} }) {
  if (!isCloudConfigured()) {
    return {
      sucesso: false,
      motivo: 'cloud_nao_configurada',
      mensagem: 'Falta configurar o project ref do Supabase no MesaUp Cloud.'
    }
  }

  const identidade = ensureCloudIdentity(estabelecimento.nome)
  const response = await fetch(MESAUP_CLOUD.edgeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigo: identidade.codigo,
      token: identidade.token,
      estabelecimento,
      html: htmlContent
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) {
    return {
      sucesso: false,
      motivo: data.error || 'erro_publicacao',
      mensagem: data.message || `Erro HTTP ${response.status}`
    }
  }

  return {
    sucesso: true,
    codigo: identidade.codigo,
    publicUrl: getPublicCardapioUrl(identidade.codigo),
    storageUrl: data.storageUrl || ''
  }
}

module.exports = {
  MESAUP_CLOUD,
  isCloudConfigured,
  ensureCloudIdentity,
  getPublicCardapioUrl,
  publicarCardapioCloud
}
