let latestEmail = null;

function stripHtml(html = "") {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h1>/gi, "\n")
    .replace(/<\/h2>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractGloboCode(text = "") {
  const raw = String(text || "");

  const specificPatterns = [
    />\s*(\d{6})\s*<\/div>/i,
    /c[oó]digo de acesso[\s\S]{0,1200}?(\d{6})/i,
    /use o c[oó]digo a seguir[\s\S]{0,1200}?(\d{6})/i,
    /conta globo[\s\S]{0,1200}?(\d{6})/i
  ];

  for (const pattern of specificPatterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function extractGenericCode(text = "") {
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

function extractCode(text = "", sender = "", subject = "") {
  const raw = String(text || "");
  const senderText = String(sender || "").toLowerCase();
  const subjectText = String(subject || "").toLowerCase();
  const fullText = `${raw}\n${subject}\n${sender}`;

  const isGlobo =
    senderText.includes("globo") ||
    subjectText.includes("globo") ||
    raw.toLowerCase().includes("conta globo") ||
    raw.toLowerCase().includes("globo.com") ||
    raw.toLowerCase().includes("globoplay");

  if (isGlobo) {
    const globoCode = extractGloboCode(fullText);
    if (globoCode) return globoCode;
  }

  const textWithoutHtml = stripHtml(fullText);
  const genericCode = extractGenericCode(textWithoutHtml);
  if (genericCode) return genericCode;

  const fallbackCode = extractGenericCode(fullText);
  if (fallbackCode) return fallbackCode;

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
    extractCode(content, username, subject) ||
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