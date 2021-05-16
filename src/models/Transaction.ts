export interface Transaction {
    id?: number;
    description: string;
    price: number;
    userId: number;
    processed: boolean;

    [s: string]: any;
}
