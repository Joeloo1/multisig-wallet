// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract MultiSigWallet {
    event Deposit(address indexed sender, uint amount);
    // event Submit(uint indexed txId);
    event Submit(
        uint indexed txId,
        address indexed owner,
        address indexed to,
        uint value,
        bytes data
    );
    event Approve(address indexed owner, uint indexed txId);
    event Revoke(address indexed owner, uint indexed txId);
    // event Execute(uint indexed txId);
    event Execute(
        uint indexed txId,
        address indexed to,
        uint value,
        bool success
    );

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;

    Transaction[] public transactions;
    mapping(uint => mapping(address => bool)) public approved;

    mapping(uint => uint) public approvalCount;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    modifier txExists(uint _txId) {
        require(_txId < transactions.length, "Tx does not exist");
        _;
    }

    modifier notApproved(uint _txId) {
        require(!approved[_txId][msg.sender], "tx already approved");
        _;
    }

    modifier notExecuted(uint _txId) {
        require(!transactions[_txId].executed, "tx already executed");
        _;
    }

    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners Required");

        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "Invalid required number of owners"
        );

        for (uint i; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid Owner");

            require(!isOwner[owner], "Owner is not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }
        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function getTransaction(
        uint _txId
    )
        external
        view
        txExists(_txId)
        returns (address to, uint value, bytes memory data, bool executed)
    {
        Transaction storage txn = transactions[_txId];
        return (txn.to, txn.value, txn.data, txn.executed);
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function submit(
        address _to,
        uint _value,
        bytes calldata _data
    ) external onlyOwner {
        require(_to != address(0), "invalid address");

        require(_value > 0 || _data.length > 0, "empty tx");

        uint txId = transactions.length;

        transactions.push(
            Transaction({to: _to, value: _value, data: _data, executed: false})
        );

        emit Submit(txId, msg.sender, _to, _value, _data);
    }

    function approve(
        uint _txId
    ) external onlyOwner txExists(_txId) notApproved(_txId) notExecuted(_txId) {
        approved[_txId][msg.sender] = true;

        approvalCount[_txId] += 1;

        emit Approve(msg.sender, _txId);
    }

    // function _getApproveCount(uint _txId) private view returns (uint count) {
    //     for (uint i; i < owners.length; i++) {
    //         if (approved[_txId][owners[i]]) {
    //             count += 1;
    //         }
    //     }
    // }

    function execute(
        uint _txId
    ) external onlyOwner txExists(_txId) notExecuted(_txId) {
        // require(
        //     _getApproveCount(_txId) >= numConfirmationsRequired,
        //     "Approve < numConfirmationsRequired"
        // );
        Transaction storage transaction = transactions[_txId];

        require(
            approvalCount[_txId] >= numConfirmationsRequired,
            "Not enough confirmations"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );

        require(success, "Execution failed");

        emit Execute(_txId, transaction.to, transaction.value, success);
    }

    function revoke(
        uint _txId
    ) external onlyOwner txExists(_txId) notExecuted(_txId) {
        require(approved[_txId][msg.sender], "Tx not approved");

        approved[_txId][msg.sender] = false;
        approvalCount[_txId] -= 1;

        emit Revoke(msg.sender, _txId);
    }
}
