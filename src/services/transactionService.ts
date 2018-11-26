import { Transaction } from "../models/Transaction";
import { QueryResult } from "@google-cloud/datastore/query";
import { datastore } from "./datastore";


const TransactionScope = "Transaction";

export function create(transaction: Transaction) {
    const transactionKey = datastore.key([TransactionScope]);
    const transactionRow = {
        key: transactionKey,
        data: transaction
    };

    datastore
        .save(transactionRow)
        .then(() => {
            console.log(`Saved ${transaction}`);
        })
        .catch(err => {
            console.error("ERROR:", err);
        });
}

export function getAll(): Promise<QueryResult> {
    const query = datastore.createQuery(TransactionScope);

    return datastore.runQuery(query);
}

export function get(id: string): Promise<[object | undefined]> {
    const transactionKey = datastore.key([TransactionScope, id]);
    return datastore.get(transactionKey);
}
