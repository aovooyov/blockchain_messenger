import * as readline from 'readline';
import * as express from 'express';

import { Blockchain } from './blockchain';
import { Server } from './server';
import { get, post } from './http'; 

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let key: string;
let p2pPort: number;
let server: Server;

console.log('Введите свой ключ блокчейна');
rl.setPrompt('> ');
rl.prompt();

rl.on('line', (answer: string) => {

    if(!key) {
        key = answer;
        console.log('Введите p2p порт');
        rl.prompt();
        return;
    }

    if(!p2pPort) {
        p2pPort = parseInt(answer);
        
        console.log();
        console.log('Команды:');
        console.log('Привет земляни 2020 года! Почем BTC? - Добавить блок');
        console.log('peers - Список соединенных клиентов');
        console.log('peer: - Установить соединение с клиентом (peer:localhost:6001)');
        console.log('list - Вывести весь блокчейн');
        console.log('chat - Вывести вcе сообщения');
        console.log('exit - Завершить работу');
        console.log();

        get('http://api.ipify.org?format=json', response => {
            var ip = response['ip'];

            server = new Server(key, 'localhost', p2pPort);
            server.start(() => {
                rl.prompt();
            });
        });
        return;
    }
    
    var separator = answer.indexOf(':');
    var command = separator !== -1 ? answer.substr(0, separator + 1) : answer;
    var body = answer.substr(separator + 1);

    switch (command) {
        case 'list': {
            if (!server) {
                break;
            }

            get(`http://localhost:${server.httpPort}/blocks`, response => {
                console.log(response);
            });

            break;
        }
        case 'peers': {
            if (!server) {
                break;
            }

            get(`http://localhost:${server.httpPort}/peers`, response => {
                console.log(response);
            });
            break;
        }
        case 'peer:': {
            if (!server) {
                break;
            }

            var data = JSON.stringify({ peer: `ws://${body.trim()}` });

            post('localhost', server.httpPort, '/peer', data, response => {
                console.log(response);
            });
            break;
        }
        case 'chat': {
            if (!server) {
                break;
            }

            get(`http://localhost:${server.httpPort}/chat`, response => {
                var chat = <string[]>response;
                chat.forEach(m => console.log(m));
            });

            break;
        }
        case 'exit': {
            rl.close();
            return;
        }
        default: {
            if (!server) {
                return;
            }

            if(!answer.trim()) {
                return;
            }

            var data = JSON.stringify({ data: `${key}: ${answer}` });

            post('localhost', server.httpPort, '/mine', data, response => {
            });
            break;
        }
    }

    rl.prompt();
});
rl.on('close', () => {
    process.exit(0);
});