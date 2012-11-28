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

var petrucciSchema = new Schema('Petrucci', 'petrucci', 'id', {
    'id': NumberField,
    'created': DateField,
    'title': StringField
});

var Petrucci = new Model(petrucciSchema);

Petrucci.getById = function(id){
    return this.get("petrucci", id);
};

Petrucci.create = function(opts){
    opts = new Options((opts || {}));

    var petrucci,
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
        petrucci = {
            'id': Number(id),
            'title': title,
            'created': created
        };

        q = self.insert('petrucci', id)
            .set(petrucci);

        q.commit().then(function(){
            d.resolve(petrucci);
        }, d.reject);
    }

    if (id === null) {
        id = makeId();
    }
    createIt();
    return d.promise;
};

Petrucci.destroy = function(id){
    var d = when.defer();
    this.get('petrucci', id).then(function(petrucci){
        if(!petrucci){
            return d.resolve(false);
        }
        this.batch()
            .remove('petrucci', id)
            .commit()
            .then(function(){d.resolve(true);}, d.reject);
    }.bind(this), d.reject);
    return d.promise;
};

// Petrucci.applyUpdate(1, {
//     'sets': {
//         'title': 'Silence in a Sweater'
//     }
// });
Petrucci.applyUpdate = function(id, data){
    var d = when.defer(),
        q = this.update('petrucci', id)
            .returnAll();
    if(!data.sets){
        data.sets = {};
    }
    data.sets.version = Date.now();
    q.set(data.sets);
    q.commit().then(function(petrucci){
        d.resolve(petrucci);
    });
    return d.promise;
};

module.exports = exports = Petrucci;
