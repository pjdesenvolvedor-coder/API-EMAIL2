let latestEmail = null;

function extractCode(text = "") {
  const cleanText = String(text || "");

  const patterns = [
    /\b\d{4,8}\b/g,
    /\b[A-Z0-9]{4,10}\b/g,
    /\b[A-Z]{2,5}-\d{3,8}\b/g
  ];

  for (const pattern of patterns) {
    const matches = cleanText.match(pattern);
    if (matches && matches.length) {
      return matches[0];
    }
  }

  return null;
}

function extractRecipientEmail(text = "") {
  const cleanText = String(text || "");

  const patterns = [
    /Esta mensagem foi enviada para\s*\[([^\]]+@[^\]]+)\]/i,
    /enviada para\s*\[([^\]]+@[^\]]+)\]/i,
    /\[([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\]/i,
    /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  }

  return null;
}

function extractSubject(text = "") {
  const cleanText = String(text || "").trim();
  if (!cleanText) return "Nova mensagem recebida";

  const firstLine = cleanText
    .split("\n")
    .map(line => line.trim())
    .find(line => line.length > 0);

  return firstLine || "Nova mensagem recebida";
}

function normalizePayload(reqBody) {
  let payload = reqBody;

  if (Array.isArray(reqBody)) {
    payload = reqBody[0] || {};
  }

  payload = payload || {};

  const receivedAt = payload.receivedAt || new Date().toISOString();

  const nestedHeaders = payload.headers || {};
  const nestedBody = payload.body || {};

  const content =
    nestedBody.content ||
    payload.content ||
    nestedBody.body ||
    payload.message ||
    payload.text ||
    "";

  const username =
    nestedBody.username ||
    payload.username ||
    nestedBody.email ||
    payload.email ||
    nestedBody.from ||
    payload.from ||
    "desconhecido";

  const subject =
    nestedBody.subject ||
    payload.subject ||
    extractSubject(content);

  const code =
    nestedBody.code ||
    payload.code ||
    extractCode(`${subject}\n${content}`) ||
    null;

  const recipientEmail =
    nestedBody.to ||
    payload.to ||
    extractRecipientEmail(content) ||
    null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderEmail: String(username || "desconhecido").trim().toLowerCase(),
    recipientEmail: recipientEmail ? String(recipientEmail).trim().toLowerCase() : null,
    subject,
    message: content,
    code,
    receivedAt,
    debug: {
      original: reqBody,
      payload,
      headers: nestedHeaders,
      body: nestedBody
    }
  };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      total: latestEmail ? 1 : 0,
      emails: latestEmail ? [latestEmail] : []
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

    latestEmail = emailItem;

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