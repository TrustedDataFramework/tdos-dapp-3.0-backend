var code = require('./code')

class Result{
    constructor(code,message,data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
}

var Success = function(message,data){
    return new Result(code.SUCC_CODE,message,data)
}

var Error = function(message,data){
    return new Result(code.ERR_CODE,message,data)
}

module.exports = {
    Success:Success,Error:Error
}
