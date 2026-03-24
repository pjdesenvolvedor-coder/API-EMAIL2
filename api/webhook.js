let emails = [];

function extractCode(text = "") {
  const patterns = [
    /\b\d{4,8}\b/g,                       
    /\b[A-Z0-9]{4,10}\b/g,                
    /\b[A-Z]{2,5}-\d{3,8}\b/g             
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length) {
      return matches[0];
    }
  }

  return null;
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
    const body = req.body || {};

    const from =
      body.from ||
      body.sender ||
      body.email ||
      body.mail_from ||
      "Remetente desconhecido";

    const subject =
      body.subject ||
      body.assunto ||
      "Sem assunto";

    const message =
      body.body ||
      body.message ||
      body.text ||
      body.html ||
      body.content ||
      JSON.stringify(body, null, 2);

    const code =
      body.code ||
      extractCode(`${subject}\n${message}`) ||
      null;

    const emailItem = {
      id: Date.now().toString(),
      from,
      subject,
      message,
      code,
      receivedAt: new Date().toISOString(),
      raw: body
    };

    emails.unshift(emailItem);

    if (emails.length > 20) {
      emails = emails.slice(0, 20);
    }

    console.log("Webhook recebido:", emailItem);

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