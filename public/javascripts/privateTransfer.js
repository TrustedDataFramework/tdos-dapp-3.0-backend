const fs = require('fs')
const snarkjs = require('snarkjs')
const crypto = require('crypto')
const circomlib = require('circomlib')
const bigInt = snarkjs.bigInt
const Web3 = require('web3')
const { toWei } = require('web3-utils')
const websnarkUtils = require('websnark/src/utils')
const assert = require('assert')
const merkleTree = require('../lib/MerkleTree')
const ETHTornadoJson = require('../contracts/artifacts/ETHTornado.json')
const buildGroth16 = require('websnark/src/groth16')

let web3, PRIVATE_KEY, tornado, netId, ETH_AMOUNT, senderAccount, ETHtornadoAddress, groth16, circuit, proving_key
let MERKLE_TREE_HEIGHT, currency, amount

/** Generate random number of specified byte length */
const rbigint = nbytes => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes))

/** Compute pedersen hash */
const pedersenHash = data => circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0]

/** BigNumber to hex string of specified length */
function toHex(number, length = 32) {
    const str = number instanceof Buffer ? number.toString('hex') : bigInt(number).toString(16)
    return '0x' + str.padStart(length * 2, '0')
}

/** Display ETH account balance */
async function printETHBalance({ address, name }) {
    console.log(`${name} ETH balance is`, web3.utils.fromWei(await web3.eth.getBalance(address).catch(console.log)))
}

async function init(type) {
    currency = process.env.currency
    amount = process.env.amount
    MERKLE_TREE_HEIGHT = process.env.MERKLE_TREE_HEIGHT || 20
    ETH_AMOUNT = process.env.ETH_AMOUNT
    if (type == 0) {
        PRIVATE_KEY = process.env.PRIVATE_KEY
    } else {
        PRIVATE_KEY = process.env.TO_PRIVATE_KEY
    }
    ETHtornadoAddress = process.env.ETHtornadoAddress

    circuit = require('../circuits/withdraw.json')
    proving_key = fs.readFileSync('./public/circuits/withdraw_proving_key.bin').buffer

    web3 = new Web3(process.env.url, null, { transactionConfirmationBlocks: 1 })
    if (PRIVATE_KEY) {
        const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY)
        web3.eth.accounts.wallet.add(PRIVATE_KEY)
        web3.eth.defaultAccount = account.address
        senderAccount = account.address
    } else {
        console.log('Warning! PRIVATE_KEY not found. Please provide PRIVATE_KEY in .env file if you deposit')
    }
    groth16 = await buildGroth16()
    netId = await web3.eth.net.getId()
    tornado = new web3.eth.Contract(ETHTornadoJson.abi, ETHtornadoAddress)
}

/**
 * Create deposit object from secret and nullifier
 */
function createDeposit({ nullifier, secret }) {
    const deposit = { nullifier, secret }
    deposit.preimage = Buffer.concat([deposit.nullifier.leInt2Buff(31), deposit.secret.leInt2Buff(31)])
    deposit.commitment = pedersenHash(deposit.preimage)
    deposit.commitmentHex = toHex(deposit.commitment)
    deposit.nullifierHash = pedersenHash(deposit.nullifier.leInt2Buff(31))
    deposit.nullifierHex = toHex(deposit.nullifierHash)
    return deposit
}

async function deposit({ currency, amount }) {
    const deposit = createDeposit({ nullifier: rbigint(31), secret: rbigint(31) })
    const note = toHex(deposit.preimage, 62)
    const noteString = `tornado-${currency}-${amount}-${netId}-${note}`
    console.log(`Your note: ${noteString}`)

    await printETHBalance({ address: tornado._address, name: 'Tornado' })
    await printETHBalance({ address: senderAccount, name: 'Sender account' })
    const value = ETH_AMOUNT
    console.log('Submitting deposit transaction')
    await tornado.methods.deposit(toHex(deposit.commitment)).send({ value, from: senderAccount, gas: 2e6 })
    await printETHBalance({ address: tornado._address, name: 'Tornado' })
    await printETHBalance({ address: senderAccount, name: 'Sender account' })

    return noteString
}

function parseNote(noteString) {
    const noteRegex = /tornado-(?<currency>\w+)-(?<amount>[\d.]+)-(?<netId>\d+)-0x(?<note>[0-9a-fA-F]{124})/g
    const match = noteRegex.exec(noteString)
    if (!match) {
        throw new Error('The note has invalid format')
    }

    const buf = Buffer.from(match.groups.note, 'hex')
    const nullifier = bigInt.leBuff2int(buf.slice(0, 31))
    const secret = bigInt.leBuff2int(buf.slice(31, 62))
    const deposit = createDeposit({ nullifier, secret })

    return { currency: match.groups.currency, deposit }
}

/**
 * Generate merkle tree for a deposit.
 * Download deposit events from the tornado, reconstructs merkle tree, finds our deposit leaf
 * in it and generates merkle proof
 * @param deposit Deposit object
 */
async function generateMerkleProof(deposit) {
    // Get all deposit events from smart contract and assemble merkle tree from them
    console.log('Getting current state from tornado contract')
    const events = await tornado.getPastEvents('Deposit', { fromBlock: 0, toBlock: 'latest' })
    const leaves = events
        .sort((a, b) => a.returnValues.leafIndex - b.returnValues.leafIndex) // Sort events in chronological order
        .map(e => e.returnValues.commitment)
    const tree = new merkleTree(MERKLE_TREE_HEIGHT, leaves)

    // Find current commitment in the tree
    const depositEvent = events.find(e => e.returnValues.commitment === toHex(deposit.commitment))
    const leafIndex = depositEvent ? depositEvent.returnValues.leafIndex : -1

    // Validate that our data is correct
    const root = await tree.root()
    const isValidRoot = await tornado.methods.isKnownRoot(toHex(root)).call()
    const isSpent = await tornado.methods.isSpent(toHex(deposit.nullifierHash)).call()
    assert(isValidRoot === true, 'Merkle tree is corrupted')
    assert(isSpent === false, 'The note is already spent')
    assert(leafIndex >= 0, 'The deposit is not found in the tree')

    // Compute merkle proof of our commitment
    return tree.path(leafIndex)
}
//3
/**
 * Generate SNARK proof for withdrawal
 * @param deposit Deposit object
 * @param recipient Funds recipient
 * @param relayer Relayer address
 * @param fee Relayer fee
 * @param refund Receive ether for exchanged tokens
 */
async function generateProof({ deposit, recipient, relayerAddress = 0, fee = 0, refund = 0 }) {
    // Compute merkle proof of our commitment
    const { root, path_elements, path_index } = await generateMerkleProof(deposit)

    // Prepare circuit input
    const input = {
        // Public snark inputs
        root: root,
        nullifierHash: deposit.nullifierHash,
        recipient: bigInt(recipient),
        relayer: bigInt(relayerAddress),
        fee: bigInt(fee),
        refund: bigInt(refund),

        // Private snark inputs
        nullifier: deposit.nullifier,
        secret: deposit.secret,
        pathElements: path_elements,
        pathIndices: path_index,
    }

    console.log('Generating SNARK proof')
    console.time('Proof time')
    const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, proving_key)
    const { proof } = websnarkUtils.toSolidityInput(proofData)
    console.timeEnd('Proof time')

    const args = [
        toHex(input.root),
        toHex(input.nullifierHash),
        toHex(input.recipient, 20),
        toHex(input.relayer, 20),
        toHex(input.fee),
        toHex(input.refund)
    ]
    return { proof, args }
}

async function Execdeposit() {
    await init(0)
    await deposit({ currency, amount })
}
//2
/**
 * Do an ETH withdrawal
 * @param noteString Note to withdraw
 * @param recipient Recipient address
 */
async function withdraw({ deposit, currency, recipient, refund = '0' }) {
    if (currency === 'eth' && refund !== '0') {
        throw new Error('The ETH purchase is supposted to be 0 for ETH withdrawals')
    }
    refund = toWei(refund)

    return await generateProof({ deposit, recipient, refund })

    // console.log('Submitting withdraw transaction')
    // await tornado.methods.withdraw(proof, ...args).send({ from: senderAccount, value: refund.toString(), gas: 1e6 })
    //     .on('error', function (e) {
    //         console.error('on transactionHash error', e.message)
    //     })

}
//1
async function Execwithdraw(noteString, recipient) {
    try {
        const { currency, deposit } = parseNote(noteString)
        await init(1)
        return await withdraw({ deposit, currency, recipient })
    }catch(e){
        return "";
        console.log( e );
    }

}

module.exports = {
    Execwithdraw:Execwithdraw
}
