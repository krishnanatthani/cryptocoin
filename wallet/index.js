const ChainUtil =require('../chain-util');
const Transaction = require('./transaction');
const {INITIAL_BALANCE} = require('../config');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

class Wallet
{
	constructor() {
		this.balance= INITIAL_BALANCE;
		this.keyPair= ChainUtil.genKeyPair();
		this.publicKey=this.keyPair.getPublic().encode('hex');
		this.privateKey=ChainUtil.extractPrivateKey(this.keyPair);
	}

	//load object with custom user values
	loadWallet (privateKey,publicKey) {
		this.publicKey = publicKey;
		this.privateKey=privateKey;
	}

	toString() {
		return `wallet-
		publicKey: ${this.publicKey.toString()}
		keyPair: ${this.keyPair}
		balance:${this.balance}
		`;
	}

	//perform digital signature on hash using private key
	sign(dataHash) {
		return ec.sign(dataHash,this.privateKey);
	}

	//create new transaction
	//check if necessary balance available
	//if transaction exists then just update else create transaction
	//add in transaction pool
	createTransaction(recipient,ammount,blockchain,transactionpool) {
		this.balance = this.calculateBalance(blockchain);
		if(ammount > this.balance){
			console.log(`ammount :${ammount} exceeds the current balance :${this.balance}`);
			return;
		}
		let transaction=transactionpool.existingTransaction(this.publicKey);

		if(transaction) {
			transaction.update(this,recipient,ammount);
		}
		else {
			transaction=Transaction.newTransaction(this,recipient,ammount);
			transactionpool.updateOrAddTransaction(transaction);
		}

		return transaction;
	}

	//calculate balance by performing audits on previous blockchain transactions of miner
	//filter out all transactions of user by using his public key
	//according to timestamps start auditing & calculate balance
	calculateBalance(blockchain) {
		let balance = this.balance;
		let transactions = [];

		blockchain.chain.forEach(block => block.data.forEach(transaction => {
			transactions.push(transaction);
		}));

		const walletInputTs = transactions.filter(transaction => transaction.input.address === this.publicKey);


		let startTime =0;

		if(walletInputTs.length > 0) {
			const recentInputT= walletInputTs.reduce((prev,current) => prev.input.timestamp > current.input.timestamp ? prev : current);	
			balance = recentInputT.outputs.find(output => output.address === this.publicKey).ammount;
			startTime = recentInputT.input.timestamp;
		}

		transactions.forEach(transaction => {
			if(transaction.input.timestamp >startTime) {
				transaction.outputs.find(output => {
					if(output.address === this.publicKey)
					{
						balance += output.ammount;
					}
				});
			}
		});

		return balance;
	}

	//calculate balance by performing audits on previous blockchain transactions of user
	//filter out all transactions of user by using his public key
	//according to timestamps start auditing & calculate balance
	static calculateBalance(blockchain,publicKey) {
		let balance = INITIAL_BALANCE;
		let transactions = [];

		blockchain.chain.forEach(block => block.data.forEach(transaction => {
			transactions.push(transaction);
		}));

		const walletInputTs = transactions.filter(transaction => transaction.input.address === publicKey);


		let startTime =0;

		if(walletInputTs.length > 0) {
			const recentInputT= walletInputTs.reduce((prev,current) => prev.input.timestamp > current.input.timestamp ? prev : current);	
			balance = recentInputT.outputs.find(output => output.address === publicKey).ammount;
			startTime = recentInputT.input.timestamp;
		}

		transactions.forEach(transaction => {
			if(transaction.input.timestamp >startTime) {
				transaction.outputs.find(output => {
					if(output.address === publicKey) {
						balance += output.ammount;
					}
				});
			}
		});

		return balance;
	}

	//by using public key filter out all the debit transactions from blockchain
	//return all tranasction as JS object
	static getTransactions(blockchain,publicKey) {
		let transactions = [];
		let tnxobj;
		let txns=[];

		var id,recip,amt,bal,d,time;

		blockchain.chain.forEach(block => block.data.forEach(transaction => {
			transactions.push(transaction);
		}));

		const walletInputTs = transactions.filter(transaction => transaction.input.address === publicKey);

		walletInputTs.forEach(transaction =>{
			id=transaction.id;
			d = new Date(transaction.input.timestamp);
			time = d.toLocaleString();
			transaction.outputs.find(output => {
				if(output.address === publicKey) {
					bal=output.ammount;
				}
				else {
					amt=output.ammount;
					recip=output.address;
				}
				tnxobj = {Tid:id,time:time,recipient:recip,ammount:amt,balance:bal,status:"complete"};
			});
			txns.push(tnxobj);
		});
		
		return txns;
	}

	//by using public key filter out all the debit transactions from blockchain
	//return all tranasction as JS object
	static getCreditedTransactions(blockchain,publicKey) {
		let transactions = [];
		let tnxobj;
		let txns=[];

		var id,sender,amt,d,time;

		blockchain.chain.forEach(block => block.data.forEach(transaction => {
			transactions.push(transaction);
		}));

		const walletInputTs = transactions.filter(transaction => transaction.input.address !== publicKey);

		walletInputTs.forEach(transaction =>{
			id=transaction.id;
			d = new Date(transaction.input.timestamp);
			time = d.toLocaleString();
			sender=transaction.input.address;

			transaction.outputs.find(output => {
				if(output.address === publicKey) {
					amt=output.ammount;
					tnxobj = {Tid:id,time:time,sender:sender,ammount:amt,status:"complete"};
					txns.push(tnxobj);
				}
			});			
		});
		
		return txns;
	}

	//static blockchain class for rewarding the miner
	static blockchainWallet() {
		var blockchainWallet = new this();
		blockchainWallet.address= 'blockchain-wallet';
		return blockchainWallet;
	}
	
}

module.exports = Wallet;
