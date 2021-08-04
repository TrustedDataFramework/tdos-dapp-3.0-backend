var express = require('express');
var router = express.Router();
const multer  = require('multer');
const path = require('path')
var result = require('../public/model/result')

var upload = multer({ dest: './public/images'}) // 文件储存路径

router.post('/uploader', upload.single('avatar'), function(req, res, next) {
    let file = req.file;
    console.log(file)
    res.json(result.Success("成功",file.filename));
});

router.get('/loadimg', function(req, res, next) {
    let imgid = req.query.imgid;
    let file = path.join(__dirname,'../public/images/' + imgid);
    res.download(file);
});

module.exports = router;



