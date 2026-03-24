let emails = [];

function extractCode(text = "") {
  const patterns = [
    /\b\d{4,8}\b/g,
    /\b[A-Z0-9]{4,10}\b/g,
    /\b[A-Z]{2,5}-\d{3,8}\b/g
  ];

  for (const pattern of patterns) {
    const matches = String(text).match(pattern);
    if (matches && matches.length) {
      return matches[0];
    }
  }

  return null;
}

function normalizePayload(reqBody) {
  const payload = Array.isArray(reqBody) ? reqBody[0] : reqBody || {};

  const receivedAt = payload.receivedAt || new Date().toISOString();
  const headers = payload.headers || {};
  const body = payload.body || {};

  const email =
    body.username ||
    body.email ||
    body.from ||
    "desconhecido";

  const message =
    body.content ||
    body.body ||
    body.message ||
    body.text ||
    JSON.stringify(body, null, 2);

  const subject =
    body.subject ||
    "Nova mensagem recebida";

  const code =
    body.code ||
    extractCode(`${subject}\n${message}`) ||
    null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: String(email).toLowerCase().trim(),
    subject,
    message,
    code,
    receivedAt,
    debug: {
      original: reqBody,
      payload,
      headers,
      body
    }
  };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      total: emails.length,
      emails
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Método não permitido"
    });
  }

  try {
    const emailItem = normalizePayload(req.body);

    emails.unshift(emailItem);

    if (emails.length > 100) {
      emails = emails.slice(0, 100);
    }

    console.log("Webhook recebido:", JSON.stringify(emailItem, null, 2));

    return res.status(200).json({
      ok: true,
      message: "Webhook recebido com sucesso",
      email: emailItem
    });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);

    return res.status(500).json({
      ok: false,
      message: "Erro ao processar webhook"
    });
  }
}