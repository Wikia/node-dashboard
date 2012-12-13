sources = require("./../lib/sources")

exports.test_provider = function(beforeExit, assert) {
    provider = source.constantProvider( { A: 1, B: 2, C:3 })
    src = sources.singleSource(provider);
    assert.isDefined(src);
    assert.equal(src.providerNames, [provider.name]);
    
}