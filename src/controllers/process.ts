import { Request, Response } from "express";
import { encrypt, decrypt } from "../services/cryptoService";
import { send } from "../services/emailService";
import { getByEmail } from "../services/userService";

export const process = async (req: Request, res: Response) => {
    try {
        const {input} = req.body as {input: string};
        const encrypted = encrypt(input);
        const result = decrypt(encrypted);
        const user = await getByEmail("sometest@gmail.com");
        await send(user, "Test test test!");
        res.status(200).json({result, encrypted});
    } catch (e) {
        res.status(500).json({error: e});
    }
};
