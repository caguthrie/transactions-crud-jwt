import { Transaction } from "../models/Transaction";
import { QueryResult } from "@google-cloud/datastore/query";
import { datastore } from "./datastore";
import { UserModel } from "../models/User";

const TransactionScope = "Transaction";

export function create(transaction: Transaction) {
    const transactionKey = datastore.key([TransactionScope]);
    const transactionRow = {
        key: transactionKey,
        data: transaction
    };

    // TODO better error handling
    datastore
        .save(transactionRow)
        .then(() => {
            console.log(`Saved ${transaction}`);
        })
        .catch(err => {
            console.error("ERROR:", err);
        });
}

export function update(transaction: Transaction) {
    const {id, userId, price, description} = transaction;
    const transactionKey = datastore.key([TransactionScope, id]);
    const transactionRow = {
        key: transactionKey,
        data: {
            description,
            price,
            userId
        }
    };

    // TODO better error handling
    datastore
        .update(transactionRow)
        .then(() => {
            console.log(`Updated ${transaction}`);
        })
        .catch(err => {
            console.error("ERROR:", err);
        });
}

export function remove(id: number) {
    const transactionKey = datastore.key([TransactionScope, id]);

    // TODO better error handling
    datastore
        .delete(transactionKey)
        .then(() => {
            console.log(`Deleted ${id}`);
        })
        .catch(err => {
            console.error("ERROR:", err);
        });
}

export function getAll(userId: number): Promise<QueryResult> {
    const query = datastore.createQuery(TransactionScope);
    query.filter("userId", "=", userId);
    return datastore.runQuery(query);
}

export function get(id: number): Promise<[object | undefined]> {
    const transactionKey = datastore.key([TransactionScope, id]);
    return datastore.get(transactionKey);
}
