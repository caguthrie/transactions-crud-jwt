export interface Transaction {
    id?: number;
    description: string;
    price: number;
    userId: number;

    [s: string]: any;
}
