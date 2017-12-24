import * as crypto from 'crypto';

export class Block {
    index: number;
    timestamp: number;

    hash: string;
    phash: string;
    body: string;
    nonce: number;

    constructor(index: number, timestamp: number, phash: string, body: string) {
        this.index = index;
        this.timestamp = timestamp;
        this.phash = phash;
        this.body = body;
        this.nonce = 0;
        this.hash = Block.createHash(this);
    }

    static createHash(block: Block): string {
        return crypto
            .createHmac('sha256', '123qwe')
            .update(`${block.index}${block.phash}${block.timestamp}${block.body}${block.nonce}`)
            .digest('hex');
    }

    mine(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = Block.createHash(this);
        }
    }    
}