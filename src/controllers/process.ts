import { Request, Response } from "express";
import { encrypt, decrypt } from "../services/cryptoService";
import { fetchUnreadMessages, parseMessages } from "../services/emailService";
import { getByEmail, get } from "../services/userService";
import * as transactionService from "../services/transactionService";
import { datastore } from "../services/datastore";
import { Transaction } from "../models/Transaction";

export const process = async (req: Request, res: Response) => {
    try {
        const {input} = req.body as {input: string};
        const encrypted = encrypt(input);
        const result = decrypt(encrypted);
        const user = await getByEmail("cgtixmailbox@gmail.com");
        const unreadMessages = await fetchUnreadMessages(user);
        const transactionsFromEmails = parseMessages(unreadMessages);
        // const [transactions] = (await transactionService.getAll(user[datastore.KEY as any])) as Transaction[][];
        console.log(transactionsFromEmails);
        res.status(200).json({result, encrypted});
    } catch (e) {
        res.status(500).json({error: e});
    }
};
