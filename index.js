const express = require('express');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = 4005;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,   
    max: 100,
})

app.use(morgan('combined')); 
app.use(limiter);
app.use('/bookingservice', async (req,res,next) => {
    console.log(req.headers['x-access-token']); 
    try {
        const response = await axios.get('http://localhost:4001/api/v1/isauthenticated', {
        headers: {
            'x-access-token': req.headers['x-access-token']
        }
    });
    console.log(response.data);
    if(response.data.success){
        req.user = response.data.data;
        req.userId = response.data.data?.id; 
        console.log(' User authenticated:', req.userId);
        
        next();
    } else {
        return res.status(401).json({
            message: 'Unauthorised'
        })
    }
    } catch (error) {
        return res.status(401).json({
            message: 'Unauthorised'
        })
    }
})

app.use('/bookingservice' , createProxyMiddleware({ target: 'http://localhost:4002/', changeOrigin: true, onProxyReq: (proxyReq, req, res) => {
        if (req.method === 'POST' && req.body) {
            const modifiedBody = {
                ...req.body,
                userId: req.userId  
            };
            const bodyData = JSON.stringify(modifiedBody);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
            proxyReq.end();
        }
    } 
}));
app.get('/home' , (req,res) => {
    return res.json({message: 'OK'});
})

app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});   
