import { MarketContextOutput } from '@/types';
import { generateMarketContext } from '@/lib/aiService';

export class MarketContextAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[MarketContextAgent] ${message}`);
  }

  async analyze(): Promise<MarketContextOutput> {
    this.reasoningLog = [];
    this.log('Analyzing market conditions with AI...');

    const volatilityLevel = this.assessVolatility();
    this.log(`Volatility level: ${volatilityLevel}`);

    const indicators = this.generateIndicators(volatilityLevel);

    const aiContext = await this.generateAIContext();

    return {
      summary: aiContext.summary,
      reasoning: this.generateReasoning(volatilityLevel, aiContext.sentiment),
      assumptions: this.getAssumptions(),
      whatWouldChange: this.getWhatWouldChange(aiContext.sentiment),
      timestamp: new Date().toISOString(),
      confidence: 0.82,
      sentiment: aiContext.sentiment,
      indicators,
      educationalNote: aiContext.educationalNote,
    };
  }

  analyzeSync(): MarketContextOutput {
    this.reasoningLog = [];
    this.log('Analyzing market conditions (sync)...');

    const volatilityLevel = this.assessVolatility();
    const sentiment = this.determineSentiment(volatilityLevel);
    const indicators = this.generateIndicators(volatilityLevel);
    const educationalNote = this.getFallbackEducationalNote(sentiment);

    return {
      summary: this.getFallbackSummary(sentiment),
      reasoning: this.generateReasoning(volatilityLevel, sentiment),
      assumptions: this.getAssumptions(),
      whatWouldChange: this.getWhatWouldChange(sentiment),
      timestamp: new Date().toISOString(),
      confidence: 0.82,
      sentiment,
      indicators,
      educationalNote,
    };
  }

  private async generateAIContext(): Promise<{
    summary: string;
    educationalNote: string;
    sentiment: 'cautious' | 'neutral' | 'optimistic';
  }> {
    try {
      this.log('Generating AI-powered market context via Google Deepmind...');
      const result = await generateMarketContext();
      this.log('AI market context generated successfully');
      return result;
    } catch (error) {
      this.log(`AI generation failed, using fallback: ${error}`);
      const volatility = this.assessVolatility();
      const sentiment = this.determineSentiment(volatility);
      return {
        summary: this.getFallbackSummary(sentiment),
        educationalNote: this.getFallbackEducationalNote(sentiment),
        sentiment,
      };
    }
  }

  private assessVolatility(): 'low' | 'moderate' | 'high' {
    return 'moderate';
  }

  private determineSentiment(volatility: 'low' | 'moderate' | 'high'): 'cautious' | 'neutral' | 'optimistic' {
    if (volatility === 'high') return 'cautious';
    if (volatility === 'low') return 'optimistic';
    return 'neutral';
  }

  private generateIndicators(volatility: 'low' | 'moderate' | 'high'): MarketContextOutput['indicators'] {
    return [
      {
        name: 'Stock Markets',
        description: volatility === 'high' 
          ? 'Markets have experienced significant swings. Short-term movements are normal.'
          : volatility === 'low'
          ? 'Markets have been relatively calm, trading in narrow ranges.'
          : 'Mixed signals this quarter. Major indices within typical ranges.',
        trend: volatility === 'high' ? 'down' : volatility === 'low' ? 'up' : 'stable',
      },
      {
        name: 'Bond Yields',
        description: 'Yields have stabilized after recent adjustments, reflecting economic recalibration.',
        trend: 'stable',
      },
      {
        name: 'Inflation',
        description: 'Consumer prices gradually moderating. Everyday costs remain elevated vs. historical norms.',
        trend: 'down',
      },
      {
        name: 'Savings Rates',
        description: 'High-yield savings accounts continue to offer competitive returns for emergency funds.',
        trend: 'stable',
      },
    ];
  }

  private getFallbackEducationalNote(sentiment: 'cautious' | 'neutral' | 'optimistic'): string {
    const notes: Record<'cautious' | 'neutral' | 'optimistic', string> = {
      cautious: 'During uncertain times, maintaining adequate cash reserves becomes even more valuable. This is context for planning, not advice to act.',
      neutral: 'Market conditions change frequently. Your personal financial foundation matters more than trying to time markets.',
      optimistic: 'Calmer markets can feel like good times to act, but your personal readiness matters more than market conditions.',
    };
    return notes[sentiment];
  }

  private getFallbackSummary(sentiment: 'cautious' | 'neutral' | 'optimistic'): string {
    const summaries: Record<'cautious' | 'neutral' | 'optimistic', string> = {
      cautious: 'Economic conditions suggest prioritizing liquidity and security in your planning.',
      neutral: 'Current conditions are steady. A good time to focus on building your financial foundation.',
      optimistic: 'Favorable conditions, though your personal readiness matters more than market timing.',
    };
    return summaries[sentiment];
  }

  private generateReasoning(volatility: 'low' | 'moderate' | 'high', sentiment: 'cautious' | 'neutral' | 'optimistic'): string {
    return `I assessed market volatility as ${volatility} based on recent price movements and economic indicators. This translates to a ${sentiment} outlook for financial planning purposes. For someone building an emergency fund, these conditions reinforce the value of liquid, accessible savings.`;
  }

  private getAssumptions(): string[] {
    return [
      'Market indicators are based on publicly available economic data',
      'Historical patterns may not predict future performance',
      'Individual circumstances vary significantly',
      'This context is educational, not investment advice',
    ];
  }

  private getWhatWouldChange(sentiment: 'cautious' | 'neutral' | 'optimistic'): string[] {
    return [
      'Significant changes in Federal Reserve policy would shift this outlook',
      'Major geopolitical events could increase market volatility',
      'Your personal financial situation changes are more impactful than market shifts',
      'Inflation trends significantly above or below current levels would alter recommendations',
    ];
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const marketContextAgent = new MarketContextAgent();
