import { Request, Response } from "express";
import { fetchUnreadMessages, sendBill } from "../services/emailService";
import { getAll, update } from "../services/userService";
import * as transactionService from "../services/transactionService";
import { datastore } from "../services/datastore";
import { Transaction } from "../models/Transaction";

export const process = async (req: Request, res: Response) => {
    try {
        const users = await getAll();
        // TODO instead of dealing with promises inside an async function, might be cleaner to do a regular for loop ...
        const results = users.map((user) => {
            return new Promise(async (resolve, reject) => {
                try {
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
                        resolve();
                    } else {
                        console.log(`No messages to process for ${user.name}`);
                        resolve();
                    }
                } catch (error) {
                    console.error(`Error occurred while processing ${user.name}.`, error);
                    reject();
                }
            });
        });
        Promise.all(results)
            .then(results => {
                console.log("Done!");
                res.status(200).json({message: "Success!"});
            })
            .catch(error => {
                res.status(500).json({error});
            });
    } catch (error) {
        console.error("Failed to get users", error);
        res.status(500).json({error});
    }
};
