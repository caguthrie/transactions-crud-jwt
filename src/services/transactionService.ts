import { Transaction } from "../models/Transaction";
import { QueryResult } from "@google-cloud/datastore/query";
import { datastore } from "./datastore";
import { formatMoney } from "../util/format";

const TransactionScope = "Transaction";

export async function create(transaction: Transaction) {
    const transactionKey = datastore.key([TransactionScope]);
    const transactionRow = {
        key: transactionKey,
        data: transaction
    };

    try {
        await datastore.save(transactionRow);
        console.log(`Saved: ${transaction.description}: ${formatMoney(transaction.price)}`);
    } catch (err) {
        // TODO better error handling
        console.error("ERROR:", err);
    }
}

export async function update(transaction: Transaction) {
    const {id, userId, price, description, processed} = transaction;
    // TODO fix this type stuff
    const transactionKey = datastore.key([TransactionScope, parseInt(id.toString())]);
    const transactionRow = {
        key: transactionKey,
        data: {
            description,
            price,
            userId,
            processed
        }
    };

    try {
        await datastore.update(transactionRow);
        console.log(`Updated ${description} to price ${price} and processed ${processed} for userId ${userId}`);
    } catch (err) {
        // TODO better error handling
        console.error("ERROR:", err);
    }
}

export async function remove(id: number) {
    const transactionKey = datastore.key([TransactionScope, id]);
    try {
        return await datastore.delete(transactionKey);
    } catch (err) {
        // TODO better error handling
        console.error(`ERROR unable to delete transaction with id ${id}:`, err);
    }
}

export async function getAllUnprocessed(userId: number): Promise<QueryResult> {
    const query = datastore.createQuery(TransactionScope);
    query
        .filter("userId", "=", userId)
        .filter("processed", "=", false);
    return datastore.runQuery(query);
}

export async function get(id: number): Promise<[object | undefined]> {
    const transactionKey = datastore.key([TransactionScope, id]);
    return datastore.get(transactionKey);
}
