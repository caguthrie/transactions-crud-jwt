import { Request, Response } from "express";
import { fetchUnreadMessages, sendBill } from "../services/emailService";
import { getAll, update } from "../services/userService";
import * as transactionService from "../services/transactionService";
import { datastore } from "../services/datastore";
import { Transaction } from "../models/Transaction";

export const process = async (req: Request, res: Response) => {
    if (!req.header("X-Appengine-Cron")) {
        console.error("This request did not originate from Google Cron and is disallowed");
        res.status(412).json({message: "This request did not originate from Google Cron and is disallowed"});
        return;
    }
    try {
        const users = await getAll();
        for (const user of users) {
            console.log(`Starting processing bill for ${user.name}`);
            try {
                const transactionsFromEmails = await fetchUnreadMessages(user);
                const userKey = user[datastore.KEY as any];
                const [transactionsFromDB] = (await transactionService.getAll(parseInt(userKey.id))) as Transaction[][];
                const transactionsToProcess = [...transactionsFromEmails, ...transactionsFromDB];
                if (transactionsToProcess.length > 0) {
                    console.log(`Trying to send bill for ${user.name}`);
                    await sendBill(user, transactionsToProcess);
                    // Remove all transactions in db
                    for (const t of transactionsFromDB) {
                        console.log(`Deleting: ${t.description} for ${user.name}`);
                        await transactionService.remove(parseInt(t[datastore.KEY as any].id));
                    }
                    const newTransactionsSum = transactionsToProcess.reduce((memo, t) => t.price + memo, 0);
                    console.log(`Changing user ${user.name}'s balance from ${user.balance} to ${user.balance + newTransactionsSum}`);
                    await update({...user, balance: user.balance + newTransactionsSum});
                    console.log(`Processed ${transactionsToProcess.length} transactions for ${user.name}`);
                } else {
                    console.log(`No messages to process for ${user.name}`);
                }
            } catch (error) {
                console.error(`Error occurred while processing ${user.name}.`, error);
                res.status(500).json({error});
            }
        }
        console.log("Done with all users!");
        res.status(200).json({message: "Success!"});
    } catch (error) {
        console.error("Failed to get users", error);
        res.status(500).json({error});
    }
};
