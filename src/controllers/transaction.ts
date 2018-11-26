import { Request, Response } from "express";
import * as transactionService from "./../services/transactionService";
import { Transaction } from "../models/Transaction";
import { body, validationResult, query } from "express-validator/check";

export let validateCreate = () => {
    return [
        body("description", "description doesn't exist").exists(),
        body("price", "Invalid price").exists()
    ];
};

/**
 * POST /transaction/create
 * Create a new transaction
 */
export let create = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
        const {description, price} = req.body as Transaction;
        transactionService.create({description, price, userId: 1});
        return res.status(200).json({result: "ok"});
    }
};


/**
 * GET /transaction/all
 * Get all transactions
 */
export let getAll = (req: Request, res: Response) => {
    transactionService.getAll().then((result) => {
        res.send(result);
    });
};

export let validateGet = () => {
    return [
        query("id", "Please provide id").exists().isNumeric()
    ];
};

export let get = (req: Request, res: Response) => {
    transactionService.getAll().then((result) => {
        res.send(result);
    });
};

