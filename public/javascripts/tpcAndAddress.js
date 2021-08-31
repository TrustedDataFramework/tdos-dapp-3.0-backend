var redis = require('./redis');


async function addTpcByAddress(address,tpcId,tpcHash,type){
    let data = await redis.get(address);
    const tpc_new = {"tpcId": tpcId,"tpcHash": tpcHash,"type":type};
    if(data == "" || data == null) {
        let ret = [];
        ret.push(tpc_new)
        return await redis.set(address,ret)
    }else {
        let ret = [];
        for(let i =0; i<data.length;i++){
            ret.push(data[i]);
        }
        ret.push(tpc_new);
        return await redis.set(address,ret)
    }
}

async function selectTpcByAddress(address) {
    let data = await redis.get(address);
    if(data == "" || data == null) {
        return "";
    }else {
        return data;
    }
}

async function selectTpcHashByTpc(address,tpcId,type) {
    let data = await redis.get(address);
    if(data == "" || data == null) {
        return "";
    }else {
        for(let i =0; i<data.length;i++){
            let tpc_id = data[i].tpcId;
            let type_h = data[i].type;
            if(tpc_id == tpcId && type_h == type){
                return data[i];
            }
        }
        return "";
    }
}

async function deleteTpcByAddress(address,tpcId,type){
    let data = await redis.get(address);
    if(data == "" || data == null) {
        return "";
    }else{
        for(let i =0; i<data.length;i++){
            let tpc_id = data[i].tpcId;
            let type_h = data[i].type;
            if(tpc_id == tpcId && type_h == type){
                data.splice(i, 1);
            }
        }
        await redis.set(address,data)
        return "200";
    }
}

module.exports={
    deleteTpcByAddress:deleteTpcByAddress,
    selectTpcByAddress:selectTpcByAddress,
    addTpcByAddress:addTpcByAddress,
    selectTpcHashByTpc:selectTpcHashByTpc
};
