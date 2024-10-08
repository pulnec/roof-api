const express = require('express');
const configRoof = require('./config.json')
const bodyParser = require('body-parser')
const logger = require('morgan');
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
app.use(logger('common', {
    stream: fs.createWriteStream('./access.log', {flags: 'a'})
}));
app.use(logger('dev'));

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


const checkStatus = async () => new Promise((resolve, reject) => {
    let roofs = [];
    configRoof.roof.forEach( async (el) => {
        roofs.push(axios.get(`http://${el}`,{ timeout: 6000 }));
    });
    Promise.all(roofs).then((res) => {
        resolve(true);
    }).catch((err) => {
      if (err.code === 'ECONNABORTED') {
        reject('BAD_ROOF_STATUS_1');
      } else {
        reject('BAD_ROOF_STATUS_2');
      }
    }); 
});

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

  Promise.allSettled(eventPromise).then((response) => {
    console.log(response);
  }).catch((e) => {
    console.log('error promise', e);
  })
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
            response.status(400).send({ error: 'get config error' });
            return;
          }
          response.send(data)
    })
 })

 app.get('/roof/none', (request, response) => {
    try {
        actionRoof('none');
        response.status(200).send({ message: 'action none success'});
    } catch (e) {
        response.status(400).send({ error: 'error none action', e });
    }
 });

 app.get('/roof/reset', async (request, response) => {
    try {
        await writeConfig(0);
        response.status(200).send({ message: 'action none success'});
    } catch (e) {
        response.status(400).send({ error: 'error reset action', e });
    }
 });


 app.post('/roof', async (request, response) => {
    const body = request.body;
    try {
        await checkStatus();
        const respEvt = await roofEvent(body.roof);
        await writeConfig(body.nextPosition);
        actionRoof(respEvt.action);
        response.status(200).send({ resAction: respEvt });
    } catch (e) {
        console.log('e', e);
        response.status(400).send({ error: 'error write params roof', e});
    }
 })


 app.get('/test', async (request, response) => {
    const {data} = axios.get('https://swapi.dev/api/people/1/');
    response.send(data);
    console.log(data);
 })

 app.get('/roof/status', async (request, response) => {
    try {
        const res =  await checkStatus();
        response.status(200).send(res);
    } catch (e) {
        response.status(400).send(e);
    }
 })

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});