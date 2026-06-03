import { RequestHandler } from "express";

const asyncHandler = (requestHandler: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
