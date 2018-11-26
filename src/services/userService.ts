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
        res.status(401).json({message: "Please provide bearer jwt with request"});
    }

    if (token.startsWith("Bearer ")) {
        // Remove Bearer from string
        const slicedToken = token.slice(7, token.length);
        jwt.verify(slicedToken, process.env.JWT_SECRET, (err, decoded: any) => {
            if (err) {
                res.status(401).json({message: "Token not valid! Please request a new token."});
            } else {
                get(decoded.id)
                    .then(user => {
                        if (user.length !== 1) {
                            res.status(500).json({message: `No user found with id ${decoded.id}`});
                        } else {
                            req.user = user[0] as UserModel;
                            next();
                        }
                    })
                    .catch( err => {
                        res.status(500).json({message: `Unable to query user with id ${decoded.id}`});
                    });
            }
        });
    } else {
        res.status(401).json({message: `Authorization header is not in 'Bearer {token}' format`});
    }
};
