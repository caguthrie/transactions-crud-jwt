import sendGmail from "gmail-send";
import { UserModel } from "../models/User";
import { decrypt } from "./cryptoService";


export function send(user: UserModel, htmlBody: string): Promise<string> {
    return new Promise((resolve, reject) => {
        sendGmail({
            user: user.email,
            pass: decrypt(user.emailPassword),
            to: user.recordsEmail,
            subject: `Tix bill for ${user.name}`,
            html: htmlBody
        })({}, (err: string, res: string) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}
