const Block = require('./block');

class Blockchain
{
	constructor() {
		this.chain=[Block.genesis()];
	}

	//adds new block in blockchain
	addBlock(data) {
		//const lastblock=this.chain[this.chain.length - 1];
		const block= Block.mineBlock(this.chain[this.chain.length - 1],data);
		this.chain.push(block);

		return block;
	}

	//validates incoming chain
	//check genesis block
	//check lasthash & hash for cryptographic validation 
	isValidchain(chain) {
		if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()) ){
			return false;
		}

		for(let i=1;i<chain.length;i++) {
			const block = chain[i];
			const lastblock =chain[i-1];

			if(block.lasthash !== lastblock.hash || block.hash !== Block.blockHash(block)) {
				return false;
			}
		}
		return true;
	}

	//replace the chain if its valid & length is greater than our current chain.
	replaceChain(newchain) {
		if(newchain.length <= this.chain.length) {
			console.log('recieved chain is not longer than currrent chain.')
			return;
		} 
		else if(!this.isValidchain(newchain)) {
			console.log('The recieved chain is not valid.');
			return;
		}
		this.chain=newchain;
		console.log('Replacing Blockchain with new chain.')
	}

	
}

module.exports=Blockchain;
