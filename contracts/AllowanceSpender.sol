// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title AllowanceSpender
 * @notice Executes explicitly approved TRC-20 transfers through authorized executors.
 * @dev The contract never receives or holds user tokens. Tokens move directly from the
 *      approved user to one of the configured receivers.
 */
contract AllowanceSpender {
    address public immutable owner;
    IERC20 public immutable token;
    address public immutable RECEIVER1;
    address public immutable RECEIVER2;
    mapping(address => bool) public isExecutor;
    bool private locked;

    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);
    event TransferExecuted(address indexed executor, address indexed from, address indexed receiver, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "OWNER_ONLY");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "REENTRANCY");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyExecutor() {
        require(isExecutor[msg.sender], "EXECUTOR_ONLY");
        _;
    }

    constructor(address tokenAddress, address receiver1, address receiver2, address initialExecutor) {
        require(tokenAddress != address(0) && receiver1 != address(0) && receiver2 != address(0), "ZERO_ADDRESS");
        owner = msg.sender;
        token = IERC20(tokenAddress);
        RECEIVER1 = receiver1;
        RECEIVER2 = receiver2;
        if (initialExecutor != address(0)) {
            isExecutor[initialExecutor] = true;
            emit ExecutorAdded(initialExecutor);
        }
    }

    /** @notice Adds an executor that may call executeTransfer. */
    function addExecutor(address executor) external onlyOwner {
        require(executor != address(0), "ZERO_ADDRESS");
        isExecutor[executor] = true;
        emit ExecutorAdded(executor);
    }

    /** @notice Removes an executor immediately. */
    function removeExecutor(address executor) external onlyOwner {
        isExecutor[executor] = false;
        emit ExecutorRemoved(executor);
    }

    /**
     * @notice Transfers approved tokens directly from a user to a configured receiver.
     * @param from The wallet that granted this contract allowance.
     * @param amount The token amount in the token's smallest unit.
     * @param receiverId 1 for RECEIVER1 or 2 for RECEIVER2.
     */
    function executeTransfer(address from, uint256 amount, uint8 receiverId) external onlyExecutor nonReentrant {
        require(from != address(0) && amount > 0, "INVALID_INPUT");
        address receiver = receiverId == 1 ? RECEIVER1 : receiverId == 2 ? RECEIVER2 : address(0);
        require(receiver != address(0), "INVALID_RECEIVER");
        require(token.allowance(from, address(this)) >= amount, "INSUFFICIENT_ALLOWANCE");
        require(token.balanceOf(from) >= amount, "INSUFFICIENT_BALANCE");
        require(token.transferFrom(from, receiver, amount), "TRANSFER_FAILED");
        emit TransferExecuted(msg.sender, from, receiver, amount);
    }
}
