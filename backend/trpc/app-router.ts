import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { portfolioRouter } from "./routes/portfolio";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  portfolio: portfolioRouter,
});

export type AppRouter = typeof appRouter;
