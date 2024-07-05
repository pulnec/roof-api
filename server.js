const express = require('express');
const configRoof = require('./config.json')
const bodyParser = require('body-parser')
const fs = require('fs');

const app = express ();


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.json());

const PORT = 4569;


const writeConfig = (nextPosition) => new Promise((resolve, reject) => {
    const newConfig = {
        ...configRoof,
        currentPosition: nextPosition,
    }


    fs.writeFile(process.cwd() + '/config.json', JSON.stringify(newConfig, null, 2), (err) => {
        if (err) {
          reject(err);      
        }
        resolve(newConfig)
    });
})

const readConfig = () => {}

app.get('/status', (request, response) => {
    const status = {
       'Status': 'Running'
    };
    response.send(status);
 });

 app.get('/roof-config', (request, response) => {
    response.send(configRoof);
 })

 app.post('/roof', async (request, response) => {
    const body = request.body;
    try {
        const resp = await writeConfig(body.nextPosition);
        response.send(resp);
    } catch {
        response.send({ error: 'error write params roof' });
    }
 })



app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});