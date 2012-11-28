 "use strict";

var mambo = require("mambo"),
    Model = mambo.Model,
    Schema = mambo.Schema,
    StringField = mambo.StringField,
    NumberField = mambo.NumberField,
    JSONField = mambo.JSONField,
    DateField = mambo.DateField,
    BooleanField = mambo.BooleanField,
    StringSetField = mambo.StringSetField,
    NumberSetField = mambo.NumberSetField,

    sequence = require("sequence"),
    when = require("when"),
    _ = require("underscore"),
    nconf = require("nconf"),
    request = require("superagent"),
    log = require("./log"),

    common = require("./common"),
    Options = common.Options;

function makeId(){
    return parseInt(Math.random() * 100000000000, 10);
}

var node-petrucciSchema = new Schema('Node-petrucci', 'node-petrucci', 'id', {
    'id': NumberField,
    'created': DateField,
    'title': StringField
});

var Node-petrucci = new Model(node-petrucciSchema);

Node-petrucci.getById = function(id){
    return this.get("node-petrucci", id);
};

Node-petrucci.create = function(opts){
    opts = new Options((opts || {}));

    var node-petrucci,
        q,
        self = this,
        d = when.defer(),
        id = opts.get('id', null),
        title = opts.get('title', null),
        created = opts.get('created', function(){return new Date();});

    if(created.constructor !== Date){
        created = new Date(created);
    }

    function createIt(){
        node-petrucci = {
            'id': Number(id),
            'title': title,
            'created': created
        };

        q = self.insert('node-petrucci', id)
            .set(node-petrucci);

        q.commit().then(function(){
            d.resolve(node-petrucci);
        }, d.reject);
    }

    if (id === null) {
        id = makeId();
    }
    createIt();
    return d.promise;
};

Node-petrucci.destroy = function(id){
    var d = when.defer();
    this.get('node-petrucci', id).then(function(node-petrucci){
        if(!node-petrucci){
            return d.resolve(false);
        }
        this.batch()
            .remove('node-petrucci', id)
            .commit()
            .then(function(){d.resolve(true);}, d.reject);
    }.bind(this), d.reject);
    return d.promise;
};

// Node-petrucci.applyUpdate(1, {
//     'sets': {
//         'title': 'Silence in a Sweater'
//     }
// });
Node-petrucci.applyUpdate = function(id, data){
    var d = when.defer(),
        q = this.update('node-petrucci', id)
            .returnAll();
    if(!data.sets){
        data.sets = {};
    }
    data.sets.version = Date.now();
    q.set(data.sets);
    q.commit().then(function(node-petrucci){
        d.resolve(node-petrucci);
    });
    return d.promise;
};

module.exports = exports = Node-petrucci;
