import { datastore } from "./datastore";
import { UserModel } from "../models/User";
import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import { NextFunction } from "express-serve-static-core";

const UserScope = "User";

export function get(id: string): Promise<[object | undefined]> {
    const userKey = datastore.key([UserScope, parseInt(id)]);
    return datastore.get(userKey);
}

export function getByEmail(email: string): Promise<UserModel | undefined> {
    const query = datastore.createQuery(UserScope).filter("email", "=", email);
    return datastore.runQuery(query)
        .then(result => {
            if (result[0].length !== 1) {
                return undefined;
            } else {
                return result[0][0] as UserModel;
            }
        })
        .catch(err => {
            console.log(err);
            return new Promise(resolve => resolve);
        });
}

export const validateJwtAndInjectUser = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization;

    if (!token) {
        res.sendStatus(401);
    }

    if (token.startsWith("Bearer ")) {
        const slicedToken = token.slice(7, token.length);
        jwt.verify(slicedToken, process.env.JWT_SECRET, (err, decoded: any) => {
            if (err) {
                res.sendStatus(401);
            } else {
                get(decoded.id)
                    .then(user => {
                        if (user.length !== 1) {
                            res.sendStatus(500);
                        } else {
                            req.user = user[0] as UserModel;
                            next();
                        }
                    })
                    .catch( err => {
                        res.sendStatus(500);
                    });
            }
        });
        // Remove Bearer from string

    } else {
        res.sendStatus(401);
    }
};
