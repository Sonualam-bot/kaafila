// Augment Express's Request type so `req.userId` is recognized across the app.
// It is populated by the authenticate middleware after a JWT is verified.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// This empty export turns the file into a module, which is what makes
// `declare global` valid here.
export {};
