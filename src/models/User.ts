import bcrypt from "bcrypt-nodejs";
import crypto from "crypto";

export interface UserModel {
  name: string;
  email: string;
  passwordDigest: string;
  balance: number;
  [s: string]: any;
}
