import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanCodigo(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: "missing_supabase_env" }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const codigo = cleanCodigo(body.codigo);
  const token = String(body.token || "");
  const html = String(body.html || "");
  const estabelecimento = body.estabelecimento || {};

  if (!codigo || codigo.length < 6) return json({ ok: false, error: "invalid_codigo" }, 400);
  if (!token || token.length < 32) return json({ ok: false, error: "invalid_token" }, 401);
  if (!html || html.length < 100) return json({ ok: false, error: "invalid_html" }, 400);
  if (html.length > 1_000_000) return json({ ok: false, error: "html_too_large" }, 413);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const tokenHash = await sha256Hex(token);
  const { data: existente, error: findError } = await supabase
    .from("mesaup_estabelecimentos")
    .select("id, token_hash, ativo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (findError) return json({ ok: false, error: "lookup_failed", message: findError.message }, 500);
  if (existente && existente.token_hash !== tokenHash) {
    return json({ ok: false, error: "invalid_publish_token" }, 403);
  }
  if (existente && !existente.ativo) {
    return json({ ok: false, error: "estabelecimento_inativo" }, 403);
  }

  let estabelecimentoId = existente?.id;
  if (!estabelecimentoId) {
    const { data: novo, error: insertError } = await supabase
      .from("mesaup_estabelecimentos")
      .insert({
        codigo,
        token_hash: tokenHash,
        nome: String(estabelecimento.nome || "MesaUp").slice(0, 120),
        telefone: String(estabelecimento.telefone || "").slice(0, 40),
        endereco: String(estabelecimento.endereco || "").slice(0, 240),
        documento: String(estabelecimento.documento || "").slice(0, 40),
        responsavel: String(estabelecimento.responsavel || "").slice(0, 120),
      })
      .select("id")
      .single();
    if (insertError) return json({ ok: false, error: "insert_failed", message: insertError.message }, 500);
    estabelecimentoId = novo.id;
  } else {
    await supabase
      .from("mesaup_estabelecimentos")
      .update({
        nome: String(estabelecimento.nome || "MesaUp").slice(0, 120),
        telefone: String(estabelecimento.telefone || "").slice(0, 40),
        endereco: String(estabelecimento.endereco || "").slice(0, 240),
        documento: String(estabelecimento.documento || "").slice(0, 40),
        responsavel: String(estabelecimento.responsavel || "").slice(0, 120),
        atualizado_em: new Date().toISOString(),
        ultimo_publish_em: new Date().toISOString(),
      })
      .eq("id", estabelecimentoId);
  }

  const storagePath = `${codigo}/index.html`;
  const { error: uploadError } = await supabase.storage
    .from("cardapios")
    .upload(storagePath, new Blob([html], { type: "text/html; charset=utf-8" }), {
      upsert: true,
      contentType: "text/html; charset=utf-8",
      cacheControl: "60",
    });

  if (uploadError) {
    return json({ ok: false, error: "storage_upload_failed", message: uploadError.message }, 500);
  }

  await supabase.from("mesaup_publicacoes_cardapio").insert({
    estabelecimento_id: estabelecimentoId,
    codigo,
    storage_path: storagePath,
    html_bytes: new TextEncoder().encode(html).length,
  });

  const storageUrl = `${supabaseUrl}/storage/v1/object/public/cardapios/${storagePath}`;
  return json({ ok: true, codigo, storagePath, storageUrl });
});
