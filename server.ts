import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing json and raw texts
app.use(express.json({ limit: '10mb' }));

// Shared Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A variável de ambiente GEMINI_API_KEY é necessária");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API endpoint for parsing raw promotions
app.post("/api/parse-promo", async (req, res) => {
  const { rawText } = req.body;
  console.log("[parse-promo] Recebeu solicitação de análise de promoção.");
  if (!rawText || typeof rawText !== "string") {
    console.warn("[parse-promo] Solicitação rejeitada: rawText ausente ou inválido.");
    return res.status(400).json({ error: "Texto de promoção bruto é obrigatório." });
  }

  console.log(`[parse-promo] Tamanho do texto bruto enviado: ${rawText.length} caracteres.`);

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("[parse-promo] Erro: GEMINI_API_KEY não está definida nas variáveis de ambiente!");
      return res.status(500).json({ 
        error: "A variável de ambiente GEMINI_API_KEY não está configurada no seu painel de Configurações > Secrets." 
      });
    }

    console.log("[parse-promo] Inicializando cliente GoogleGenAI...");
    const ai = getGeminiClient();
    
    const prompt = `Analise o seguinte texto promocional de insumos estéticos e cirúrgicos que foi colado. Extraia todas as categorias, nomes de produtos, preços normais/unitários e também qualquer preço promocional baseado em compra em quantidade (tiers/escalas de desconto). 

Texto promocional:
"""
${rawText}
"""`;

    console.log("[parse-promo] Enviando dados para o modelo gemini-3.5-flash...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Você é um assistente de gestão de clínicas de estética. Sua tarefa é extrair tabelas de preços de insumos clínicos de textos promocionais bagunçados (frequentemente copiados do WhatsApp) e formatá-los em JSON padronizado. Identifique o título da promoção, determine o mês e ano correspondente para o campo dataRef (formato YYYY-MM, ex: se o texto diz 'PROMOÇÃO DE MAIO' e o ano atual é 2026, coloque '2026-05'), e preencha a lista de produtos estruturadamente.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: { 
              type: Type.STRING, 
              description: "O título da promoção ou cabeçalho identificado (ex: PROMOÇÃO DE MAIO - SP)" 
            },
            dataRef: { 
              type: Type.STRING, 
              description: "Formato YYYY-MM da promoção. Identifique o mês do título e use o ano atual (2026). Ex: '2026-05' para Maio." 
            },
            produtos: {
              type: Type.ARRAY,
              description: "Lista estruturada dos produtos ou itens da promoção",
              items: {
                type: Type.OBJECT,
                properties: {
                  nome: { 
                    type: Type.STRING, 
                    description: "Nome limpo e completo do produto, incluindo tamanho/unidades se houver (ex: XEOMIN 100UI, BOTOX 200UI, RENNOVA FILL (1x1ml))" 
                  },
                  categoria: { 
                    type: Type.STRING, 
                    description: "Categoria estrita de estética (ex: TOXINAS BOTULÍNICAS, PREENCHEDORES, BIOESTIMULADORES, BIOREMODELADORES, PDRN, EXOSSOMOS, FIOS DE PDO, CANETAS E TECNOLOGIA, SOLUÇÃO DE KLEIN, CÂNULAS, EQUIPAMENTOS etc.)" 
                  },
                  precoUnitario: { 
                    type: Type.NUMBER, 
                    description: "Preço padrão de uma única unidade (ex: para 'R$ 569,00' deve ser 569.0)" 
                  },
                  detalhes: { 
                    type: Type.STRING, 
                    description: "Comentários como validade, cashback, brinde ou outras notas (ex: 'Val:06/26' ou 'Ganhe uma Cânula Prodeep')" 
                  },
                  tiers: {
                    type: Type.ARRAY,
                    description: "Lista de descontos para compra em maior quantidade se houver",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        quantidade: { 
                          type: Type.INTEGER, 
                          description: "Quantidade mínima para obter o desconto daquele patamar (ex: se diz 'Levando 03 cx', quantidade é 3)" 
                        },
                        precoCada: { 
                          type: Type.NUMBER, 
                          description: "Preço de cada unidade comprando essa quantidade (ex: se diz 'R$ 550,00 cada', precoCada é 550.0)" 
                        }
                      },
                      required: ["quantidade", "precoCada"]
                    }
                  }
                },
                required: ["nome", "categoria", "precoUnitario"]
              }
            }
          },
          required: ["titulo", "dataRef", "produtos"]
        }
      }
    });

    console.log("[parse-promo] Resposta obtida com sucesso do Gemini API.");
    let rawTextResponse = response.text || "{}";
    rawTextResponse = rawTextResponse.trim();
    
    // Clean potential markdown wrap
    if (rawTextResponse.startsWith("```json")) {
      rawTextResponse = rawTextResponse.slice(7);
    } else if (rawTextResponse.startsWith("```")) {
      rawTextResponse = rawTextResponse.slice(3);
    }
    if (rawTextResponse.endsWith("```")) {
      rawTextResponse = rawTextResponse.slice(0, -3);
    }
    rawTextResponse = rawTextResponse.trim();

    const parsedJson = JSON.parse(rawTextResponse);
    
    // Normalize products so each definitely has a tiers list
    if (parsedJson && Array.isArray(parsedJson.produtos)) {
      parsedJson.produtos = parsedJson.produtos.map((p: any) => ({
        ...p,
        tiers: Array.isArray(p.tiers) ? p.tiers : []
      }));
    }

    console.log(`[parse-promo] JSON analisado com sucesso. Total de produtos extraídos: ${parsedJson.produtos?.length || 0}`);
    return res.json(parsedJson);
  } catch (error: any) {
    console.error("[parse-promo] Erro no processamento com o Gemini:", error);
    return res.status(500).json({ 
      error: error.message || "Erro desconhecido durante o contato com o Gemini.",
      details: error.toString()
    });
  }
});

// Vite middleware development setup or general static serve
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Full-Stack] Servidor rodando na porta ${PORT} de forma integrada`);
  });
}

bootstrap();
