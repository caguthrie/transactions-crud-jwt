import { UserModel } from "../models/User";
import { decrypt } from "./cryptoService";
import Imap from "imap";
import { Transaction } from "../models/Transaction";

export function fetchUnreadMessages(user: UserModel): Promise<string[]> {
    const imap = new Imap({
        user: user.email,
        password: decrypt(user.emailPassword),
        host: "imap.gmail.com",
        port: 993,
        tls: true
    });

    return new Promise((resolve, reject) => {
        const messages: string[] = [];
        imap.once("ready", () => {
            imap.openBox("INBOX", true, () => {
                imap.search(["UNSEEN"], (err, results) => {
                    const f = imap.fetch(results, { bodies: ""});
                    f.on("message", (msg) => {
                        msg.on("body", (stream) => {
                            const chunks: string[] = [];
                            stream.on("data", (chunk: string) => {
                                chunks.push(chunk);
                            });

                            stream.on("end",  () => {
                                messages.push(chunks.join("\n"));
                            });
                        });
                    });
                    f.once("error", (err) => {
                        reject("Fetch error: " + err);
                    });
                    f.once("end", () => {
                        imap.end();
                    });
                });
            });
        });

        imap.once("error", (err: any) => {
            reject(err);
        });

        imap.once("end", () => {
            resolve(messages);
        });

        imap.connect();
    });
}

function parseTransactionFromCloakifyEmail(message: string): Transaction {
    const orderId = message.match(/\nOrder ID: (.*)\r/)[1];
    const event = message.match(/\nEvent: (.*)\r/)[1];
    const venue = message.match(/\nVenue: (.*)\r/)[1];
    const date = message.match(/\nEvent Date: (.*)\r/)[1];
    const time = message.match(/\nEvent Time: (.*)\r/)[1];
    const quantity = message.match(/\nQuantity: (.*)\r/)[1];
    const cost = message.match(/\nCost: \$(.*)\r/)[1];
    return {
        price: parseFloat(cost),
        description: `"${orderId} ${quantity}x ${event} @ ${venue} on ${date} ${time}`,
        userId: undefined
    };
}

function parseTransactionFromPaypalEmail(message: string): Transaction  {
    const result = Buffer.from(message.split("\r\n\r\n")[1], "base64").toString();
    const dollarAmountAsString = result.match(/sent you \$(.*)/)[1].split(" USD")[0].replace(",", "");
    return {
        price: -parseFloat(dollarAmountAsString),
        description: "PayPal",
        userId: undefined
    };
}

export function parseMessages(messages: string[]): Transaction[] {
    return messages.map(message => {
        try {
            const [_, fromAndBody] = message.split("\nFrom: ");
            const [__, from] = fromAndBody.match(/<(.*)>/);
            switch (from) {
                case "notify@cloakify.com":
                    return parseTransactionFromCloakifyEmail(fromAndBody);
                case "service@paypal.com":
                    return parseTransactionFromPaypalEmail(fromAndBody);
            }
        } catch {
            // TODO error handling
        }
    });
}
