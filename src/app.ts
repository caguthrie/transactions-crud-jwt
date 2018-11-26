import express from "express";
import compression from "compression"; // compresses requests
import bodyParser from "body-parser";
import lusca from "lusca";
import dotenv from "dotenv";
import path from "path";
import expressValidator from "express-validator";
// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as transactionController from "./controllers/transaction";
import * as userController from "./controllers/user";
import { validateJwtAndInjectUser } from "./services/userService";


// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env.example" });


// Create Express server
const app = express();

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

/**
 * Primary app routes.
 */
app.get("/", homeController.index);

// Transaction routes
app.post("/transaction/create", transactionController.validateCreate(), validateJwtAndInjectUser, transactionController.create);
app.get("/transaction/all", validateJwtAndInjectUser, transactionController.getAll);

// User routes
app.post("/user/login", userController.validateLogin(), userController.login);

export default app;
