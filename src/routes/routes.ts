
import webtellMasterIndia from './subRoutes/webtellMasterIndia.routes';
import microvista from './subRoutes/microvista.routes';
import microvistapRODUCTION from './subRoutes/microvista.production.routes';

export function routes(app: any) {
    app.use(webtellMasterIndia);
    app.use(microvista);
    app.use(microvistapRODUCTION);
    app.get('/health', (req: any, res: any) => {
        res.send('ok');
    });

}
