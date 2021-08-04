var express = require('express');
var router = express.Router();
var redis = require('../public/javascripts/redis');
var result = require('../public/model/result')

router.get('/get', async function(req, res, next) {
    let key = req.query.key;
    let data = await redis.get(key);
    res.json(result.Success("成功",data));
});

router.post('/set',async (req,res)=>{
    let body = req.body;
    let data = await redis.set(body.key,body.value);
    if (data != "OK"){
        res.json(result.Error("失败",""));
    }else{
        res.json(result.Success("成功",""));
    }
});

module.exports = router;
