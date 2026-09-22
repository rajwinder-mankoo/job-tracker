import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {GoogleAuth} from 'google-auth-library';
import {parseRows,createSync} from './model.js';
const sheetId = process.env.SHEET_ID || '';
const configured = Boolean(sheetId && process.env.GOOGLE_APPLICATION_CREDENTIALS);
const demo = process.env.DEMO_MODE === 'true';
const auth = new GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
const range = process.env.SHEET_RANGE || 'Applications!A:ZZ';
const interval = 60000;
const sync = createSync(async () => {
  if (demo) return JSON.parse(await readFile(new URL('../demo.json',import.meta.url),'utf8'));
  if (!configured) throw new Error('Connect Google Sheets to load your applications. Follow the setup steps in README.md.');
  try {
    const client = await auth.getClient();
    const response = await client.request({url:`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`,timeout:15000,retry:false});
    let linkRows = [];
    try {
      const metadataUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`);
      metadataUrl.searchParams.set('ranges',range);
      metadataUrl.searchParams.set('includeGridData','true');
      metadataUrl.searchParams.set('fields','sheets(data(rowData(values(hyperlink,textFormatRuns(format(link(uri))),chipRuns(chip(richLinkProperties(uri)))))))');
      const metadata = await client.request({url:metadataUrl.href,timeout:15000,retry:false});
      linkRows = metadata.data.sheets?.[0]?.data?.[0]?.rowData?.map(row=>row.values||[])||[];
    } catch {}
    return parseRows(response.data.values,linkRows);
  } catch (err) {
    if (err.response?.status === 403) throw new Error('Google denied access. Enable the Sheets API and share the sheet with the service account as Viewer.');
    if (err.response?.status === 404) throw new Error('Sheet not found. Check SHEET_ID and service account access.');
    if (err.response?.status === 400) throw new Error('Google could not read the range. Check SHEET_RANGE and the Applications tab name.');
    if (err.message?.startsWith('Missing column:') || err.message?.startsWith('The Applications')) throw err;
    throw new Error('Google Sheets sync failed. Check credentials and network access; your last successful data is retained.');
  }
},interval);
const assets = {'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css'],'/priority.css':['priority.css','text/css']};
const server = http.createServer(async (req,res) => {
  const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"};
  const send = (code,body,type='application/json') => {res.writeHead(code,{...headers,'Content-Type':`${type}; charset=utf-8`});res.end(type === 'application/json' ? JSON.stringify(body) : body);};
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if (req.method !== 'GET') return send(405,{error:'Read-only application'});
    if (path === '/health') return send(200,{ok:true});
    if (path === '/api/jobs') {
      const state = await sync.refresh(new URL(req.url,'http://localhost').searchParams.get('refresh') === 'true');
      return send(200,{...state,mode:demo?'demo':configured?'live':'setup',sheetUrl:sheetId?`https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/edit`:null,refreshSeconds:60});
    }
    if (!assets[path]) return send(404,{error:'Not found'});
    const [file,type] = assets[path];
    send(200,await readFile(new URL(`../public/${file}`,import.meta.url),'utf8'),type);
  } catch {send(500,{error:'Unable to serve the request.'});}
});
server.listen(Number(process.env.PORT || 3000),process.env.HOST || '127.0.0.1',() => console.log(`Job Tracker running on port ${process.env.PORT || 3000} (${demo?'demo':configured?'Google Sheets':'setup'})`));
const timer = setInterval(() => {if (configured || demo) void sync.refresh();},interval); timer.unref();
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,() => {clearInterval(timer);server.close();});
