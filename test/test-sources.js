sources = require("./../lib/sources")
providers = require("./../lib/providers")

exports.test_provider = function(beforeExit, assert) {
    provider = providers.Constant( { A: 5, B: 6, C:7 } )
    data = provider.getData();
    assert.equal(data.A.length, 1);
    assert.equal(data.A[0][1], 5);
    src = sources.Source();
    assert.isDefined(src);
    provider.addSubscriber(src, ['A', 'B', 'C']);
    provider.start();
    last = src.getLast();
    assert.eql(last, {A: 5, B:6, C:7})
}
