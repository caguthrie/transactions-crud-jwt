import express, { Request, Response } from "express";
import cors from "cors";
import compression from "compression"; // compresses requests
import bodyParser from "body-parser";
import lusca from "lusca";
import path from "path";
import expressValidator from "express-validator";
// Controllers (route handlers)
import * as transactionController from "./controllers/transaction";
import * as userController from "./controllers/user";
import * as processController from "./controllers/process";
import { validateJwtAndInjectUser } from "./services/userService";
import { validationResult } from "express-validator/check";
import { NextFunction } from "express-serve-static-core";

// Create Express server
const app = express();
app.use(cors());

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));

app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

// Transaction routes
app.get("/transaction/all", validateJwtAndInjectUser, transactionController.getAll);
app.get("/transaction/:id", validateJwtAndInjectUser, transactionController.get);
app.post("/transaction/create", transactionController.validateTransactionForCreation(), checkValidationResult, validateJwtAndInjectUser, transactionController.create);
app.put("/transaction/update", transactionController.validateTransactionForUpdate(), checkValidationResult, validateJwtAndInjectUser, transactionController.update);
app.delete("/transaction/:id", validateJwtAndInjectUser, transactionController.remove);

// User routes
app.post("/user/login", userController.validateLogin(), checkValidationResult, userController.login);
app.post("/user/create", userController.validateCreate(), checkValidationResult, userController.create);
app.get("/user/balance", validateJwtAndInjectUser, userController.getBalance);
app.post("/user/forgot-password", userController.forgotPassword);
app.post("/user/reset-password", userController.resetPassword);

// Process routes
app.post("/process", processController.process);

function checkValidationResult(req: Request, res: Response, next: NextFunction) {
    const result = validationResult(req);
    if (result.isEmpty()) {
        return next();
    }
    res.status(422).json({ errors: result.array() });
}

export default app;
