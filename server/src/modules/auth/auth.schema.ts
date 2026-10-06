import { z } from "zod";

const loginBodySchema = z.object({
    email: z.string().email({
        message: "Write a correct email address",
    }),
    password: z.string().min(1).max(128),
    captchaToken: z.string().min(1).max(4096).optional(),
});

export const loginSchema = z.object({ body: loginBodySchema });

export type loginType = z.infer<typeof loginBodySchema>;

const twoFactorVerifyBodySchema = z.object({
    code: z.string().regex(/^\d{6}$/, { message: "Код должен состоять из 6 цифр" }),
    trustDevice: z.boolean().optional(),
});

export const twoFactorVerifySchema = z.object({ body: twoFactorVerifyBodySchema });

export type twoFactorVerifyType = z.infer<typeof twoFactorVerifyBodySchema>;
