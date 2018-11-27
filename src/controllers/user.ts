import { Request, Response } from "express";
import { body } from "express-validator/check";
import bcrypt from "bcrypt-nodejs";
import * as userService from "../services/userService";
import * as jwt from "jsonwebtoken";
import { datastore } from "../services/datastore";
import { DatastoreKey } from "@google-cloud/datastore/entity";

export let validateLogin = () => {
    return [
        body("email", "Please provide email").exists().isEmail(),
        body("password", "Please provide password").exists()
    ];
};

export let login = async (req: Request, res: Response) => {
    const {email, password} = req.body;
    try {
        const user = await userService.getByEmail(email);
        const isPasswordCorrect = bcrypt.compareSync(password, user.passwordDigest);
        if (isPasswordCorrect) {
            const {id}: DatastoreKey = user[datastore.KEY as any];
            const token = jwt.sign({id}, process.env.JWT_SECRET, {
                expiresIn: "100d" // expires in 100 days
            });
            res.send(token);
        } else {
            res.sendStatus(401);
        }
    } catch (err) {
        res.sendStatus(500);
    }
};
