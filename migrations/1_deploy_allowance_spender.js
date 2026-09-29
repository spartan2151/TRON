const AllowanceSpender = artifacts.require('AllowanceSpender');

module.exports = async function (deployer) {
  const token = process.env.USDT_CONTRACT_ADDRESS;
  const receiver1 = process.env.RECEIVER1_ADDRESS;
  const receiver2 = process.env.RECEIVER2_ADDRESS;
  const executor = process.env.EXECUTOR_ADDRESS;
  if (!token || !receiver1 || !receiver2) throw new Error('USDT_CONTRACT_ADDRESS and both receiver addresses are required');
  await deployer.deploy(AllowanceSpender, token, receiver1, receiver2, executor || '');
};
