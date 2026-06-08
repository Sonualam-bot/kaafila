/**
 * Module augmentation: teaches TypeScript that Express's Request can carry
 * a `userId`, which requireUser attaches. Without this, `req.userId` would
 * be a type error. Ambient declaration — no runtime effect.
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
export {};
