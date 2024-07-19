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

const roofEvent = async (roof) => {

    try {
    const { data } = await axios.get('http://localhost:4569/roof');
        if (roof.level > data.currentPosition) {
        const action = 'open';
        if (data.currentPosition === 0) {
            return {
                seconds: roof.seconds,
                action,
                active: true,
            }
        } else {
            const currentValue = data.times.filter(e => e.level === data.currentPosition)[0];
            const secondsValue = roof.seconds - currentValue.seconds;
            return {
                seconds: secondsValue,
                action,
                active: true,
            }
        }
    }
    
    if (roof.level < data.currentPosition) {
        const action = 'close';
        const currentValue = data.times.filter(e => e.level === data.currentPosition)[0]

        let secondsValue = currentValue.seconds - roof.seconds;
        
        if (roof.level === 0) {
            secondsValue = currentValue.seconds;
        }

        return {
            seconds: secondsValue,
            action,
            active: true,
        }
    }

    } catch (e) {
        console.log(e)
    }   

  }

const actionRoof = async (action) => {

const roofEv = (ip) => {
    let fixAction = action;
    if (ip === '192.168.0.11' && action === 'open') {
        fixAction = 'close';
    } else if (ip === '192.168.0.11' && action === 'close') {
        fixAction = 'open';
    }
    axios.get(`http://${ip}/${fixAction}`);
}

const eventPromise = [];

configRoof.roof.forEach((el) => {
    eventPromise.push(roofEv(el))
});

Promise.allSettled(eventPromise)
}

app.get('/status', (request, response) => {
    const status = {
       'Status': 'Running'
    };
    response.send(status);
 });

 app.get('/roof', (request, response) => {
    fs.readFile("./config.json", "utf8", (error, data) => {
        if (error) {
            console.log(error);
            return;
          }
          response.send(data)
    })
 })

 app.get('/roof/none', (request, response) => {
    try {
        actionRoof('none');
        response.send({ message: 'action none success'});
    } catch {
         console.log('error action none')
    }
 });

 app.get('/roof/reset', async (request, response) => {
    try {
        await writeConfig(0);
        response.send({ message: 'action none success'});
    } catch {
         console.log('error action none')
    }
 });


 app.post('/roof', async (request, response) => {
    const body = request.body;
    try {
        const respEvt = await roofEvent(body.roof);
        await writeConfig(body.nextPosition);
        actionRoof(respEvt.action);
        response.send({ resAction: respEvt });
    } catch (e) {
        console.log(e)
        response.send({ error: 'error write params roof' });
    }
 })


 app.get('/test', async (request, response) => {
    const {data} = axios.get('https://swapi.dev/api/people/1/');
    response.send(data);
    console.log(data);
 })


app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});