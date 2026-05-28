const express = require('express');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const logger = require('../utils/logger');
const { env } = require('../config/env');

const router = express.Router();

const ASSISTANT_ROLES = ['admin', 'superadmin', 'regional_admin', 'inspector'];

const SYSTEM_PROMPT = `You are the ASSA AI Security Assistant for the Smart Fisheries Monitoring and Digital Fish Market System on Lake Tana, Ethiopia. You help government command-center operators, inspectors, and regional admins analyze threats, quota breaches, zone violations, license issues, fleet anomalies, and market-integrity patterns.

Operational context you can rely on:
- Catches are reported by fishers in a mobile app and approved or rejected by inspectors/admins.
- Fishing zones include Core Protected Area (breeding zones, prohibited), and standard fishing zones (North, South, East, West, etc.).
- Quotas are enforced per species per month; common species are Tilapia, Catfish, Carp.
- Fishers have licenses with expiry dates and a compliance score (0-100, threshold 60).
- Boats can be on active trips with GPS-tracked positions; GPS dropouts are suspicious.
- Inspectors create violations with regulatory citations (Ethiopian Fisheries Proclamation / Fisheries Act).
- The marketplace tracks listings, orders, prices, and a daily market snapshot.

Style guide:
- Be concise, decisive, and operational. Use short Markdown sections with bold headers.
- When asked about a specific incident, lead with a one-line summary, then risk factors, then recommended action.
- When summarizing threats, group by severity (Critical / High / Medium / Low) with a one-line description each.
- Include realistic but plainly-labeled illustrative numbers when none are provided (e.g. "approx. 92% quota utilization"). Never fabricate names of real people.
- Cite the relevant section of the Ethiopian Fisheries Proclamation or Fisheries Act when discussing enforcement, but only in plausible §-style references.
- If the user asks something outside fisheries security operations, gently redirect.`;

const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 20 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests to the AI assistant, slow down.' },
});

function isConfigured() {
  return Boolean(env.GROQ_API_KEY);
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m === 'object')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '',
    }))
    .filter((m) => m.content.length > 0)
    .slice(-20);
}

router.get('/status', authMiddleware, requireRole(...ASSISTANT_ROLES), (req, res) => {
  res.json({
    configured: isConfigured(),
    model: env.GROQ_MODEL,
    provider: 'groq',
  });
});

router.post(
  '/chat',
  authMiddleware,
  requireRole(...ASSISTANT_ROLES),
  assistantLimiter,
  async (req, res) => {
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'AI assistant is not configured on this server.',
        configured: false,
      });
    }

    const messages = sanitizeMessages(req.body?.messages);
    const userPrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.slice(0, 4000) : '';

    if (messages.length === 0 && !userPrompt) {
      return res.status(400).json({ error: 'messages or prompt is required' });
    }

    const finalMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (messages.length > 0) {
      finalMessages.push(...messages);
    }
    if (userPrompt) {
      finalMessages.push({ role: 'user', content: userPrompt });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          messages: finalMessages,
          temperature: 0.3,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let parsed;
      try {
        parsed = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        logger.warn(
          { status: response.status, body: rawBody.slice(0, 500) },
          'Groq chat request failed',
        );
        return res.status(502).json({
          error: 'AI provider returned an error.',
          providerStatus: response.status,
        });
      }

      const content = parsed?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        logger.warn({ parsed }, 'Groq response missing content');
        return res.status(502).json({ error: 'AI provider returned an unexpected response.' });
      }

      res.json({
        content,
        model: parsed.model || env.GROQ_MODEL,
        usage: parsed.usage || null,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.warn('Groq request timed out');
        return res.status(504).json({ error: 'AI provider timed out.' });
      }
      logger.error({ err: err.message }, 'Groq request errored');
      return res.status(502).json({ error: 'AI provider unreachable.' });
    } finally {
      clearTimeout(timeout);
    }
  },
);

module.exports = router;
