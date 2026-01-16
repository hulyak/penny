import { MarketContext, AgentInsight } from '@/types';

export class MarketContextAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[MarketContextAgent] ${message}`);
  }

  generateMarketContext(): MarketContext {
    this.reasoningLog = [];
    this.log('Analyzing current market conditions...');

    const volatilityLevel = this.assessVolatility();
    this.log(`Volatility assessment: ${volatilityLevel}`);

    const sentiment = this.determineSentiment(volatilityLevel);
    this.log(`Overall sentiment determined: ${sentiment}`);

    this.log('Generating educational descriptions for each asset class...');

    return {
      overallSentiment: sentiment,
      stocksDescription: this.getStocksDescription(volatilityLevel),
      bondsDescription: this.getBondsDescription(),
      inflationDescription: this.getInflationDescription(),
      goldDescription: this.getGoldDescription(),
      lastUpdated: new Date().toISOString(),
      educationalNote: this.getEducationalNote(sentiment),
    };
  }

  private assessVolatility(): 'low' | 'moderate' | 'high' {
    const scenarios: ('low' | 'moderate' | 'high')[] = ['low', 'moderate', 'high'];
    return scenarios[1];
  }

  private determineSentiment(volatility: string): MarketContext['overallSentiment'] {
    if (volatility === 'high') return 'cautious';
    if (volatility === 'low') return 'optimistic';
    return 'neutral';
  }

  private getStocksDescription(volatility: string): string {
    const descriptions = {
      low: 'Stock markets have been relatively calm, trading in narrow ranges. This often indicates a period of consolidation.',
      moderate: 'Markets have shown mixed signals this quarter. Major indices are trading within typical ranges with moderate volatility.',
      high: 'Markets have experienced significant swings recently. This is a reminder that short-term movements are normal, even if uncomfortable.',
    };
    return descriptions[volatility as keyof typeof descriptions] || descriptions.moderate;
  }

  private getBondsDescription(): string {
    return 'Bond yields have stabilized after recent adjustments. This typically reflects a period of economic recalibration.';
  }

  private getInflationDescription(): string {
    return 'Consumer prices have been gradually moderating. Everyday costs for groceries and services remain elevated compared to historical norms.';
  }

  private getGoldDescription(): string {
    return 'Precious metals have maintained steady value, often seen as a reflection of global economic uncertainty.';
  }

  private getEducationalNote(sentiment: MarketContext['overallSentiment']): string {
    const notes = {
      cautious: 'During uncertain times, maintaining adequate cash reserves becomes even more valuable. This is not advice to act, but context for your planning.',
      neutral: 'Market conditions change frequently. Understanding these patterns can help you think about timing for major financial decisions, but they should not drive day-to-day choices.',
      optimistic: 'Calmer markets can feel like good times to take action, but your personal financial foundation matters more than market conditions.',
    };
    return notes[sentiment];
  }

  generateInsight(context: MarketContext): AgentInsight {
    const sentimentText = {
      cautious: 'suggests this is a reasonable time to prioritize security and liquidity',
      neutral: 'suggests this is a reasonable time to focus on building savings rather than rushing into market exposure',
      optimistic: 'appears favorable, though your personal readiness matters more than market timing',
    };

    return {
      id: `mc-${Date.now()}`,
      agentName: 'Market Context',
      agentType: 'market-context',
      timestamp: new Date().toISOString(),
      title: 'Economic Context Refreshed',
      message: `Current economic conditions ${sentimentText[context.overallSentiment]}.`,
      reasoning: `Market volatility indicators are ${context.overallSentiment === 'cautious' ? 'elevated' : context.overallSentiment === 'neutral' ? 'moderate' : 'subdued'}. For someone building an emergency fund, this environment reinforces the value of liquid savings. No action required on your part.`,
      confidence: 0.87,
      icon: 'trending-up',
    };
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const marketContextAgent = new MarketContextAgent();
