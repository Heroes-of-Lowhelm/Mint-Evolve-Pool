```
RNG_ORACLE_ADDRESS=0xd17284279b37f48c931f60d6e5327b664e39dd13
MINTING_POOL_ADDRESS=0xa4aaa10164fa8a26e11a9b720be7ed69287814d5
GEAR_NFT_ADDRESS=0x7f67a5f71d5ae6c75922f84d437843d70154ad0e
HEROES_NFT_ADDRESS=0x473b3b2530fa7188bab55fccf392045fbf361dde
DL_HEROES_NFT_ADDRESS=0xc3f5826919baceed72f34ff53c79c59379305b48
GEAR_TRAIT_ADDRESS=0x5ce6c0783ee4de9db5111e1fb7d56c2e3c761804
HEROS_EVOLUTION_ADDRESS=0x93b2387303c89fcce1b00a2d214b0e498dde8c30
DL_HEROES_EVOLUTION_ADDRESS=0x91ddadcc8c4be50a487b9a6e23c9470357391290
GEAR_EVOLTUION_ADDRESS=0x933810e4a7ea1dbcf957f5bcb85fa2479e38f68a
```

## RNG_Oracle
### Oracle Client
- Always listen Oracle Contract's emitted events and filter 2 events : RequestedRandomNumber and RequestedBatchRandomNumber.
- Oracle client calls processQueue() function time interval, and this function process requests in the pendingRequests and pendingBatchRequests List.
- processRequest() function gets 1 random number and then set it to the Oracle Contract by invoking setRandomNumber() transition
- processBatchRequest() function gets 10 random numbers (1 is 90 for level 4) and then set it to the Oracle Contract by invoking setBatchRandomNumber() transitoin.
### Oracle Contract
- requestRandomNumber() ====> Generate random requset id and then returns it to the caller contract by invoking "getRequestId" transition
- requestBatchRandomNumber() ====> Generate random request id and then returns it to the caller contract by invoking "getBatchRequestId" transition
- setRandomNumber(randomNumber: Uint256, callerAddress: ByStr20, id: Uint256) ====> Returns Random Number to _callerAddress by invoking "callback" transition on it. Only contract owner allowed invoking.
- setBatchRandomNumber(randomNumbers: List (Uint256), callerAddress: ByStr20, id: Uint256) ====> Returns Batch Random Numbers to _callerAddress by invoking "callbackBatch" transition on it. Only contract owner allowed invoking.


## MintingPool Contract
- Need to set the Oracle Contract Address first.
- MintNFT() transition ===> This transition invokes requestRandomNumber() transition in the oracle contract. And then getRequestId transition is invoked by the Oracle Client to receive the id.
- BatchMintNFT() transition ===> This transition invokes requestBatchRandomNumber() transition in the oracle contract. And then getBatchRequestId transition is invoked by the Oracle Clint to receive the id.
- callback() transition ===> This transition is invoked by the Oracle Client after MintNFT() transition is called by the users. This transition receives the generated random number first, and then call Mint() transition in the Heroes NFT contract.
- callbackBatch() transition ===> This transition is invoked by the Oracle Client after BatchMintNFT() transition is called by the users. This transition receives the generated random numbers (x10) first, and then call BatchMint() transition in the Heroes NFT contract.

## Heroes NFT Contract
- This contract is built on the ZRC6 contract.
- 1* ~ 3* Heroes Summons and 3* ~ 5* Heroes Summons are here by assigning is_high_level (Boolen Type)param
- The generated NFT's traits(name, level) are determined from the Random Number.

## DL Heroes NFT Contract
- This contract is built on the ZRC6 contract.
- The generated NFT's trait (name, level) are determined from the Random Number.

## Gears NFT Contract
- This contract is built on the ZRC6 contract
- After minting, it gets NFT's (name, level, mainstat, substats) trait from GearsTrait contract.

## Gears Trait Contract
- This contract returns NFT's trait based on the assigned random number.
- 
...

## Steps to deploy
- Deploy Oracle Contract


- Set env variables of Oracle Client (Oracle Contract address is needed) and then run it on VPS


- Deploy Heroes NFT Contract with name, symbol, owner address ...

    ** GasLimit - 50000

    ** Gas Price - 2000000000


- Deploy DL Heroes NFT Contract with name, symbol, owner address ...

    ** GasLimit - 50000

    ** Gas Price - 2000000000


- Deploy Gears Trait contract
  
    ** Gas Limit - 8000
    
    ** Gas Price - 4000000000


- Deploy Gears NFT contract with name, symbol, owner address ...
  
  ** GasLimit - 50000

  ** Gas Price - 2000000000

  ** Set GearTrait contract address (SetTraitAddr() transition)


- Deploy Minting Contract
  (40000, 200000000)

  ** Set HeroesNFT Contract address

  ** Set DLHeroesNFT Contract address

  ** Set GearsNFT Contract address

  ** Set Oracle Contract address


- NFT contracts configuration

  ** Call AddMinter(minter: ByStr20) transition with the Minting Contract address to allow for it to Mint tokens
  
  ** call SetEvolutionAddr(address: ByStr20) transition with the Evolution contact addresses


- Deploy HeroesEvolution contract
  
  ** set NFT contract address by invoking SetNFTAddr() transition


- Deploy DLHeroesEvolution contract

  ** set NFT contract address by invoking SetNFTAddr() transition


- Deploy GearsEvolution contract

  ** set NFT contract address by invoking SetNFTAddr() transition
