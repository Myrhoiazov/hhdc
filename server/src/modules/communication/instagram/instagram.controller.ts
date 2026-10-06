import { Request, Response } from "express";
import { env } from 'process';
// import axios from "axios";
import crypto from "crypto";
import { timingSafeEqualStrings } from "../../../common/utils/crypto";
import ApiError from "../../../common/errors/api-error";

const VERIFY_TOKEN = env.VERIFY_MARKER_SECRET || "myverifytoken123";


export const verifyRequestSignature = (req: Request, res: Response, buf: Buffer) => {
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) return;

    const hash = crypto
        .createHmac("sha256", process.env.APP_SECRET)
        .update(buf)
        .digest("hex");

    if (!timingSafeEqualStrings("sha256=" + hash, signature)) {
        throw new ApiError(401, "Invalid signature.");
    }
}

// ------------------------
// 1) VERIFY WEBHOOK (GET)
// ------------------------

interface IGVerifyQuery {
    "hub.mode"?: string;
    "hub.verify_token"?: string;
    "hub.challenge"?: string;
}

export const instagramWebhookController = async (req: Request<{}, {}, {}, IGVerifyQuery>, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token && timingSafeEqualStrings(token, VERIFY_TOKEN)) {
        return res.status(200).send(Number(challenge));
    }

    return res.sendStatus(403);
}


interface IGMessageChange {
    field: string;
    value: any;
}

interface IGEntry {
    id: string;
    time: number;
    messaging?: any[];
    changes?: IGMessageChange[];
}

interface IGWebhookBody {
    entry?: IGEntry[];
}
const handleFollowerChange = (change: IGMessageChange) => {
    const followerId = change.value?.user_id;

    if (followerId) {
        console.log("followerId: ", followerId);
        // await sendMessage(followerId, "Привет! Спасибо за подписку 🙌");
    }
};

const handleIncomingMessage = (change: IGMessageChange) => {
    const message = change.value;

    console.log("🔥 New message from user:", message);

    const senderId = message.from?.id;
    const text = message.text;

    if (senderId) {
        console.log("Sender ID:", senderId);
        console.log("Message text:", text);

        // Отправляем автоответ
        // await instagramSendMessage(senderId, "Спасибо за сообщение! ❤️");
    }
};

const handleIncomingComment = (change: IGMessageChange) => {
    const comment = change.value;

    const userId = comment.from?.id;
    const username = comment.from?.username;
    const text = comment.text;
    const mediaId = comment.media_id;
    const commentId = comment.comment_id;

    console.log("💬 Новый комментарий!");
    console.log("Автор:", username, "ID:", userId);
    console.log("Комментарий:", text);
    console.log("Пост ID:", mediaId);
    console.log("Комментарий ID:", commentId);

    // 👇 Авто-ответ на комментарий (если хочешь)
    // await instagramReplyToComment(commentId, "Спасибо за ваш комментарий! ❤️");
};
// ------------------------
// 2) RECEIVE MESSAGES (POST)
// ------------------------
export const instagramReceiveMessageController = async (req: Request<{}, {}, IGWebhookBody>, res: Response) => {
    console.log("📩 IG Webhook received:", JSON.stringify(req.body, null, 2));

    const body = req.body;

    try {
        const entry = body.entry?.[0];
        const changes = entry.changes?.[0];
        console.log("entry: ", entry);
        console.log("changes: ", changes);

        // Новый подписчик
        if (changes?.field === "followers") {
            handleFollowerChange(changes);
        }

        if (changes?.field === "messages") {
            handleIncomingMessage(changes);
        }

        if (changes?.field === "comments") {
            handleIncomingComment(changes);
        }

    } catch (e) {
        console.error("Webhook error", e);
    }

    res.sendStatus(200);
}

// async function sendMessage(userId, text) {
//   try {
//     await axios.post(
//       `https://graph.facebook.com/v20.0/me/messages`,
//       {
//         recipient: { id: userId },
//         message: { text }
//       },
//       {
//         params: { access_token: PAGE_ACCESS_TOKEN }
//       }
//     );
//   } catch (e) {
//     console.error("Error sending message:", e.response?.data || e);
//   }
// }
