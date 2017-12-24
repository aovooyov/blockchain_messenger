
import * as WebSocket from 'ws';
import * as express from 'express';
import * as net from 'net';
import * as bodyParser from 'body-parser';
import { Blockchain } from './blockchain';

enum Type {
    Latest = 0,
    All = 1,
    Blockchain = 2
};

export class Server {

    private sockets: any[];
    private blockchain: Blockchain;
    private debug: boolean = true;

    public httpPort: number;

    get address(): string {
        return `http://localhost:${this.httpPort}`;
    }
    
    constructor(
        private key: string, 
        private p2pHost: string, 
        private p2pPort: number) {

        this.httpPort = this.randomPort(3000, 3999);
        this.sockets = [];
        this.blockchain = new Blockchain(key);
    }

    randomPort(min, max) {
        var rand = min - 0.5 + Math.random() * (max - min + 1)
        rand = Math.round(rand);
        return rand;
    }

    start(started: () => void) {
        var app = express();

        app.use(bodyParser.json());

        app.get('/blocks', (request, response) => {
            response.send(this.blockchain.json());
        });

        app.get('/chat', (request, response) => {
            var chat = this.blockchain.map(b => b.body);
            response.send(JSON.stringify(chat));
        });

        app.post('/mine', (request, response) => {
            var block = this.blockchain.add(request.body.data);
            this.broadcast(this.lastMessage);
            response.send(JSON.stringify(block));
        });

        app.get('/peers', (request, response) => {
            response.send(this.sockets.map(s => `${s._socket.remoteAddress}:${s._socket.remotePort}`));
        });

        app.post('/peer', (request, response) => {
            var peers = [request.body.peer];

            peers.forEach((peer) => {
                var ws = new WebSocket(peer);
                ws.on('open', () => this.initWS(ws));
                ws.on('error', () => {
                    console.error('Соединение потерянно')
                });
            });
        });

        app.listen(this.httpPort, () => {
            console.log('Прослушивание порта http: ', this.httpPort);

            var server = new WebSocket.Server({ host: this.p2pHost, port: this.p2pPort });
            server.on('connection', ws => this.initWS(ws));
            console.log('Прослушивание адреса p2p websocket: ', `ws://${this.p2pHost}:${this.p2pPort}`);

            started();
        });
    }

    write(ws, message) {
        ws.send(JSON.stringify(message));
    }

    broadcast(message) {
        this.sockets.forEach(socket => this.write(socket, message));
    }

    initWS(ws) {
        this.sockets.push(ws);

        ws.on('message', (data) => {
            var message = JSON.parse(data);

            try {
                switch (message.type) {
                    case Type.Latest:
                        this.debug && console.log('Получить последний блок');

                        this.write(ws, this.lastMessage);
                        break;
                    case Type.All:
                        this.debug && console.log('Получить актуальный блокчейн');

                        this.write(ws, this.blockchainMessage);
                        break;
                    case Type.Blockchain:

                        if (JSON.parse(message.data).length === 1) {
                            var body = JSON.parse(message.data)[0].body;
                            console.log(body);
                        }
                        
                        this.blockchainResponse(message);
                        break;
                }
            }
            catch(e) {
                console.log(message);
                console.error(e);
            }
        });

        var closeConnection = (ws) => {
            console.error('Соединение потерянно: ', ws.url);
            this.sockets.splice(this.sockets.indexOf(ws), 1);
        };

        ws.on('close', () => closeConnection(ws));
        ws.on('error', () => closeConnection(ws));

        this.write(ws, this.lengthMessage);
    }

    blockchainResponse(message) {
        var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
        var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        var latestBlockHeld = this.blockchain.last();

        if (latestBlockReceived.index > latestBlockHeld.index) {
            
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                this.debug && console.log("Добавить полученный блок к нашему блокчейну");
                this.blockchain.push(latestBlockReceived);
                this.broadcast(this.lastMessage);

            } else if (receivedBlocks.length === 1) {
                this.debug && console.log("Запросить блокчейн");
                this.broadcast(this.allMessage);

            } else {
                this.debug && console.log("Полученный блокчейн длиннее текущего");
                this.blockchain.replace(receivedBlocks);
                this.blockchain.save();
            }
        } else {
            this.debug && console.log('Полученный блокчейн не длиннее текущего. Ничего не делать');
        }
    }

    get lastMessage() {
        return {
            type: Type.Blockchain,
            data: JSON.stringify([this.blockchain.last()])
        };
    }
    
    get allMessage() {
        return { type: Type.All };
    }

    get blockchainMessage() {
        return { type: Type.Blockchain, data: this.blockchain.json() };
    }

    get lengthMessage() {
        return { type: Type.Latest };
    }
}