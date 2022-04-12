require('dotenv').config({path: __dirname + '/.env'})


const {BN, Long, bytes, units} = require('@zilliqa-js/util');
const {Zilliqa} = require('@zilliqa-js/zilliqa');
const {MessageType} = require('@zilliqa-js/subscriptions');
const {
    getAddressFromPrivateKey,
} = require('@zilliqa-js/crypto');

const websocket = "wss://dev-ws.zilliqa.com"
const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');

const chainId = 333; // chainId of the developer testnet

const msgVersion = 1; // current msgVersion
const VERSION = bytes.pack(chainId, msgVersion);

// 1* ~ 3* Heroe Summons
var pendingH13Requests = []
var pendingH13BatchRequests = []
// 3* ~ 5* Heroe Summons
var pendingH35Requests = []
var pendingH35BatchRequests = []
// 1* ~ 3* Gear Summons
var pendingG13Requests = []
var pendingG13BatchRequests = []
// 3* ~ 5* Gear Summons
var pendingG35Requests = []
var pendingG35BatchRequests = []
// DL Heroes Summons
var pendingDLRequests = []

const CHUNK_SIZE = process.env.CHUNK_SIZE || 3
const MAX_RETRIES = process.env.MAX_RETRIES || 5
const SLEEP_INTERVAL = process.env.SLEEP_INTERVAL || 3000
const privateKey = process.env.OWNER_WALLET_PRIVATEKEY;
zilliqa.wallet.addByPrivateKey(privateKey);
const address = getAddressFromPrivateKey(privateKey);
let minGasPrice = 0;
let balance = 0;
let myGasPrice = 0;
let isGasSufficient = false;

async function initializeNetwork() {
    // Get Balance
    balance = await zilliqa.blockchain.getBalance(address);
    // Get Minimum Gas Price from blockchain
    minGasPrice = await zilliqa.blockchain.getMinimumGasPrice();

    console.log(`Your account balance is:`);
    console.log(balance.result);
    console.log(`Current Minimum Gas Price: ${minGasPrice.result}`);

    myGasPrice = units.toQa('2000', units.Units.Li); // Gas Price that will be used by all transactions
    console.log(`My Gas Price ${myGasPrice.toString()}`);

    isGasSufficient = myGasPrice.gte(new BN(minGasPrice.result)); // Checks if your gas price is less than the minimum gas price
    console.log(`Is the gas price sufficient? ${isGasSufficient}`);
}



// Listen for events from a contract - errors aren't caught
async function ListenForEvents(deployed_contract_base_16) {
    console.log(deployed_contract_base_16);
    const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
        websocket,
        {
            addresses: [
                deployed_contract_base_16
            ],
        },
    );

    console.log("Listener started");

    subscriber.emitter.on(MessageType.EVENT_LOG, async (event) => {
        if (event["value"]) {
            if (event["value"][0]["event_logs"] && event["value"][0]["event_logs"][0]) {
                let eventObj = event["value"][0]["event_logs"][0];
                console.log("event name==============>", eventObj["_eventname"]);
                console.log("event param=============>", eventObj["params"]);

                // Listen for GetLatestTWAPHol Event
                if (eventObj["_eventname"] === "RequestedH13RandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingH13Requests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedG13RandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingG13Requests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedH35RandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingH35Requests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedG35RandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingG35Requests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedHDLRandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingDLRequests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedH13BatchRandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingH13BatchRequests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedH35BatchRandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingH35BatchRequests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedG13BatchRandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingG13BatchRequests.push({callerAddress, id: requestId});
                }

                if (eventObj["_eventname"] === "RequestedG35BatchRandomNumber") {
                    let requestId = eventObj["params"][0]["value"];
                    let callerAddress = eventObj["params"][1]["value"];
                    pendingG35BatchRequests.push({callerAddress, id: requestId});
                }
            }
        }
    });
    await subscriber.start();
}

async function processQueue () {
    console.log("processing queue=============>");
    let processedH13Requests = 0
    let processedG13Requests = 0
    let processedH35Requests = 0
    let processedG35Requests = 0
    let processedDLRequests = 0
    let processedH13BatchRequests = 0
    let processedG13BatchRequests = 0
    let processedH35BatchRequests = 0
    let processedG35BatchRequests = 0

    while (pendingH13Requests.length > 0 && processedH13Requests < CHUNK_SIZE) {
        const req = pendingH13Requests.shift()
        await processH13Request(req.id, req.callerAddress)
        processedH13Requests++
    }

    while (pendingH35Requests.length > 0 && processedH35Requests < CHUNK_SIZE) {
        const req = pendingH35Requests.shift()
        await processH35Request(req.id, req.callerAddress)
        processedH35Requests++
    }

    while (pendingG13Requests.length > 0 && processedG13Requests < CHUNK_SIZE) {
        const req = pendingG13Requests.shift()
        await processG13Request(req.id, req.callerAddress)
        processedG13Requests++
    }

    while (pendingG35Requests.length > 0 && processedG35Requests < CHUNK_SIZE) {
        const req = pendingG35Requests.shift()
        await processG35Request(req.id, req.callerAddress)
        processedG35Requests++
    }

    while (pendingDLRequests.length > 0 && processedDLRequests < CHUNK_SIZE) {
        const req = pendingDLRequests.shift()
        await processDLRequest(req.id, req.callerAddress)
        processedDLRequests++
    }

    while (pendingH13BatchRequests.length > 0 && processedH13BatchRequests < CHUNK_SIZE) {
        const req = pendingH13BatchRequests.shift()
        await processH13BatchRequest(req.id, req.callerAddress)
        processedH13BatchRequests++
    }

    while (pendingG13BatchRequests.length > 0 && processedG13BatchRequests < CHUNK_SIZE) {
        const req = pendingG13BatchRequests.shift()
        await processG13BatchRequest(req.id, req.callerAddress)
        processedG13BatchRequests++
    }

    while (pendingH35BatchRequests.length > 0 && processedH35BatchRequests < CHUNK_SIZE) {
        const req = pendingH35BatchRequests.shift()
        await processH35BatchRequest(req.id, req.callerAddress)
        processedH35BatchRequests++
    }

    while (pendingG35BatchRequests.length > 0 && processedG35BatchRequests < CHUNK_SIZE) {
        const req = pendingG35BatchRequests.shift()
        await processG35BatchRequest(req.id, req.callerAddress)
        processedG35BatchRequests++
    }
}

async function processH13Request (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            const randomNumber = await getRandom();
            console.log("Received Random Number===========================>", randomNumber);
            await setH13Random(callerAddress, randomNumber, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setH13Random(callerAddress,  '0', id)
                return
            }
            retries++
        }
    }
}

async function processG13Request (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            const randomNumber = await getRandom();
            console.log("Received Random Number===========================>", randomNumber);
            await setG13Random(callerAddress, randomNumber, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setG13Random(callerAddress,  '0', id)
                return
            }
            retries++
        }
    }
}

async function processH35Request (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            const randomNumber = await getRandom();
            console.log("Received Random Number===========================>", randomNumber);
            await setH35Random(callerAddress, randomNumber, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setH35Random(callerAddress,  '0', id)
                return
            }
            retries++
        }
    }
}

async function processG35Request (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            const randomNumber = await getRandom();
            console.log("Received Random Number===========================>", randomNumber);
            await setG35Random(callerAddress, randomNumber, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setG35Random(callerAddress,  '0', id)
                return
            }
            retries++
        }
    }
}

async function processDLRequest (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            const randomNumber = await getRandom();
            console.log("Received Random Number===========================>", randomNumber);
            await setDLRandom(callerAddress, randomNumber, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setDLRandom(callerAddress,  '0', id)
                return
            }
            retries++
        }
    }
}

async function processH13BatchRequest (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            let randomNumbers = [];
            // 95 ~ 99 random number
            for(let i = 0; i < 9; i ++) {
                let randomNumber = await getRandom();
                randomNumbers.push(randomNumber);
            }
            let randomNumber = await getRandom();
            let rangedRand = 95 + Math.floor(Math.random() * 5);
            let firstRand = randomNumber + rangedRand;
            randomNumbers.push(firstRand);
            console.log("Received Batch Random Number===========================>", randomNumbers);
            await setH13BatchRandom(callerAddress, randomNumbers, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setH13BatchRandom(callerAddress,  ['0'], id)
                return
            }
            retries++
        }
    }
}

async function processH35BatchRequest (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            let randomNumbers = [];
            for(let i = 0; i < 9; i ++) {
                let randomNumber = await getRandom();
                randomNumbers.push(randomNumber);
            }
            let randomNumber = await getRandom();
            // 80 ~ 98 random number
            let rangedRand = 80 + Math.floor(Math.random() * 18);
            let firstRand = randomNumber + rangedRand;
            randomNumbers.push(firstRand);
            console.log("Received Batch Random Number===========================>", randomNumbers);
            await setH35BatchRandom(callerAddress, randomNumbers, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setH35BatchRandom(callerAddress,  ['0'], id)
                return
            }
            retries++
        }
    }
}

async function processG13BatchRequest (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            let randomNumbers = [];
            for(let i = 0; i < 9; i ++) {
                let randomNumber = await getRandom();
                randomNumbers.push(randomNumber);
            }
            let randomNumber = await getRandom();
            // 95 ~ 99 random number
            let rangedRand = 90 + Math.floor(Math.random() * 5);
            let firstRand = randomNumber + rangedRand;
            randomNumbers.push(firstRand);
            console.log("Received Batch Random Number===========================>", randomNumbers);
            await setG13BatchRandom(callerAddress, randomNumbers, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setG13BatchRandom(callerAddress,  ['0'], id)
                return
            }
            retries++
        }
    }
}

async function processG35BatchRequest (id, callerAddress) {
    let retries = 0
    while (retries < MAX_RETRIES) {
        try {
            let randomNumbers = [];
            let randomNumber = await getRandom();
            // 80 ~ 98 random number
            let rangedRand = 80 + Math.floor(Math.random() * 18);
            let firstRand = randomNumber + rangedRand;
            randomNumbers.push(firstRand);
            for(let i = 0; i < 9; i ++) {
                let randomNumber = await getRandom();
                randomNumbers.push(randomNumber);
            }

            console.log("Received Batch Random Number===========================>", randomNumbers);
            await setG35BatchRandom(callerAddress, randomNumbers, id)
            return
        } catch (error) {
            console.log("error while first step", error);
            if (retries === MAX_RETRIES - 1) {
                await setG35BatchRandom(callerAddress,  ['0'], id)
                return
            }
            retries++
        }
    }
}

async function setH13Random (callerAddress, randomNumber, id) {
    console.log("setting Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setH13RandomNumber',
            [
                {
                    vname: 'random_number',
                    type: 'Uint256',
                    value: randomNumber,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
           console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setG13Random (callerAddress, randomNumber, id) {
    console.log("setting Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setG13RandomNumber',
            [
                {
                    vname: 'random_number',
                    type: 'Uint256',
                    value: randomNumber,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
           console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setH35Random (callerAddress, randomNumber, id) {
    console.log("setting Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setH35RandomNumber',
            [
                {
                    vname: 'random_number',
                    type: 'Uint256',
                    value: randomNumber,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
            console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setG35Random (callerAddress, randomNumber, id) {
    console.log("setting Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setG35RandomNumber',
            [
                {
                    vname: 'random_number',
                    type: 'Uint256',
                    value: randomNumber,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
            console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setDLRandom (callerAddress, randomNumber, id) {
    console.log("setting Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setHDLRandomNumber',
            [
                {
                    vname: 'random_number',
                    type: 'Uint256',
                    value: randomNumber,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
            console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setH13BatchRandom (callerAddress, randomNumbers, id) {
    console.log("setting Batch Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setH13BatchRandomNumber',
            [
                {
                    vname: 'random_numbers',
                    type: 'List (Uint256)',
                    value: randomNumbers,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
            console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setH35BatchRandom (callerAddress, randomNumbers, id) {
    console.log("setting Batch Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setH35BatchRandomNumber',
            [
                {
                    vname: 'random_numbers',
                    type: 'List (Uint256)',
                    value: randomNumbers,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
            console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setG13BatchRandom (callerAddress, randomNumbers, id) {
    console.log("setting Batch Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setG13BatchRandomNumber',
            [
                {
                    vname: 'random_numbers',
                    type: 'List (Uint256)',
                    value: randomNumbers,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
            console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function setG35BatchRandom (callerAddress, randomNumbers, id) {
    console.log("setting Batch Random Number===========>");
    try {
        const rngOracleContract = zilliqa.contracts.at(process.env.RNG_ORACLE_ADDRESS);
        const callTx = await rngOracleContract.callWithoutConfirm(
            'setG35BatchRandomNumber',
            [
                {
                    vname: 'random_numbers',
                    type: 'List (Uint256)',
                    value: randomNumbers,
                },
                {
                    vname: 'caller_address',
                    type: 'ByStr20',
                    value: callerAddress,
                },
                {
                    vname: 'id',
                    type: 'Uint256',
                    value: id,
                }
            ],
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: VERSION,
                amount: new BN(0),
                gasPrice: myGasPrice,
                gasLimit: Long.fromNumber(8000),
            },
            false,
        );
        console.log("setting Random Number step 2===========>", callTx.id);
        const confirmedTxn = await callTx.confirm(callTx.id);
        console.log("setting Random Number step 3===========>", confirmedTxn.receipt);
        if (confirmedTxn.receipt.success === true) {
            console.log("==============Transaction is successful===============")
        }
    } catch (e) {
        console.log("Error while transaction===============>", e)
    }
}

async function getRandom() {
    // return uint256 random number
    let returnRand = '';
    for (let i = 0; i < 5 ; i++) {
        returnRand += (Math.floor(Math.random() * (2**32 - 1))).toString();
    }
    console.log(returnRand);
    return returnRand
}

(async () => {
    try {
        await initializeNetwork();
    } catch (e) {
        console.log("err while initializing====>", e);
    }
    try {
        await  ListenForEvents(process.env.RNG_ORACLE_ADDRESS);
    } catch (e) {
        console.log("err while listening events", e)
    }

    setInterval(async () => {
        try {
            await processQueue();
        } catch (e) {
            console.log("err while processing Queue=====>", e);
        }
    }, SLEEP_INTERVAL)
})()
