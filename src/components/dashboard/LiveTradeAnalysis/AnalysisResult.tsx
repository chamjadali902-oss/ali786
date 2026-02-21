import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Analysis, TimeframeSituation } from './types';
import { DECISION_COLOR, URGENCY_COLOR } from './types';

interface Props {
  analysis: Analysis;
}

const SITUATION_STATUS_COLOR: Record<string, string> = {
  BULLISH: 'text-bullish border-bullish/40 bg-bullish/10',
  BEARISH: 'text-bearish border-bearish/40 bg-bearish/10',
  MIXED: 'text-warning border-warning/40 bg-warning/10',
  NEUTRAL: 'text-muted-foreground border-border bg-muted/40',
};

function SituationRow({ item }: { item: TimeframeSituation }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-foreground">{item.title}</p>
        <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0', SITUATION_STATUS_COLOR[item.status] || SITUATION_STATUS_COLOR.NEUTRAL)}>
          {item.status}
        </Badge>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">{item.detail}</p>
    </div>
  );
}

export function AnalysisResult({ analysis }: Props) {
  return (
    <div className="space-y-3">
      <div className={cn('rounded-lg p-2.5 border', DECISION_COLOR[analysis.decision] || 'border-border')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold">{analysis.decision.replace('_', ' ')}</p>
            <p className="text-[10px] opacity-85">{analysis.currentBias} Bias • {analysis.confidence}% Confidence</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn('text-[8px]', URGENCY_COLOR[analysis.urgency] || '')}>
              {analysis.urgency} URGENCY
            </Badge>
            <Badge variant="outline" className="text-[8px]">Risk: {analysis.riskLevel}</Badge>
          </div>
        </div>
      </div>

      {analysis.warning && (
        <div className="flex items-start gap-1.5 p-2 rounded bg-bearish/10 border border-bearish/20">
          <AlertTriangle className="w-3 h-3 text-bearish shrink-0 mt-0.5" />
          <p className="text-[10px] text-bearish leading-relaxed">{analysis.warning}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card/60 p-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">AI Recommendation</p>
        <p className="mt-1 text-[10px] text-foreground leading-relaxed">{analysis.recommendation}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card/40 p-2">
          <p className="text-[8px] font-semibold text-muted-foreground uppercase">Short Term (1m-30m)</p>
          <p className="mt-1 text-[10px] text-foreground leading-relaxed">{analysis.shortTermOutlook}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-2">
          <p className="text-[8px] font-semibold text-muted-foreground uppercase">Long Term (1h-1d)</p>
          <p className="mt-1 text-[10px] text-foreground leading-relaxed">{analysis.longTermOutlook}</p>
        </div>
      </div>

      {analysis.situations && analysis.situations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Multi-timeframe Situations</p>
          <div className="space-y-1.5">
            {analysis.situations.map((item, idx) => (
              <SituationRow key={`${item.title}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 text-[9px]">
        <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-muted border border-border">
          <Shield className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-muted-foreground">Support:</span>
          <span className="font-mono">${analysis.keyLevels?.support?.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-muted border border-border">
          <Target className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-muted-foreground">Resistance:</span>
          <span className="font-mono">${analysis.keyLevels?.resistance?.toFixed(4)}</span>
        </div>
        {analysis.slSuggestion && (
          <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-bearish/10 border border-bearish/30">
            <span className="text-bearish">Suggested SL:</span>
            <span className="font-mono text-bearish">${analysis.slSuggestion.toFixed(4)}</span>
          </div>
        )}
        {analysis.tpSuggestion && (
          <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-bullish/10 border border-bullish/30">
            <span className="text-bullish">Suggested TP:</span>
            <span className="font-mono text-bullish">${analysis.tpSuggestion.toFixed(4)}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Why this decision</p>
        {analysis.reasons?.map((r, i) => (
          <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5 leading-relaxed">
            <CheckCircle2 className="mt-0.5 w-3 h-3 text-primary shrink-0" /> {r}
          </p>
        ))}
      </div>
    </div>
  );
}
