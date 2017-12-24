import { Block } from './block';
import * as fs from 'fs';

export class Blockchain {

    private key: string;
    private difficulty: number;
    private blockchain: Block[] = <Block[]>[];

    constructor(key: string) {
        this.key = key;
        this.difficulty = 5;
        this.blockchain.push(this.genesis());
        this.read();
    }

    add(body: string): Block {
        var block = this.next(body);
        if (this.push(block)) {
            console.log('Блок успешно добавлен!');
            return block;
        };

        console.log('Ошибка добавления блока');
        return null;
    }

    push(block: Block) {
        if (this.validateBlock(block, this.last())) {
            this.blockchain.push(block);

            console.log(block);
            this.save();
            return true;
        }

        return false;
    }

    genesis(): Block {
        return new Block(0, new Date(1990, 5, 15).getTime() / 1000, '0', '');
    }

    next(body: string): Block {
        var prev = this.last();
        var block = new Block(prev.index + 1, new Date().getTime() / 1000, prev.hash, body);
        console.log('Происходит майнинг добавляемого блока...');
        console.time('mine');
        block.mine(this.difficulty);
        console.timeEnd('mine');
        return block;
    }

    last(): Block {
        return this.blockchain[this.blockchain.length - 1];
    }

    validateBlock(next: Block, prev: Block): boolean {
        if (prev.index + 1 !== next.index) {
            console.log('неверный индекс');
            return false;
        } else if (prev.hash !== next.phash) {
            console.log('неверный хеш предыдущего блока');
            return false;
        } else if (Block.createHash(next) !== next.hash) {
            console.log('неверный хеш: ' + Block.createHash(next) + ' ' + next.hash);
            return false;
        }

        return true;
    }

    validateChain(blockchain: Block[]) {
        if (JSON.stringify(blockchain[0]) !== JSON.stringify(this.genesis())) {
            return false;
        }

        var tempBlocks = [blockchain[0]];
        for (var i = 1; i < blockchain.length; i++) {
            if (this.validateBlock(blockchain[i], tempBlocks[i - 1])) {
                tempBlocks.push(blockchain[i]);
            } else {
                return false;
            }
        }

        return true;
    }

    replace(blockchain: Block[]) {
        if (this.validateChain(blockchain) && blockchain.length > this.blockchain.length) {
            console.log('Принятый блокчейн является валидным. Происходит замена текущего блокчейна на принятый');
            this.blockchain = blockchain;
        } else {
            console.log('Принятый блокчейн не является валидным');
        }
    }

    json(): string {
        return JSON.stringify(this.blockchain);
    }

    read() {
        fs.readFile(`${this.key}.blockchain`, (error, data) => {
            if (error) {
                console.log(error);
                return;
            }

            if (!data) {
                return;
            }

            try {
                var result = <Block[]>JSON.parse(data.toString());
                this.replace(result);
            }
            catch (e) {
                console.log(e);
            }
        });
    }

    save() {
        fs.writeFile(`${this.key}.blockchain`, this.json(), error => {
            if (error) {
                console.log(error);
                return;
            }
        });
    }

    map(callback: (value: Block) => any) {
        return this.blockchain.map(callback);
    }
}