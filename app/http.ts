import * as http from 'http';

export let get = (url: string, success: (response: any) => void) => {
    http.get(url, response => {
        const { statusCode } = response;

        let error;
        if (statusCode !== 200) {
            error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
        }

        if (error) {
            console.error(error.message);
            response.resume();
            return;
        }

        response.setEncoding('utf8');
        let rawData = '';
        response.on('data', (chunk) => { rawData += chunk; });
        response.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                success(parsedData);
            } catch (e) {
                console.error(e.message);
            }
        });
    });
}

export let post = (hostname: string, port: number, path: string, data: string, success: (response: any) => void) => {
    const request = http.request({
        hostname: hostname,
        port: port,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    }, response => {
        response.setEncoding('utf8');
        let rawData = '';
        response.on('data', (chunk) => { rawData += chunk; });
        response.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                success(parsedData);
            } catch (e) {
                console.error(e.message);
            }
        });
    });

    request.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    request.write(data);
    request.end();
}