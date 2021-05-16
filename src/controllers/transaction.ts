import { Request, Response } from "express";
import * as transactionService from "./../services/transactionService";
import { Transaction } from "../models/Transaction";
import { body } from "express-validator/check";
import { DatastoreKey } from "@google-cloud/datastore/entity";
import { datastore } from "../services/datastore";

export let validateTransactionForCreation = () => {
    return [
        body("description", "description doesn't exist").exists(),
        body("price", "Invalid price").exists()
    ];
};

/**
 * POST /transaction/create
 * Create a new transaction
 */
export const create = (req: Request, res: Response) => {
    const {description, price, processed = false} = req.body as Transaction;
    const {id}: DatastoreKey = req.user[datastore.KEY as any];
    transactionService.create({description, price, userId: parseInt(id), processed});
    return res.status(200).json({result: "ok"});
};

export let validateTransactionForUpdate = () => {
    return [
        ...validateTransactionForCreation(),
        body("userId", "Invalid userIid").exists(),
        body("id", "Invalid id").exists()
    ];
};

/**
 * PUT /transaction/update
 * Update a transaction
 */
export const update = (req: Request, res: Response) => {
    const {description, price, userId, id, processed = false} = req.body as Transaction;
    transactionService.update({description, price, userId, id, processed});
    // TODO error handling
    return res.status(200).json({result: "ok"});
};

/**
 * DELETE /transaction/:id
 * Delete a transaction
 */
export const remove = (req: Request, res: Response) => {
    const {id} = req.params;
    transactionService.remove(parseInt(id));
    return res.status(200).json({result: "ok"});
};


/**
 * GET /transaction/all
 * Get all transactions
 */
export let getAll = async (req: Request, res: Response) => {
    const {id}: DatastoreKey = req.user[datastore.KEY as any];
    const result = await transactionService.getAllUnprocessed(parseInt(id));
    const resp = result[0].map((entity: any) => {
        return {
            ...entity,
            id: entity[datastore.KEY].id
        };
    });
    res.send(resp);
};

/**
 * GET /transaction/:id
 * Get a transaction
 */
export let get = async (req: Request, res: Response) => {
    const {id} = req.params;
    try {
        const result: any = await transactionService.get(parseInt(id));
        if (!result[0]) {
            res.status(500).json({result: `No transaction found with id ${id}`});
        } else {
            res.status(200).json({
                ...result[0],
                id: result[0][datastore.KEY].id
            });
        }
    } catch (err) {
        res.status(500).json({message: `Failed to retrieve transaction with id ${id}`});
    }
};

