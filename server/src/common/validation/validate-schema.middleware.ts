
import { AnyZodObject, ZodError } from "zod";
import { RequestHandler } from "express";

export const validateSchema = (schema: AnyZodObject): RequestHandler => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                params: req.params,
                query: req.query,
                headers: req.headers,
            });
            return next();
        } catch (error) {
            if (error instanceof ZodError) {
                console.log("❌ Zod validation error. Check response.");
                res.status(400).json(
                    error.issues.map((issue) => ({
                        field: issue.path,
                        message: issue.message,
                    }))
                );
            } else {
                console.log("❌ Server Internal error. Check response.");
                res.status(500).json(error);
            }
        }
    };
};
