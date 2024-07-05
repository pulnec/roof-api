const express = require('express');
const configRoof = require('./config.json')
const bodyParser = require('body-parser')
const cors = require('cors');
const fs = require('fs');
const { default: axios } = require('axios');

const app = express ();

app.use(cors({
    origin: '*'
}));
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

const roofEvent = (roof) => {
    if (roof.level > configRoof.currentPosition) {
        const action = 'open';
        if (configRoof.currentPosition === 0) {
            return {
                seconds: roof.seconds,
                action,
                active: true,
            }
        } else {
            const secondsValue = roof.level - configRoof.currentPosition;
            return {
                seconds: secondsValue,
                action,
                active: true,
            }
        }
    }

    if (roof.level < configRoof.currentPosition) {
        const action = 'close';
        const secondsValue = configRoof.currentPosition -  roof.level;
        return {
            seconds: secondsValue,
            action,
            active: true,
        }
    }
  }

const actionRoof = (action) => {

const roofEv = (ip) => {
    axios.get(`http://${ip}/${action}}`);
}

const eventPromise = [];

configRoof.roof.forEach((el) => {
    eventPromise.push(roofEv(el))
});

Promise.allSettled(roofs)
}

app.get('/status', (request, response) => {
    const status = {
       'Status': 'Running'
    };
    response.send(status);
 });

 app.get('/roof', (request, response) => {
    response.send(configRoof);
 })

 app.get('/roof/none', (request, response) => {
    actionRoof('none');
    response.send({ message: 'action none success'});
 });


 app.post('/roof', async (request, response) => {
    const body = request.body;
    try {
        const respEvt = roofEvent(body.roof);
        await writeConfig(body.nextPosition);
        actionRoof(respEvt.action);
        response.send({ resAction: respEvt });
    } catch (e) {
        console.log(e)
        response.send({ error: 'error write params roof' });
    }
 })



app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});