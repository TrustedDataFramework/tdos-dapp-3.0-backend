var express = require('express');
var router = express.Router();
var result = require('../public/model/result')

var tpcAndAddress = require('../public/javascripts/tpcAndAddress');

router.post('/addTpcByAddress',async (req,res)=>{
    let body = req.body;
    let data = await tpcAndAddress.addTpcByAddress(body.address, body.tpcId,body.tpcHash);
    if (data == ""){
        res.json(result.Error("失败","address is not exist"));
    }else{
        res.json(result.Success("成功",data));
    }
});

router.post('/deleteTpcByAddress',async (req,res)=>{
    let body = req.body;
    let data = await tpcAndAddress.deleteTpcByAddress(body.address, body.tpcId);
    if (data == ""){
        res.json(result.Error("失败","address is not exist"));
    }else{
        res.json(result.Success("成功",data));
    }
});

router.get('/selectTpcByAddress',async (req,res)=>{
    let body = req.query;
    let data = await tpcAndAddress.selectTpcByAddress(body.address);
    if (data == ""){
        res.json(result.Error("失败","address is not exist"));
    }else{
        res.json(result.Success("成功",data));
    }
});

module.exports = router;