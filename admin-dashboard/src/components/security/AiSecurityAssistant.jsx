import { useState, useRef, useEffect } from 'react';
import { Zap, Send, X, Maximize2, Minimize2, Bot, User, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/services/api';

const QUICK_PROMPTS = [
  "Summarize today's threats",
  'Explain the zone violation',
  'What is the current risk level?',
  'Suggest mitigations for quota breach',
  'Show suspicious activity patterns',
];

const SIMULATED_RESPONSES = {
  "Summarize today's threats": {
    text: `**Daily Threat Summary — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}**

**Overall Risk Level: ELEVATED (67/100)**

**Active Threats (6):**
- 🔴 **1 Critical:** Unauthorized zone entry — expired-license fisher in Core Protected Area
- 🟠 **2 High:** Tilapia quota at 92% utilization + anomalous 280kg catch submission
- 🟡 **2 Medium:** GPS signal loss (3 boats) + suspected market price manipulation
- 🔵 **1 Low:** Compliance score degradation in East Zone

**Key Recommendation:** Prioritize the zone violation response — the Core Protected Area breach during breeding season poses the highest ecological risk. Deploy nearest inspector immediately.

**Trend:** Threat volume is 40% above weekly average. Consider enhanced monitoring posture.`,
    delay: 2200,
  },
  'Explain the zone violation': {
    text: `**Zone Violation Analysis**

**Incident:** Boat "Silver Fish" (BT-2023-004) operated by **Hailu Desta** entered the **Core Protected Area** of Lake Tana at 14:23 local time.

**Risk Factors:**
- Fisher's license **FSH-2023-00089** is **EXPIRED** (since Dec 2025)
- Core Protected Area is designated as **PROHIBITED** — it is a critical breeding zone
- This is the breeding season, making the ecological impact significantly higher
- Fisher has a prior compliance score of **42/100** (below threshold)

**Historical Context:**
Hailu Desta has had 2 previous zone warnings in the past 6 months. His license was suspended in April 2025 but the boat was not impounded.

**Regulatory Reference:** Ethiopian Fisheries Proclamation §12.3 — unauthorized entry into prohibited zones during breeding season carries a fine of ETB 15,000-50,000 and mandatory 90-day license suspension.`,
    delay: 2500,
  },
  'What is the current risk level?': {
    text: `**Current Risk Assessment**

**Overall Risk Score: 67/100 (ELEVATED)**

**Factor Breakdown:**
| Factor | Score | Weight | Contribution |
|--------|-------|--------|-------------|
| Active zone violations | 9/10 | 25% | 22.5 |
| Quota utilization | 8/10 | 20% | 16.0 |
| Fleet compliance | 6/10 | 15% | 9.0 |
| Data anomalies | 7/10 | 15% | 10.5 |
| Market integrity | 5/10 | 10% | 5.0 |
| System health | 2/10 | 15% | 3.0 |
| **Total** | | | **66.0** |

**Trend:** Risk increased from 52 → 67 over the past 4 hours due to the zone violation and quota threshold breach.

**Forecast:** If current patterns continue without intervention, risk score will reach **CRITICAL (81+)** within 12 hours.`,
    delay: 2000,
  },
  'Suggest mitigations for quota breach': {
    text: `**Mitigation Plan — Tilapia Quota Breach Prevention**

**Current State:** 4,600 kg caught of 5,000 kg monthly limit (92%). 8 days remaining.

**Immediate Actions (0-24h):**
1. **Reduce daily Tilapia catch limits** by 40% for all zones → max 30kg/fisher/day
2. **Send SMS alerts** to all 15 active Tilapia fishers with updated limits
3. **Deploy inspectors** to high-yield zones (South Zone, West Zone)

**Short-term (1-3 days):**
4. **Activate species rotation** — encourage switch to Catfish/Carp (both at <60% quota)
5. **Increase spot-check frequency** in Lake Tana South Zone (highest Tilapia density)
6. **Price incentive adjustment** — coordinate with marketplace to highlight alternative species

**Monitoring:**
7. Set automated **daily quota check** at 95%, 98%, 100% thresholds
8. Enable **real-time catch-to-quota tracking** on dashboard

**Regulatory Basis:** Ethiopian Fisheries Act §8.1 — Authority to impose emergency catch restrictions when quota utilization exceeds 85%.`,
    delay: 2800,
  },
  'Show suspicious activity patterns': {
    text: `**Suspicious Activity Pattern Analysis**

**Pattern 1: Coordinated GPS Dropouts**
- 3 boats in North Zone lost GPS simultaneously (14:23)
- Statistical probability of coincidence: < 0.3%
- Similar pattern observed 3 times in last 60 days
- Correlation: GPS dropouts coincide with unreported catch submissions 48h later

**Pattern 2: Weekend Catch Anomalies**
- 23% of statistical outlier catches occur on Saturdays (vs 14% expected)
- Weekend inspector coverage is 40% lower than weekdays
- Fisher "Kebede Molla" has submitted 4 anomalous catches, all on weekends

**Pattern 3: Price Coordination Ring**
- 3 sellers consistently list at identical prices within 2-minute window
- All operate from Bahir Dar market zone
- Average markup: 35-45% above fair market value
- Pattern active for past 3 weeks

**Recommendation:** Cross-reference GPS dropout timestamps with catch submission records. Increase weekend inspector deployment. Initiate market price audit for Bahir Dar zone.`,
    delay: 2400,
  },
};

const FALLBACK_RESPONSE = {
  text: `I've analyzed the current security posture of the ASSA system. Here's what I found:

**System Status:** All core services operational. 6 active security events requiring attention.

**Priority Actions:**
1. Respond to Core Protected Area zone violation (CRITICAL)
2. Monitor Tilapia quota — approaching breach threshold
3. Investigate anomalous catch submission from West Zone

For more specific analysis, try asking about specific threats, risk levels, or mitigation strategies.`,
  delay: 1800,
};

function renderInlineMarkdown(line) {
  // Render **bold** as <strong> and leave everything else as plain text so
  // React handles escaping. Never use dangerouslySetInnerHTML on AI output.
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>);
    }
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push(<span key={key++}>{line.slice(lastIndex)}</span>);
  }
  return parts.length > 0 ? parts : line;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="flex gap-1">
        <span
          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-xs text-muted-foreground ml-2">ASSA AI analyzing...</span>
    </div>
  );
}

export default function AiSecurityAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api
      .get('/admin/security-assistant/status')
      .then(({ data }) => {
        if (cancelled) return;
        const live = Boolean(data?.configured);
        setAiConfigured(live);
        setMessages((prev) => {
          if (prev.length > 0) return prev;
          return [
            {
              role: 'assistant',
              content: live
                ? 'Welcome to ASSA AI Security Assistant. I have access to live system data — catches, quotas, alerts, violations, fleet, and market intel. Ask me anything.'
                : 'Welcome to ASSA AI Security Assistant (Demo Mode). The AI service is not configured on this server. Responses shown are pre-recorded examples. To enable live AI analysis, set the GROQ_API_KEY environment variable on the backend.',
              timestamp: new Date().toISOString(),
              simulated: !live,
            },
          ];
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAiConfigured(false);
        setMessages((prev) => {
          if (prev.length > 0) return prev;
          return [
            {
              role: 'assistant',
              content:
                'Welcome to ASSA AI Security Assistant (Demo Mode). Could not reach the AI service. Responses below are pre-recorded examples.',
              timestamp: new Date().toISOString(),
              simulated: true,
            },
          ];
        });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  function appendSimulatedResponse(query) {
    const response = SIMULATED_RESPONSES[query] || FALLBACK_RESPONSE;
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.text,
          timestamp: new Date().toISOString(),
          simulated: true,
        },
      ]);
      setIsTyping(false);
    }, response.delay);
  }

  async function handleSend(text) {
    const query = text || input.trim();
    if (!query || isTyping) return;

    const userMsg = { role: 'user', content: query, timestamp: new Date().toISOString() };
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    if (aiConfigured === false) {
      appendSimulatedResponse(query);
      return;
    }

    try {
      const { data } = await api.post('/admin/security-assistant/chat', { messages: history });
      if (data?.content) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.content,
            timestamp: new Date().toISOString(),
            model: data.model,
          },
        ]);
        setIsTyping(false);
        return;
      }
      appendSimulatedResponse(query);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) {
        setAiConfigured(false);
        appendSimulatedResponse(query);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I couldn't reach the AI service just now. Showing a cached analysis instead.",
          timestamp: new Date().toISOString(),
          error: true,
          simulated: true,
        },
      ]);
      appendSimulatedResponse(query);
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
        size="icon"
        aria-label="Open AI Security Assistant"
      >
        <Zap className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        'fixed z-50 shadow-2xl border-border/60 flex flex-col transition-all duration-200',
        isExpanded ? 'inset-4 sm:inset-8' : 'bottom-6 right-6 w-[420px] h-[560px]',
      )}
    >
      <CardHeader className="pb-2 shrink-0 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          ASSA AI Security Assistant
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] py-0',
              aiConfigured === false && 'border-warning text-warning',
              aiConfigured === true && 'border-success text-success',
            )}
          >
            {aiConfigured === null ? 'AI' : aiConfigured ? 'LIVE' : 'DEMO'}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)} aria-label="Close AI Security Assistant">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/80 text-foreground',
              )}
            >
              {msg.simulated && (
                <div className="text-[10px] text-warning font-medium mb-1">DEMO RESPONSE</div>
              )}
              <div className="whitespace-pre-wrap break-words ai-message-content">
                {msg.content.split('\n').map((line, j, arr) => (
                  <span key={j}>
                    {renderInlineMarkdown(line)}
                    {j < arr.length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isTyping && <TypingIndicator />}
      </div>

      <div className="shrink-0 border-t border-border p-3 space-y-2">
        <div className="flex gap-1 flex-wrap">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={isTyping}
              className="text-[11px] px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about threats, risks, mitigations..."
            className="text-sm"
            disabled={isTyping}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isTyping}
            className="shrink-0"
            aria-label="Send message"
          >
            {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </Card>
  );
}
