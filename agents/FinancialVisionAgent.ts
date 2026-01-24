import { UserFinancials, FinancialSnapshot, FinancialVisionOutput } from '@/types';
import { analyzeProductImage } from '@/lib/aiService';

export class FinancialVisionAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[FinancialVisionAgent] ${message}`);
  }

  async analyze(
    image: string,
    financials: UserFinancials,
    snapshot: FinancialSnapshot
  ): Promise<FinancialVisionOutput> {
    this.reasoningLog = [];
    this.log('Starting multimodal product analysis...');

    try {
      const analysis = await analyzeProductImage({
        image,
        monthlyDisposable: snapshot.disposableIncome,
        currentSavings: financials.savings,
      });

      this.log(`Identified: ${analysis.productName} (~$${analysis.estimatedCost})`);
      this.log(`Recommendation: ${analysis.recommendation}`);

      return {
        summary: `Analyzed ${analysis.productName}. Impact: ${analysis.budgetImpact}`,
        reasoning: analysis.reasoning,
        assumptions: [
          'Estimated cost is based on visual identification',
          'Purchase would come from disposable income or savings'
        ],
        whatWouldChange: [
          'If the item is on sale, the impact might be lower',
          'If this is a planned necessity, the score would be higher'
        ],
        timestamp: new Date().toISOString(),
        confidence: 0.88,
        analysis,
      };
    } catch (error) {
      this.log(`Analysis failed: ${error}`);
      throw error;
    }
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const financialVisionAgent = new FinancialVisionAgent();
