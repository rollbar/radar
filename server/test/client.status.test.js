var common = require('./common.js'),
    assert = require('assert'),
    http = require('http'),

    Radar = require('../server.js'),
    Persistence = require('../../core').Persistence,
    Client = require('radar_client').constructor,
    logging = require('minilog')('test');

http.globalAgent.maxSockets = 10000;

var enabled = false;
/*
var Minilog = require('minilog');
Minilog.pipe(Minilog.backends.nodeConsole)
  .filter(function() { return enabled; })
  .format(Minilog.backends.nodeConsole.formatWithStack);
*/

exports['status: given a server and two connected clients'] = {

  beforeEach: function(done) {
    var self = this,
        tasks = 0;
    function next() {
      tasks++;
      if (tasks == 3) {
        done();
      }
    }
    common.startRadar(9000, this, function(){
      self.client = new Client().configure({ userId: 123, userType: 0, accountName: 'test', port: 9000, upgrade: false })
                    .on('ready', next).alloc('test');
      self.client2 = new Client().configure({ userId: 222, userType: 0, accountName: 'test', port: 9000, upgrade: false })
                    .on('ready', next).alloc('test');
    });
    Persistence.delWildCard('*:/test/*', next);
  },

  afterEach: function(done) {
    this.client.dealloc('test');
    this.client2.dealloc('test');
    common.endRadar(this, done);
    Persistence.delWildCard('*:/test/*', next);
  },

/*
  after: function(done) {
    Persistence.disconnect(done);
  },
*/

  'a status can be set to some value and subscribers will be updated': function(done) {
    var client = this.client, client2 = this.client2,
        notifications = [];
    // subscribe with client 2
    client2.status('ticket/1').on(function(message){
      notifications.push(message);
    }).subscribe(function() {
      // set status to some value
      client.status('ticket/1').set('something', function() {
        setTimeout( function() {
          assert.equal(notifications.length, 1);
          assert.equal(notifications[0].op, 'set');
          assert.equal(notifications[0].value, 'something');
          assert.equal(notifications[0].key, 123);

          done();
        }, 10);
      });
    });
  },
  'a status can be set to a string and can be read': function(done) {
    var client = this.client, client2 = this.client2,
        notifications = [];
    // set status to some value
    client.status('ticket/2').set('something', function() {
      client2.status('ticket/2').sync(function(msg) {
        assert.equal(msg.op, 'get');
        assert.deepEqual(msg.value,{ 123: 'something'});
        done();
        });
    });
  },
  'a status can be set to an object and subscribers will be updated': function(done) {
    var client = this.client, client2 = this.client2,
        notifications = [];
    // subscribe with client 2
    client2.status('ticket/1').on(function(message){
      notifications.push(message);
    }).subscribe(function() {
      // set status to some value
      client.status('ticket/1').set({ hi: 'world'}, function() {
        setTimeout( function() {
          assert.equal(notifications.length, 1);
          assert.equal(notifications[0].op, 'set');
          assert.deepEqual(notifications[0].value, { hi: 'world'});
          assert.equal(notifications[0].key, 123);

          done();
        }, 10);
      });
    });
  },
  'a status can be set to an object and can be read': function(done) {
    var client = this.client, client2 = this.client2,
        notifications = [];
    // set status to some value
    client.status('ticket/2').set([ { hi: [ 'world' ] } ], function() {
      client2.status('ticket/2').sync(function(msg) {
        assert.equal(msg.op, 'get');
        assert.deepEqual(msg.value, { '123' : [ { hi: ['world'] } ] });
        done();
      });
    });
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--bail', '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
