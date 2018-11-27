import { Request, Response } from "express";
import * as transactionService from "./../services/transactionService";
import { Transaction } from "../models/Transaction";
import { body, validationResult, query } from "express-validator/check";
import Datastore = require("@google-cloud/datastore");
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        const {description, price} = req.body as Transaction;
        const {id}: DatastoreKey = req.user[datastore.KEY as any];
        transactionService.create({description, price, userId: parseInt(id)});
        return res.status(200).json({result: "ok"});
    }
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        const {description, price, userId, id} = req.body as Transaction;
        transactionService.update({description, price, userId, id});
        return res.status(200).json({result: "ok"});
    }
};

/**
 * DELETE /transaction/:id
 * Delete a transaction
 */
export const remove = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        const {id} = req.params;
        transactionService.remove(parseInt(id));
        return res.status(200).json({result: "ok"});
    }
};


/**
 * GET /transaction/all
 * Get all transactions
 */
export let getAll = async (req: Request, res: Response) => {
    const {id}: DatastoreKey = req.user[datastore.KEY as any];
    const result = await transactionService.getAll(parseInt(id));
    res.send(result);
};

/**
 * GET /transaction/:id
 * Get a transaction
 */
export let get = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
    } else {
        const {id} = req.params;
        try {
            const result = await transactionService.get(parseInt(id));
            if (!result[0]) {
                res.status(500).json({result: `No transaction found with id ${id}`});
            } else {
                res.status(200).json({result: result[0]});
            }
        } catch (err) {
            res.status(500).json({message: `Failed to retrieve transaction with id ${id}`});
        }
    }
};

