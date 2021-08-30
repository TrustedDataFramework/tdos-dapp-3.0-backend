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

async function selectTpcHashByTpc(address,tpcId) {
    let data = await redis.get(address);
    if(data == "" || data == null) {
        return "";
    }else {
        for(let i =0; i<data.length;i++){
            let tpc_id = data[i].tpcId;
            if(tpc_id == tpcId){
                return data[i];
            }
        }
    }
}

async function deleteTpcByAddress(address,tpcId){
    let data = await redis.get(address);
    if(data == "" || data == null) {
        return "";
    }else{
        for(let i =0; i<data.length;i++){
            let tpc_id = data[i].tpcId;
            if(tpc_id == tpcId){
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
