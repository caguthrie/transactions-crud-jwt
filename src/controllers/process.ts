import { Request, Response } from "express";
import { fetchUnreadMessages, sendBill } from "../services/emailService";
import { getAll, update } from "../services/userService";
import * as transactionService from "../services/transactionService";
import { datastore } from "../services/datastore";
import { Transaction } from "../models/Transaction";

export const process = async (req: Request, res: Response) => {
    try {
        const users = await getAll();
        users.forEach(async (user) => {
            const transactionsFromEmails = await fetchUnreadMessages(user);
            const userKey = user[datastore.KEY as any];
            const [transactionsFromDB] = (await transactionService.getAll(parseInt(userKey.id))) as Transaction[][];
            const transactionsToProcess = [...transactionsFromEmails, ...transactionsFromDB];
            if (transactionsToProcess.length > 0) {
                await sendBill(user, transactionsToProcess);
                // Remove all transactions in db
                transactionsFromDB.forEach(t => transactionService.remove(parseInt(t[datastore.KEY as any].id)));
                update({...user, balance: user.balance + transactionsToProcess.reduce((memo, t) => t.price + memo, 0)});
                console.log(`Processed ${transactionsToProcess.length} transactions for ${user.name}`);
            } else {
                console.log(`No messages to process for ${user.name}`);
            }
        });
        res.status(200).json({message: "Success!"});
    } catch (error) {
        res.status(500).json({error});
    }
};
