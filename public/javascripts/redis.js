const redisStore = require('cache-manager/examples/redis_example/redis_store');
const RedisPool = require('sol-redis-pool');

function redis_store(args) {
    args = args || {};
    var self = {};
    var ttlDefault = args.ttl;
    self.name = 'redis';

    var redisOptions = {
        host: process.env.redis_ip,
        port:  6379
    };

    var pool = new RedisPool(redisOptions, {});

    function connect(cb) {
        pool.acquire(function(err, conn) {
            if (err) {
                pool.release(conn);
                return cb(err);
            }

            if (args.db || args.db === 0) {
                conn.select(args.db);
            }

            cb(null, conn);
        });
    }

    function handleResponse(conn, cb, opts) {
        opts = opts || {};

        return function(err, result) {
            pool.release(conn);

            if (err) { return cb(err); }

            if (opts.parse) {
                result = JSON.parse(result);
            }

            cb(null, result);
        };
    }

    self.get = function(key, options, cb) {
        if (typeof options === 'function') {
            cb = options;
        }

        connect(function(err, conn) {
            if (err) { return cb(err); }
            conn.get(key, handleResponse(conn, cb, {parse: true}));
        });
    };

    self.set = function(key, value, options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        options = options || {};

        var ttl = (options.ttl || options.ttl === 0) ? options.ttl : ttlDefault;

        connect(function(err, conn) {
            if (err) { return cb(err); }
            var val = JSON.stringify(value);

            if (ttl) {
                conn.setex(key, ttl, val, handleResponse(conn, cb));
            } else {
                conn.set(key, val, handleResponse(conn, cb));
            }
        });
    };

    self.del = function(key, options, cb) {
        if (typeof options === 'function') {
            cb = options;
        }
        connect(function(err, conn) {
            if (err) { return cb(err); }
            conn.del(key, handleResponse(conn, cb));
        });
    };

    self.ttl = function(key, cb) {
        connect(function(err, conn) {
            if (err) { return cb(err); }
            conn.ttl(key, handleResponse(conn, cb));
        });
    };

    self.keys = function(pattern, cb) {
        if (typeof pattern === 'function') {
            cb = pattern;
            pattern = '*';
        }

        connect(function(err, conn) {
            if (err) { return cb(err); }
            conn.keys(pattern, handleResponse(conn, cb));
        });
    };

    self.isCacheableValue = function(value) {
        return value !== null && value !== undefined;
    };

    return self;
}
const cacheManager = require('cache-manager').caching({store: redis_store(), db: 0, ttl: ''}); // ttl是缓存时间

let get_result = async(key)=>{
    let doc = await new Promise( (resolve) => {
        cacheManager.get(key,function(err, res){
            return resolve(res);
        });
    });
    return doc;
};

async function get(key){
    return await get_result(key);
}

let set_result = async(key,data)=>{
    let doc = await new Promise( (resolve) => {
        cacheManager.set(key, data, {ttl: ''}, (err, result) => {
            return resolve(result);
        })
    });
    return doc;
};

async function set(key,data){
    return await set_result(key,data);
}

module.exports={
    get:get,
    set:set
};

