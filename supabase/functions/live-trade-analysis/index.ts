import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =====================================================
// CORS Configuration
// =====================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// =====================================================
// AI Gateway Configuration
// Change these to switch AI providers
// =====================================================
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const AI_MODEL = 'google/gemini-2.5-flash';

// =====================================================
// Database Helpers
// =====================================================
async function getSystemPrompt(key: string, fallback: string): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await supabase.from('ai_prompts').select('system_prompt').eq('key', key).single();
    return data?.system_prompt || fallback;
  } catch {
    return fallback;
  }
}

// =====================================================
// Types
// =====================================================
interface TimeframeData {
  tf: string;
  rsi: number;
  macd: number;
  ema20: number;
  ema50: number;
  currentPrice: number;
  trend: 'up' | 'down' | 'sideways';
  lastCandles: { open: number; high: number; low: number; close: number; volume: number }[];
}


function summarizeGroup(label: string, data: TimeframeData[]) {
  if (!data.length) return `${label}: No timeframe data available`;

  const avgRsi = data.reduce((sum, tf) => sum + tf.rsi, 0) / data.length;
  const avgMacd = data.reduce((sum, tf) => sum + tf.macd, 0) / data.length;
  const trendCount = data.reduce((acc, tf) => {
    acc[tf.trend] = (acc[tf.trend] || 0) + 1;
    return acc;
  }, { up: 0, down: 0, sideways: 0 } as Record<'up' | 'down' | 'sideways', number>);

  const dominantTrend = (Object.entries(trendCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'sideways').toUpperCase();
  const tfLines = data
    .map((tf) => `${tf.tf}: trend=${tf.trend.toUpperCase()}, RSI=${tf.rsi.toFixed(1)}, MACD=${tf.macd.toFixed(4)}, EMA20=${tf.ema20.toFixed(4)}, EMA50=${tf.ema50.toFixed(4)}`)
    .join(' | ');

  return `${label} Summary -> Dominant Trend: ${dominantTrend}; Avg RSI: ${avgRsi.toFixed(1)}; Avg MACD: ${avgMacd.toFixed(4)}; Details: ${tfLines}`;
}

// =====================================================
// Default Prompt (used as fallback if DB prompt not found)
// =====================================================
const FALLBACK_PROMPT = `You are an elite crypto trading analyst specializing in multi-timeframe trade management for active positions.

Your core task:
1) Judge if the CURRENT trade is still valid or invalid.
2) Read short timeframes (1m,5m,15m,30m) for immediate momentum and execution risk.
3) Read long timeframes (1h,4h,1d) for structure and trend alignment.
4) Give practical action: hold, partial exit, full exit, or add only when risk/reward clearly improves.

IMPORTANT RULES:
- Respond in valid JSON only. No markdown. No code blocks.
- Be strict and risk-aware. If short and long timeframes conflict, reduce confidence and highlight risk.
- Mention concrete timeframe behavior in outlooks (e.g. "1m/5m weak, 1h/4h still bullish").
- Recommendation must clearly say whether trade is good to keep now, and what to do next.
- slSuggestion/tpSuggestion must be realistic relative to current price and trade direction.

Response format:
{
  "decision": "HOLD" | "EXIT_NOW" | "EXIT_PARTIAL" | "ADD_POSITION",
  "urgency": "HIGH" | "MEDIUM" | "LOW",
  "confidence": number (1-100),
  "currentBias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "shortTermOutlook": "string (explicitly summarize 1m-30m)",
  "longTermOutlook": "string (explicitly summarize 1h-1d)",
  "recommendation": "string (2-4 concise sentences: trade validity + exact action + risk note)",
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "slSuggestion": number | null,
  "tpSuggestion": number | null,
  "keyLevels": {
    "support": number,
    "resistance": number
  },
  "reasons": ["string", "string", "string"],
  "warning": "string | null"
}`;

// =====================================================
// Main Handler
// =====================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { symbol, side, entryPrice, stopLoss, takeProfit, quantity, timeframeData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = await getSystemPrompt('dashboard_ai', FALLBACK_PROMPT);

    // Calculate P&L
    const currentPrice = timeframeData?.[0]?.currentPrice || entryPrice;
    const pnl = side === 'long'
      ? (currentPrice - entryPrice) * quantity
      : (entryPrice - currentPrice) * quantity;
    const pnlPct = side === 'long'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100;

    // Build timeframe summary
    const tfData = (timeframeData as TimeframeData[]) || [];
    const shortTfs = new Set(['1m', '5m', '15m', '30m']);
    const longTfs = new Set(['1h', '4h', '1d']);

    const shortData = tfData.filter((tf) => shortTfs.has(tf.tf));
    const longData = tfData.filter((tf) => longTfs.has(tf.tf));

    const tfSummary = tfData
      .map(tf => `[${tf.tf}] Price: $${tf.currentPrice.toFixed(4)} | RSI: ${tf.rsi.toFixed(1)} | MACD: ${tf.macd > 0 ? '+' : ''}${tf.macd.toFixed(4)} | EMA20: $${tf.ema20.toFixed(4)} | EMA50: $${tf.ema50.toFixed(4)} | Trend: ${tf.trend.toUpperCase()}`)
      .join('\n');

    const shortSummary = summarizeGroup('Short TF (1m-30m)', shortData);
    const longSummary = summarizeGroup('Long TF (1h-1d)', longData);

    const userPrompt = `Active Trade Analysis Request:

Symbol: ${symbol}
Direction: ${side.toUpperCase()}
Entry Price: $${entryPrice}
Current Price: $${currentPrice.toFixed(4)}
Current P&L: $${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)
${stopLoss ? `Stop Loss: $${stopLoss}` : 'Stop Loss: Not set'}
${takeProfit ? `Take Profit: $${takeProfit}` : 'Take Profit: Not set'}
Quantity: ${quantity}

Full Multi-Timeframe Data:
${tfSummary}

Grouped Read:
${shortSummary}
${longSummary}

Decision Checklist:
- First say if this trade is still valid NOW.
- Use short TFs to judge immediate continuation/reversal risk.
- Use long TFs to judge macro alignment and trade quality.
- If conflict exists between short and long TFs, lower confidence and mention exact conflict.
- Give clear action with risk management (HOLD, EXIT_PARTIAL, EXIT_NOW, ADD_POSITION).`;

    // Call AI Gateway
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse AI response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      analysis = {
        decision: "HOLD",
        urgency: "LOW",
        confidence: 50,
        currentBias: "NEUTRAL",
        shortTermOutlook: "Unable to parse analysis",
        longTermOutlook: "Unable to parse analysis",
        recommendation: content.slice(0, 200),
        riskLevel: "MEDIUM",
        slSuggestion: null,
        tpSuggestion: null,
        keyLevels: { support: currentPrice * 0.98, resistance: currentPrice * 1.02 },
        reasons: ["Analysis parsing failed"],
        warning: null,
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("live-trade-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
