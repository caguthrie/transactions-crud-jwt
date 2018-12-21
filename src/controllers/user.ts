import { Request, Response } from "express";
import { body } from "express-validator/check";
import bcrypt from "bcrypt-nodejs";
import * as userService from "../services/userService";
import * as cryptoService from "../services/cryptoService";
import * as jwt from "jsonwebtoken";
import { datastore } from "../services/datastore";
import { DatastoreKey } from "@google-cloud/datastore/entity";
import { UserModel } from "../models/User";
import { cat } from "shelljs";

export let validateLogin = () => {
    return [
        body("email", "Please provide email").exists().isEmail(),
        body("password", "Please provide password").exists()
    ];
};

export const login = async (req: Request, res: Response) => {
    const {email, password} = req.body as UserModel;
    try {
        const user = await userService.getByEmail(email);
        const isPasswordCorrect = bcrypt.compareSync(password, user.passwordDigest);
        if (isPasswordCorrect) {
            const {id}: DatastoreKey = user[datastore.KEY as any];
            const token = jwt.sign({id}, process.env.JWT_SECRET, {
                expiresIn: "100d" // expires in 100 days
            });
            res.status(200).json({token});
        } else {
            res.status(401).json({message: "Incorrect password!"});
        }
    } catch (err) {
        res.status(500).json({message: "Unable to query database for user"});
    }
};

export let validateCreate = () => {
    return [
        ...validateLogin(),
        body("name", "Please provide email").exists(),
        body("balance", "Please provide password").exists(),
        body("userCreationPassword", "Please provide userCreationPassword").exists()
    ];
};

export const create = async (req: Request, res: Response) => {
    const {name, email, password, balance, userCreationPassword, recordsEmail, emailPassword} = req.body;
    try {
        const user = await userService.getByEmail(email);
        if (user) {
            res.status(409).json({message: `A user with the email address ${email} already exists!`});
        } else {
            if (bcrypt.compareSync(userCreationPassword, process.env.LOGIN_SECRET)) {
                await userService.create({
                    name,
                    email,
                    passwordDigest: bcrypt.hashSync(password), // One way encryption for password
                    balance,
                    // TODO need to add these properties to the front-end
                    recordsEmail,
                    emailPassword: cryptoService.encrypt(emailPassword) // Two way AES encryption for data at rest
                });
                res.sendStatus(200);
            } else {
                res.status(403).json({message: "Incorrect user creation password"});
            }
        }
    } catch (err) {
        res.status(500).json({message: "Unable to query database for user"});
    }
};

export const getBalance = async (req: Request, res: Response) => {
    try {
        const {id}: DatastoreKey = req.user[datastore.KEY as any];
        const user = await userService.get(id);
        res.status(200).json({balance: user.balance});
    } catch (error) {
        res.status(500).json({error});
    }
};
