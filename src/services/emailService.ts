import { UserModel } from "../models/User";
import { decrypt } from "./cryptoService";
import Imap from "imap";
import { Transaction } from "../models/Transaction";
import sendGmail from "gmail-send";
import { formatAndSortTransactions, formatMoney } from "../util/format";
import mimelib from "mimelib";

export function attemptImapLogin(email: string, password: string) {
    return new Imap({
        user: email,
        password,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        authTimeout: 20000
    });
}

export function fetchUnreadMessages(user: UserModel): Promise<Transaction[]> {
    const imap = attemptImapLogin(user.email, decrypt(user.emailPassword));

    return new Promise((resolve, reject) => {
        const transactions: Transaction[] = [];
        imap.once("ready", () => {
            imap.openBox("INBOX", false, () => {
                imap.search(["UNSEEN"], (err, results) => {
                    console.log(`Found ${results.length} unread messages`);
                    // If there are no messages, just return an email array
                    if (results.length === 0) {
                        resolve([]);
                    } else {
                        const f = imap.fetch(results, { bodies: ""});
                        f.on("message", (msg) => {
                            console.log("found message");
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
                            console.log("Marking unread emails to read");
                            imap.setFlags(results, ["\\Seen"], (err) => {
                                if (err) {
                                    reject("Unable to mark messages as read");
                                }
                            });
                            imap.end();
                            transactions.forEach(t => console.log(`Found: ${t.description}`));
                            resolve(transactions);
                        });
                    }
                });
            });
        });

        imap.once("error", (err: any) => {
            reject(err);
        });

        imap.connect();
    });
}

function parseTransactionFromCloakifyEmail(message: string): Transaction {
    try {
        const orderId = message.match(/\nOrder ID: (.*)\r/)[1];
        const event = message.match(/\nEvent: (.*)\r/)[1];
        const venue = message.match(/\nVenue: (.*)\r/)[1];
        const date = message.match(/\nEvent Date: (.*)\r/) ? message.match(/\nEvent Date: (.*)\r/)[1] : "Unknown";
        const time = message.match(/\nEvent Time: (.*)\r/)[1];
        const quantity = message.match(/\nQuantity: (.*)\r/)[1];
        const cost = message.match(/\nCost: \$(.*)\r/)[1];
        const description = `${orderId} ${quantity}x ${event} @ ${venue} on ${date} ${time}`;
        console.log(`Parsed email: ${description}`);
        return {
            price: parseFloat(cost),
            description,
            userId: undefined
        };
    } catch (e) {
        console.error("Unable to parse message!");
        console.error(message);
        console.error(e);
        return undefined;
    }
}

function parseTransactionFromPaypalEmail(message: string): Transaction  {
    const result = Buffer.from(message.split("\r\n\r\n")[1], "base64").toString();
    const dollarAmountAsString = result.match(/sent you \$(.*)/)[1].split(" USD")[0].replace(",", "");
    const price =  -parseFloat(dollarAmountAsString);
    console.log(`Parsed paypal ${price}`);
    return {
        price,
        description: "PayPal",
        userId: undefined
    };
}

function parseTransactionFromZelleEmail(message: string): Transaction  {
    const dollarAmountAsString = mimelib.decodeQuotedPrintable(message).match(/<b>Amount:<\/b> \$(.*)/)[1].split(" (USD")[0].replace(",", "");
    const price =  -parseFloat(dollarAmountAsString);
    console.log(`Parsed zelle ${price}`);
    return {
        price,
        description: "Zelle",
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
        case "no-reply@alertsp.chase.com":
            return parseTransactionFromZelleEmail(fromAndBody);
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

export function sendEmail(user: UserModel, htmlBody: string, to: string | string[], subject: string): Promise<string> {
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
