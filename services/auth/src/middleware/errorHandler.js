const errorHandler = (err, req, res, next) => {
    console.error(err);

    const statusCode = err.statusCode || 500;
    // Don't leak internal error details to the client on unexpected (500) errors.
    // The real error is logged above (console.error); the client gets a generic message.
    const message = statusCode === 500 ? "Something went wrong" : err.message;

    res.status(statusCode).json({
        success: false,
        message,
        errors: err.errors,
    });
};

export { errorHandler };
