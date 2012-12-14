sources = require("./../lib/sources");
providers = require("./../lib/providers");
util = require("util");


exports.const_provider = function(beforeExit, assert) {
    provider = new providers.Constant( { values: { A: 5, B: 6, C:7 } })
    data = provider.getData();
    assert.equal(data.A.length, 1);
    assert.equal(data.A[0][1], 5);
    src = new sources.Source();
    assert.isDefined(src);
    provider.addSubscriber(src, ['A', 'B', 'C']);
    provider.start();
    last = src.getLast();
    assert.eql(last, {A: 5, B:6, C:7})
};

exports.new_relic = function(beforeExit, assert) {
  settings = {
		type: 'NewRelic',
		apiKey: process.env.NEWRELIC_API_KEY,
		accountId: process.env.NEWRELIC_ACCOUNT,
		applications: undefined
	}
  nr = new providers.NewRelic(settings)
  nr.fetchApplications(util.log)






};
