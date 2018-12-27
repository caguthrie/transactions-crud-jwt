import { datastore } from "./datastore";
import { UserModel } from "../models/User";
import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { NextFunction } from "express-serve-static-core";
import { sendEmail } from "./emailService";
import { encrypt } from "./cryptoService";
import uuid from "uuid/v4";

const UserScope = "User";

export async function get(id: string): Promise<UserModel> {
    const userKey = datastore.key([UserScope, parseInt(id)]);
    const result = await datastore.get(userKey);
    return result[0] as UserModel;
}

export async function getAll(): Promise<UserModel[]> {
    const query = datastore.createQuery(UserScope);
    try {
        const result = await datastore.runQuery(query);
        if (result[0].length === 0) {
            console.log("No users found");
            return [];
        } else {
            return result[0] as UserModel[];
        }
    } catch (err) {
        console.log(err);
        return [];
    }
}

export async function getByEmail(email: string): Promise<UserModel | undefined> {
    const query = datastore.createQuery(UserScope).filter("email", "=", email);
    try {
        const result = await datastore.runQuery(query);
        if (result[0].length !== 1) {
            return undefined;
        } else {
            return result[0][0] as UserModel;
        }
    } catch (err) {
        console.log(err);
        return undefined;
    }
}

export async function create(user: UserModel) {
    const userKey = datastore.key([UserScope]);
    const userRow = {
        key: userKey,
        data: user
    };
    try {
        await datastore.save(userRow);
        console.log(`Saved new user ${user}`);
    } catch (e) {
        console.error(e);
        console.error(`Error saving new user ${user}`);
    }
}

export async function update(user: UserModel) {
    const {name, email, balance, emailPassword, recordsEmail, passwordDigest, forgotPasswordToken} = user;
    const userKey = datastore.key([UserScope, parseInt(user[datastore.KEY as any].id)]);
    const userRow = {
        key: userKey,
        data: {
            name,
            email,
            balance: Math.round(balance * 100) / 100,
            emailPassword,
            recordsEmail,
            passwordDigest,
            forgotPasswordToken
        }
    };

    const result = await datastore.update(userRow);
    console.log(`Updated ${user.name}'s user profile`);
    return result;
}

export const validateJwtAndInjectUser = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({message: "Please provide bearer jwt with request"});
    }

    if (authHeader.startsWith("Bearer ")) {
        // Remove Bearer from string
        const token = authHeader.slice(7, authHeader.length);
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded: any) => {
            if (err) {
                res.status(401).json({message: "Token not valid! Please request a new authHeader."});
            } else {
                try {
                    const user = await get(decoded.id);
                    if (!user) {
                        res.status(500).json({message: `No user found with id ${decoded.id}`});
                    } else {
                        req.user = user;
                        next();
                    }
                } catch (err) {
                    res.status(500).json({message: `Unable to query user with id ${decoded.id}`});
                }
            }
        });
    } else {
        res.status(401).json({message: `Authorization header is not in 'Bearer {token}' format`});
    }
};

export async function sendForgotPasswordEmailForUser(user: UserModel): Promise<boolean> {
    const forgotPasswordToken = uuid();
    try {
        await update({...user, forgotPasswordToken});
        const message: string = `Please follow this <a href="https://storage.googleapis.com/ta2-transactions-ui/build/index.html?email=${user.email}&token=${forgotPasswordToken}#change-password">link</a> to finish changing your password.  Your login is ${user.email}`;
        await sendEmail(user, message, [user.email, user.recordsEmail], "Change your password for transactions accountant");
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
