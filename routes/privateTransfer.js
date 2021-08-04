var express = require('express');
var router = express.Router();
var privateTransgerJS = require('../public/javascripts/privateTransfer');
var result = require('../public/model/result')


router.post('/Execwithdraw',async (req,res)=>{
    let body = req.body;
    let data = await privateTransgerJS.Execwithdraw(body.noteString, body.recipient);
    if (data == ""){
        res.json(result.Error("失败",""));
    }else{
        res.json(result.Success("成功",data));
    }
});

module.exports = router;
