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
    redis = require('redis'),
    log = require("./log"),
    Shuffle = require("shuffle"),

    common = require("./common"),
    Options = common.Options;


var petrucciSchema = new Schema('Petrucci', 'petrucci', 'channel', {
    'channel': StringField,
    'tokens': JSONField
});

var Petrucci = new Model(petrucciSchema);

Petrucci.getTokens = function(channel){
    return this.get("petrucci", channel);
};

Petrucci.create = function(opts){
    opts = new Options((opts || {}));

    var petrucci,
        q,
        self = this,
        d = when.defer(),
        token = opts.get('token', null),
        created = opts.get('created', function(){return new Date();});

    if(created.constructor !== Date){
        created = new Date(created);
    }

    function createIt(){
        petrucci = {
            'token': token,
            'new_songs': [],
            'created': created
        };

        q = self.insert('petrucci', token)
            .set(petrucci);

        q.commit().then(function(){
            self.subscribeToPlayset(token).then(function(){
               d.resolve(petrucci);
           }, d.reject);
        }, d.reject);
    }

    createIt();
    return d.promise;
};

Petrucci.subscribeToPlayset = function(token){

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
