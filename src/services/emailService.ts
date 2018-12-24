import { UserModel } from "../models/User";
import { decrypt } from "./cryptoService";
import Imap from "imap";
import { Transaction } from "../models/Transaction";
import sendGmail from "gmail-send";
import { formatAndSortTransactions, formatMoney } from "../util/format";

export function fetchUnreadMessages(user: UserModel): Promise<Transaction[]> {
    const imap = new Imap({
        user: user.email,
        password: decrypt(user.emailPassword),
        host: "imap.gmail.com",
        port: 993,
        tls: true
    });

    return new Promise((resolve, reject) => {
        const transactions: Transaction[] = [];
        imap.once("ready", () => {
            imap.openBox("INBOX", false, () => {
                imap.search(["UNSEEN"], (err, results) => {
                    // If there are no messages, just return an email array
                    if (results.length === 0) {
                        resolve([]);
                    } else {
                        const f = imap.fetch(results, { bodies: ""});
                        f.on("message", (msg) => {
                            msg.on("body", (stream) => {
                                const chunks: string[] = [];
                                stream.on("data", (chunk: string) => {
                                    chunks.push(chunk);
                                });

                                stream.on("end",  () => {
                                    const message = chunks.join("\n");
                                    const transaction = parseMessage(message);
                                    if (transaction) {
                                        transactions.push(transaction);
                                    }
                                });
                            });
                        });
                        f.once("error", (err) => {
                            reject("Fetch error: " + err);
                        });
                        f.once("end", () => {
                            imap.setFlags(results, ["\\Seen"], (err) => {
                                if (err) {
                                    reject("Unable to mark messages as read");
                                }
                            });
                            imap.end();
                        });
                    }
                });
            });
        });

        imap.once("error", (err: any) => {
            reject(err);
        });

        imap.once("end", () => {
            resolve(transactions);
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
        description: `${orderId} ${quantity}x ${event} @ ${venue} on ${date} ${time}`,
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

export function parseMessage(message: string): Transaction {
    const [_, fromAndBody] = message.split("\nFrom: ");
    const [__, from] = fromAndBody.match(/<(.*)>/);
    switch (from) {
        case "notify@cloakify.com":
            return parseTransactionFromCloakifyEmail(fromAndBody);
        case "service@paypal.com":
            return parseTransactionFromPaypalEmail(fromAndBody);
        default:
            return undefined;
    }
}

export function sendBill(user: UserModel, transactions: Transaction[]): Promise<string> {
    const newBalance = user.balance + transactions.reduce((memo, t) => t.price + memo, 0);
    const emailBody = [
        `Previous balance: ${formatMoney(user.balance)}`,
        "",
        ...formatAndSortTransactions(transactions).map(t => `${t}`),
        "",
        newBalance > 0 ? `Total owed to ${user.name}: ${formatMoney(newBalance)}` : `Total ${user.name} owes: ${formatMoney(newBalance)}`
    ];
    return sendEmail(user, emailBody.join("<br>"), user.recordsEmail, `Tix bill for ${user.name}`);
}

export function sendEmail(user: UserModel, htmlBody: string, to: string, subject: string): Promise<string> {
    return new Promise((resolve, reject) => {
        sendGmail({
            user: user.email,
            pass: decrypt(user.emailPassword),
            to,
            subject,
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
