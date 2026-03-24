export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Endpoint ativo"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Método não permitido"
    });
  }

  try {
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    return res.status(200).json({
      ok: true,
      message: "Webhook recebido com sucesso",
      received: req.body
    });
  } catch (error) {
    console.error("Erro:", error);

    return res.status(500).json({
      ok: false,
      message: "Erro ao processar webhook"
    });
  }
}