import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';

// Schema definitions
const FinancialsSchema = z.object({
  monthlyIncome: z.number(),
  housingCost: z.number(),
  carCost: z.number(),
  essentialsCost: z.number(),
  savings: z.number(),
  debts: z.number(),
  emergencyGoal: z.number().optional(),
});

const GoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  deadline: z.string().optional(),
  category: z.enum(['emergency', 'savings', 'debt', 'purchase', 'other']),
  isActive: z.boolean(),
});

const CoachMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['daily', 'purchase', 'investment', 'milestone', 'tip']),
  content: z.string(),
  timestamp: z.number(),
  read: z.boolean(),
});

// In-memory storage for demo mode (when Firebase not configured)
const demoStorage: Record<string, {
  financials?: z.infer<typeof FinancialsSchema>;
  goals?: z.infer<typeof GoalSchema>[];
  completedLessons?: string[];
  coachMessages?: z.infer<typeof CoachMessageSchema>[];
}> = {};

export const userRouter = createTRPCRouter({
  // === FINANCIALS ===
  getFinancials: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return demoStorage[input.userId]?.financials || null;
    }),

  saveFinancials: publicProcedure
    .input(z.object({
      userId: z.string(),
      financials: FinancialsSchema,
    }))
    .mutation(({ input }) => {
      if (!demoStorage[input.userId]) {
        demoStorage[input.userId] = {};
      }
      demoStorage[input.userId].financials = input.financials;
      return { success: true };
    }),

  // === GOALS ===
  getGoals: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return demoStorage[input.userId]?.goals || [];
    }),

  saveGoals: publicProcedure
    .input(z.object({
      userId: z.string(),
      goals: z.array(GoalSchema),
    }))
    .mutation(({ input }) => {
      if (!demoStorage[input.userId]) {
        demoStorage[input.userId] = {};
      }
      demoStorage[input.userId].goals = input.goals;
      return { success: true };
    }),

  updateGoalProgress: publicProcedure
    .input(z.object({
      userId: z.string(),
      goalId: z.string(),
      currentAmount: z.number(),
    }))
    .mutation(({ input }) => {
      const goals = demoStorage[input.userId]?.goals || [];
      const goalIndex = goals.findIndex(g => g.id === input.goalId);
      if (goalIndex >= 0) {
        goals[goalIndex].currentAmount = input.currentAmount;
        demoStorage[input.userId].goals = goals;
        return { success: true, goal: goals[goalIndex] };
      }
      return { success: false, error: 'Goal not found' };
    }),

  // === LEARNING PROGRESS ===
  getCompletedLessons: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return demoStorage[input.userId]?.completedLessons || [];
    }),

  markLessonComplete: publicProcedure
    .input(z.object({
      userId: z.string(),
      lessonId: z.string(),
    }))
    .mutation(({ input }) => {
      if (!demoStorage[input.userId]) {
        demoStorage[input.userId] = {};
      }
      const completed = demoStorage[input.userId].completedLessons || [];
      if (!completed.includes(input.lessonId)) {
        completed.push(input.lessonId);
        demoStorage[input.userId].completedLessons = completed;
      }
      return { success: true, completedLessons: completed };
    }),

  markLessonIncomplete: publicProcedure
    .input(z.object({
      userId: z.string(),
      lessonId: z.string(),
    }))
    .mutation(({ input }) => {
      if (!demoStorage[input.userId]) {
        demoStorage[input.userId] = {};
      }
      const completed = demoStorage[input.userId].completedLessons || [];
      demoStorage[input.userId].completedLessons = completed.filter(id => id !== input.lessonId);
      return { success: true, completedLessons: demoStorage[input.userId].completedLessons };
    }),

  // === COACH MESSAGES ===
  getCoachMessages: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return demoStorage[input.userId]?.coachMessages || [];
    }),

  addCoachMessage: publicProcedure
    .input(z.object({
      userId: z.string(),
      message: CoachMessageSchema,
    }))
    .mutation(({ input }) => {
      if (!demoStorage[input.userId]) {
        demoStorage[input.userId] = {};
      }
      const messages = demoStorage[input.userId].coachMessages || [];
      messages.push(input.message);
      demoStorage[input.userId].coachMessages = messages;
      return { success: true, messages };
    }),

  markMessageRead: publicProcedure
    .input(z.object({
      userId: z.string(),
      messageId: z.string(),
    }))
    .mutation(({ input }) => {
      const messages = demoStorage[input.userId]?.coachMessages || [];
      const msgIndex = messages.findIndex(m => m.id === input.messageId);
      if (msgIndex >= 0) {
        messages[msgIndex].read = true;
        return { success: true };
      }
      return { success: false };
    }),

  // === FULL DATA SYNC ===
  syncAllData: publicProcedure
    .input(z.object({
      userId: z.string(),
      data: z.object({
        financials: FinancialsSchema.optional(),
        goals: z.array(GoalSchema).optional(),
        completedLessons: z.array(z.string()).optional(),
        coachMessages: z.array(CoachMessageSchema).optional(),
      }),
    }))
    .mutation(({ input }) => {
      demoStorage[input.userId] = {
        ...demoStorage[input.userId],
        ...input.data,
      };
      return { success: true };
    }),

  getAllData: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return demoStorage[input.userId] || {};
    }),
});
