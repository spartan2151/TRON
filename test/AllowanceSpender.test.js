const AllowanceSpender = artifacts.require('AllowanceSpender');

contract('AllowanceSpender', (accounts) => {
  const [owner, executor, receiver1, receiver2, token, user] = accounts;

  it('stores owner, token, receivers, and initial executor', async () => {
    const spender = await AllowanceSpender.new(token, receiver1, receiver2, executor, { from: owner });
    assert.equal(await spender.owner(), owner);
    assert.equal(await spender.token(), token);
    assert.equal(await spender.RECEIVER1(), receiver1);
    assert.equal(await spender.RECEIVER2(), receiver2);
    assert.equal(await spender.isExecutor(executor), true);
  });

  it('rejects unauthorized execution and invalid receivers', async () => {
    const spender = await AllowanceSpender.new(token, receiver1, receiver2, executor, { from: owner });
    await expectRevert(spender.executeTransfer(user, 1, 1, { from: user }), 'EXECUTOR_ONLY');
    await expectRevert(spender.executeTransfer(user, 1, 3, { from: executor }), 'INVALID_RECEIVER');
  });
});

function expectRevert(promise, message) {
  return promise.then(() => assert.fail('Expected transaction to revert')).catch((error) => {
    assert(error.message.includes(message), `Expected ${message}, got ${error.message}`);
  });
}
