
import express from "express";
import * as dotenv from 'dotenv';
import cors from 'cors'
import bodyParser from 'body-parser';
import { routes } from './routes/routes';

const app = express();
import { generateResponse } from "./util/genRes";
import { Server } from 'socket.io';
import { createServer } from 'http';
import os from 'os';

const httpServer = createServer(app);
const socket1 = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    maxHttpBufferSize: 2e7,
});

dotenv.config();


app.use(cors());
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();

});
// app.use(expFileUpload());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


app.use(express.json());

routes(app);

app.use((_req: express.Request, res: express.Response, _next: express.NextFunction) => {
    return res.send(generateResponse(false, "Page not found", 500, null));
}
);

export default socket1
const port = 8000;


export function getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const networkInterfaces = interfaces[name];
        if (networkInterfaces) { // Check if networkInterfaces is defined
            for (const iface of networkInterfaces) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    }
    return '0.0.0.0';
}
const localIP = getLocalIP();

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Accessible on network at http://${localIP}:${port}`);
});