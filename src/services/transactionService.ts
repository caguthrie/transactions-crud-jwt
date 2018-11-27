import { Transaction } from "../models/Transaction";
import { QueryResult } from "@google-cloud/datastore/query";
import { datastore } from "./datastore";

const TransactionScope = "Transaction";

export async function create(transaction: Transaction) {
    const transactionKey = datastore.key([TransactionScope]);
    const transactionRow = {
        key: transactionKey,
        data: transaction
    };

    try {
        await datastore.save(transactionRow);
        console.log(`Saved ${transaction}`);
    } catch (err) {
        // TODO better error handling
        console.error("ERROR:", err);
    }
}

export async function update(transaction: Transaction) {
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

    try {
        await datastore.update(transactionRow);
        console.log(`Updated ${transaction}`);
    } catch (err) {
        // TODO better error handling
        console.error("ERROR:", err);
    }
}

export async function remove(id: number) {
    const transactionKey = datastore.key([TransactionScope, id]);
    try {
        await datastore.delete(transactionKey);
        console.log(`Deleted ${id}`);
    } catch (err) {
        // TODO better error handling
        console.error("ERROR:", err);
    }
}

export async function getAll(userId: number): Promise<QueryResult> {
    const query = datastore.createQuery(TransactionScope);
    query.filter("userId", "=", userId);
    return datastore.runQuery(query);
}

export async function get(id: number): Promise<[object | undefined]> {
    const transactionKey = datastore.key([TransactionScope, id]);
    return datastore.get(transactionKey);
}
