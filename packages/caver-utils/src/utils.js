/*
 Modifications copyright 2018 The caver-js Authors
 This file is part of web3.js.

 web3.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 web3.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with web3.js.  If not, see <http://www.gnu.org/licenses/>.

 This file is derived from web3.js/packages/web3-utils/src/utils.js (2019/06/12).
 Modified and improved for the caver-js development.
 */
/**
 * @file utils.js
 * @author Fabian Vogelsteller <fabian@ethereum.org>
 * @date 2017
 */

var _ = require('underscore');
var BN = require('bn.js');
var numberToBN = require('number-to-bn');
var utf8 = require('utf8');
var Hash = require("eth-lib/lib/hash");
const RLP = require("eth-lib/lib/rlp")
const Account = require("eth-lib/lib/account")

var elliptic = require('elliptic')
var secp256k1 = new (elliptic.ec)('secp256k1')

const txTypeToString = {
  '0x20': 'ACCOUNT_UPDATE',
  '0x21': 'FEE_DELEGATED_ACCOUNT_UPDATE',
  '0x22': 'FEE_DELEGATED_ACCOUNT_UPDATE_WITH_RATIO',
  '0x08': 'VALUE_TRANSFER',
  '0x10': 'VALUE_TRANSFER_MEMO',
  '0x09': 'FEE_DELEGATED_VALUE_TRANSFER',
  '0x0a': 'FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO',
  '0x11': 'FEE_DELEGATED_VALUE_TRANSFER_MEMO',
  '0x12': 'FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO',
  '0x28': 'SMART_CONTRACT_DEPLOY',
  '0x29': 'FEE_DELEGATED_SMART_CONTRACT_DEPLOY',
  '0x2a': 'FEE_DELEGATED_SMART_CONTRACT_DEPLOY_WITH_RATIO',
  '0x30': 'SMART_CONTRACT_EXECUTION',
  '0x31': 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
  '0x32': 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO',
  '0x38': 'CANCEL',
  '0x39': 'FEE_DELEGATED_CANCEL',
  '0x3a': 'FEE_DELEGATED_CANCEL_WITH_RATIO',
  '0x48': 'CHAIN_DATA_ANCHROING',
}

/**
 * Returns true if object is BN, otherwise false
 *
 * @method isBN
 * @param {Object} object
 * @return {Boolean}
 */
var isBN = function (object) {
    return object instanceof BN ||
        (object && object.constructor && object.constructor.name === 'BN');
};

/**
 * Returns true if object is BigNumber, otherwise false
 *
 * @method isBigNumber
 * @param {Object} object
 * @return {Boolean}
 */
const isBigNumber = (object) => object && object.constructor && object.constructor.name === 'BigNumber'

/**
 * Takes an input and transforms it into an BN
 *
 * @method toBN
 * @param {Number|String|BN} number, string, HEX string or BN
 * @return {BN} BN
 */
function toBN(number) {
  try { return numberToBN.apply(null, arguments) }
  catch(e) { throw new Error(e + ' Given value: "'+ number +'"') }
}


/**
 * Takes and input transforms it into BN and if it is negative value, into two's complement
 *
 * @method toTwosComplement
 * @param {Number|String|BN} number
 * @return {String}
 */
var toTwosComplement = function (number) {
    return '0x'+ toBN(number).toTwos(256).toString(16, 64);
};

/**
 * Checks if the given string is an address
 *
 * @method isAddress
 * @param {String} address the given HEX address
 * @return {Boolean}
 */
var isAddress = function (address) {
    // check if it has the basic requirements of an address
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        return false;
        // If it's ALL lowercase or ALL upppercase
    } else if (/^(0x|0X)?[0-9a-f]{40}$/.test(address) || /^(0x|0X)?[0-9A-F]{40}$/.test(address)) {
        return true;
        // Otherwise check each case
    } else {
        return checkAddressChecksum(address);
    }
};



/**
 * Checks if the given string is a checksummed address
 *
 * @method checkAddressChecksum
 * @param {String} address the given HEX address
 * @return {Boolean}
 */
var checkAddressChecksum = function (address) {
    // Check each case
    address = address.replace(/^0x/i,'');
    var addressHash = sha3(address.toLowerCase()).replace(/^0x/i,'');

    for (var i = 0; i < 40; i++ ) {
        // the nth letter should be uppercase if the nth digit of casemap is 1
        if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
            return false;
        }
    }
    return true;
};

/**
 * Should be called to pad string to expected length
 *
 * @method leftPad
 * @param {String} string to be padded
 * @param {Number} chars that result string should have
 * @param {String} sign, by default 0
 * @returns {String} right aligned string
 */
var leftPad = function (string, chars, sign) {
    var hasPrefix = /^0x/i.test(string) || typeof string === 'number';
    string = string.toString(16).replace(/^0x/i,'');

    var padding = (chars - string.length + 1 >= 0) ? chars - string.length + 1 : 0;

    return (hasPrefix ? '0x' : '') + new Array(padding).join(sign ? sign : "0") + string;
};

/**
 * Should be called to pad string to expected length
 *
 * @method rightPad
 * @param {String} string to be padded
 * @param {Number} chars that result string should have
 * @param {String} sign, by default 0
 * @returns {String} right aligned string
 */
var rightPad = function (string, chars, sign) {
    var hasPrefix = /^0x/i.test(string) || typeof string === 'number';
    string = string.toString(16).replace(/^0x/i,'');

    var padding = (chars - string.length + 1 >= 0) ? chars - string.length + 1 : 0;

    return (hasPrefix ? '0x' : '') + string + (new Array(padding).join(sign ? sign : "0"));
};


/**
 * Should be called to get hex representation (prefixed by 0x) of utf8 string
 *
 * @method utf8ToHex
 * @param {String} str
 * @returns {String} hex representation of input string
 */
var utf8ToHex = function(str) {
    str = utf8.encode(str);
    var hex = "";

    // remove \u0000 padding from either side
    str = str.replace(/^(?:\u0000)*/,'');
    str = str.split("").reverse().join("");
    str = str.replace(/^(?:\u0000)*/,'');
    str = str.split("").reverse().join("");

    for(var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        // if (code !== 0) {
        var n = code.toString(16);
        hex += n.length < 2 ? '0' + n : n;
        // }
    }

    return "0x" + hex;
};

/**
 * Should be called to get utf8 from it's hex representation
 *
 * @method hexToUtf8
 * @param {String} hex
 * @returns {String} ascii string representation of hex value
 */
var hexToUtf8 = function(hex) {
    if (!isHexStrict(hex))
        throw new Error('The parameter "'+ hex +'" must be a valid HEX string.');

    var str = "";
    var code = 0;
    hex = hex.replace(/^0x/i,'');

    // remove 00 padding from either side
    hex = hex.replace(/^(?:00)*/,'');
    hex = hex.split("").reverse().join("");
    hex = hex.replace(/^(?:00)*/,'');
    hex = hex.split("").reverse().join("");

    var l = hex.length;

    for (var i=0; i < l; i+=2) {
        code = parseInt(hex.substr(i, 2), 16);
        // if (code !== 0) {
        str += String.fromCharCode(code);
        // }
    }

    return utf8.decode(str);
};


/**
 * Converts value to it's number representation
 *
 * @method hexToNumber
 * @param {String|Number|BN} value
 * @return {String}
 */
var hexToNumber = function (value) {
  if (!value) return value
  return toBN(value).toNumber()
}

/**
 * Converts value to it's decimal representation in string
 *
 * @method hexToNumberString
 * @param {String|Number|BN} value
 * @return {String}
 */
var hexToNumberString = function (value) {
    if (!value) return value;

    return toBN(value).toString(10);
};


/**
 * Converts value to it's hex representation
 *
 * @method numberToHex
 * @param {String|Number|BN} value
 * @return {String}
 */
var numberToHex = function (value) {
    if (_.isNull(value) || _.isUndefined(value)) {
        return value;
    }

    if (!isFinite(value) && !isHexStrict(value)) {
        throw new Error('Given input "'+value+'" is not a number.');
    }

    var number = toBN(value);
    var result = number.toString(16);

    return number.lt(new BN(0)) ? '-0x' + result.substr(1) : '0x' + result;
};


/**
 * Convert a byte array to a hex string
 *
 * Note: Implementation from crypto-js
 *
 * @method bytesToHex
 * @param {Array} bytes
 * @return {String} the hex string
 */
var bytesToHex = function(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        // eslint-disable-next-line no-bitwise
        hex.push((bytes[i] >>> 4).toString(16));

        // eslint-disable-next-line no-bitwise
        hex.push((bytes[i] & 0xF).toString(16));
    }
    return '0x'+ hex.join("");
};

/**
 * Convert a hex string to a byte array
 *
 * Note: Implementation from crypto-js
 *
 * @method hexToBytes
 * @param {string} hex
 * @return {Array} the byte array
 */
var hexToBytes = function(hex) {
    hex = hex.toString(16);

    if (!isHexStrict(hex)) {
        throw new Error('Given value "'+ hex +'" is not a valid hex string.');
    }

    hex = hex.replace(/^0x/i,'');

    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
};

/**
 * Auto converts any given value into it's hex representation.
 *
 * And even stringifys objects before.
 *
 * @method toHex
 * @param {String|Number|BN|Object} value
 * @param {Boolean} returnType
 * @return {String}
 */
/* eslint-disable complexity */
var toHex = function (value, returnType) {
    if (isAddress(value)) {
        return returnType ? 'address' : '0x'+ value.toLowerCase().replace(/^0x/i,'');
    }

    if (_.isBoolean(value)) {
        return returnType ? 'bool' : value ? '0x01' : '0x00';
    }


    if (_.isObject(value) && !isBigNumber(value) && !isBN(value)) {
        return returnType ? 'string' : utf8ToHex(JSON.stringify(value));
    }

    // if its a negative number, pass it through numberToHex
    if (_.isString(value)) {
        if (value.indexOf('-0x') === 0 || value.indexOf('-0X') === 0) {
            return returnType ? 'int256' : numberToHex(value);
        } else if(value.indexOf('0x') === 0 || value.indexOf('0X') === 0) {
            return returnType ? 'bytes' : value;
        } else if (!isFinite(value)) {
            return returnType ? 'string' : utf8ToHex(value);
        }
    }

    return returnType ? (value < 0 ? 'int256' : 'uint256') : numberToHex(value);
};
/* eslint-enable complexity */

/**
 * Check if string is HEX, requires a 0x in front
 *
 * @method isHexStrict
 * @param {String} hex to be checked
 * @returns {Boolean}
 */
var isHexStrict = function (hex) {
    return ((_.isString(hex) || _.isNumber(hex)) && /^(-)?0x[0-9a-f]*$/i.test(hex));
};

/**
 * Check if string is HEX
 *
 * @method isHex
 * @param {String} hex to be checked
 * @returns {Boolean}
 */
var isHex = function (hex) {
    return ((_.isString(hex) || _.isNumber(hex)) && /^(-0x|0x)?[0-9a-f]*$/i.test(hex));
};


/**
 * Returns true if given string is a valid Klaytn block header bloom.
 *
 * TODO UNDOCUMENTED
 *
 * @method isBloom
 * @param {String} hex encoded bloom filter
 * @return {Boolean}
 */
var isBloom = function (bloom) {
    if (!/^(0x)?[0-9a-f]{512}$/i.test(bloom)) {
        return false;
    } else if (/^(0x)?[0-9a-f]{512}$/.test(bloom) || /^(0x)?[0-9A-F]{512}$/.test(bloom)) {
        return true;
    }
    return false;
};

/**
 * Returns true if given string is a valid log topic.
 *
 * TODO UNDOCUMENTED
 *
 * @method isTopic
 * @param {String} hex encoded topic
 * @return {Boolean}
 */
var isTopic = function (topic) {
    if (!/^(0x)?[0-9a-f]{64}$/i.test(topic)) {
        return false;
    } else if (/^(0x)?[0-9a-f]{64}$/.test(topic) || /^(0x)?[0-9A-F]{64}$/.test(topic)) {
        return true;
    }
    return false;
};

const parsePredefinedBlockNumber = (blockNumber) => {
  switch (blockNumber) {
    case 'genesis':
    case 'earliest':
      return '0x0'
    default:
      return blockNumber
  }
}

var isPredefinedBlockNumber = function (blockNumber) {
  return blockNumber === 'latest'
    || blockNumber === 'pending'
    || blockNumber === 'earliest'
    || blockNumber === 'genesis'
};

/**
 * valid block number should be one of a type below:
 * 1) predefined block number ex:) 'latest', 'earliest', 'pending', 'genesis'
 * 2) hex
 * 3) finite number
 * @param  {String | Number}  blockNumber
 * @return {Boolean}
 */
var isValidBlockNumberCandidate = (blockNumber) => {
  return isPredefinedBlockNumber(blockNumber)
    || isHexStrict(blockNumber)
    || Number.isFinite(Number(blockNumber))
}


/**
 * Hashes values to a sha3 hash using keccak 256
 *
 * To hash a HEX string the hex must have 0x in front.
 *
 * @method sha3
 * @return {String} the sha3 string
 */
var SHA3_NULL_S = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';

var sha3 = function (value) {
  // return null when value is not string type.
  if (typeof value === 'number') return null

  if (isHexStrict(value) && /^0x/i.test((value).toString())) {
    value = hexToBytes(value)
  }

  if (isBN(value)) {
    value = value.toString(10)
  }

  var returnValue = Hash.keccak256(value)

  if (returnValue === SHA3_NULL_S) {
    return null
  } else {
    return returnValue
  }
}
// expose the under the hood keccak256
sha3._Hash = Hash;

function parsePrivateKey(privateKey) {
  const has0xPrefix = privateKey.slice(0, 2) === '0x'
  privateKey = has0xPrefix ? privateKey.slice(2) : privateKey

  if (privateKey.length !== 110 && privateKey.length !== 64) {
    throw new Error('Invalid private key(' + privateKey + ')')
  }

  const parsedPrivateKey = privateKey.slice(0, 64)

  if (!this.isHex(parsedPrivateKey)) {
    throw new Error('Invalid private key format : privateKey must be in hex format.')
  }

  if (privateKey.length !== 110) {
     return {
      privateKey: '0x' + privateKey, 
      address: '',
      isHumanReadable: false, 
    }
  }

  const humanReadableFlag = privateKey.slice(66, 68)
  if (humanReadableFlag === '01') throw new Error('HumanReadableAddress is not supported yet.')
  const parsedAddress = privateKey.slice(68)
  return {
    privateKey: '0x' + parsedPrivateKey, 
    address: parsedAddress,
    isHumanReadable: false, 
  }
}

const isKlaytnWalletKey = (privateKey) => {
  const has0xPrefix = privateKey.slice(0, 2) === '0x'
  privateKey = has0xPrefix ? privateKey.slice(2) : privateKey

  if (privateKey.length !== 110) {
     return false
  }

  return true
}

function isValidPrivateKey(privateKey) {
  if (typeof privateKey !== 'string') return false

  const has0xPrefix = privateKey.slice(0, 2) === '0x'
  privateKey = has0xPrefix ? privateKey.slice(2) : privateKey
  // Private key validation 1: private key should be string and minimum length of it is 64.
  if (privateKey.length !== 64 || !isHex(privateKey)) return false

  // order n value in secp256k1. privateKey should be less than order n value.
  const VALID_PRIVATE_KEY_LIMIT = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
  return privateKey.toUpperCase() < VALID_PRIVATE_KEY_LIMIT
}

// Check is 1)Number string or 2)Hex string or 3)Number.
function isValidNSHSN(value) {
  switch (typeof value) {
    case 'number':
      if (value < 0)
        return false
      break
    case 'string':
      if (Number(value) != value && !utils.isHexStrict(value))
        return false
      break
    default:
      return false
  }

  return true
}

const rlpEncode = (data) => RLP.encode(data)

const rlpDecode = (encodedData) => RLP.decode(encodedData)

const xyPointFromPublicKey = (publicKey) => {
  publicKey = publicKey.replace('0x', '')
  if (publicKey.length !== 128) throw Error('Invalid public key') // + 2 means '0x'

  const pubX = '0x' + publicKey.slice(0, 64).replace(/^0+/, '')
  const pubY = '0x' + publicKey.slice(64).replace(/^0+/, '')
  return [pubX, pubY]
}

var trimLeadingZero = function (hex) {
    while (hex && hex.startsWith('0x0')) {
        hex = '0x' + hex.slice(3);
    }
    return hex;
};

var makeEven = function (hex) {
    if(hex.length % 2 === 1) {
        hex = hex.replace('0x', '0x0');
    }
    return hex;
};

const resolveSignature = (signature) => {
  if (_.isArray(signature)) {
    const [v, r, s] = signature
    return [v, r, s]
  }

  if (_.isObject(signature)) {
    const { v, r, s } = signature
    if (!v || !r || !s) throw new Error('v, r, s fields should exist in signature')

    return [v, r, s]
  }

  if (_.isString(signature)) {

    const v = '0x' + signature.slice((64 * 2) + 2)
    const [_, r, s] = Account.decodeSignature(signature)
    return [v, r, s]
  }
}

const getTxTypeStringFromRawTransaction = (rawTransaction) => {
  if (typeof rawTransaction !== 'string') throw new Error('Invalid raw Tx', rawTransaction)

  const type = rawTransaction.slice(0, 4)

  const typeString = txTypeToString[type]

  return typeString
}

const isCompressedPublicKey = (publicKey) => {
  const compressedIndicators = ['02', '03']
  return publicKey.replace('0x', '').length === 66 && compressedIndicators.includes(publicKey.slice(2, 4))
}

const compressPublicKey = (uncompressedPublicKey) => {
  const isAlreadyCompressed = isCompressedPublicKey(uncompressedPublicKey)

  if (isAlreadyCompressed) return uncompressedPublicKey

  const xyPoints = xyPointFromPublicKey(uncompressedPublicKey)

  if (xyPoints === undefined || !xyPoints.length) {
    throw new Error('invalid public key')
  }

  const [x, y] = xyPoints

  const keyPair = secp256k1.keyPair({
    pub: {
      x: x.replace('0x', ''),
      y: y.replace('0x', '')
    },
    pubEnc: 'hex',
  })

  const compressedPublicKey = '0x' + keyPair.getPublic(true, 'hex')

  return compressedPublicKey
}

module.exports = {
    BN: BN,
    isBN: isBN,
    isBigNumber: isBigNumber,
    toBN: toBN,
    isAddress: isAddress,
    isBloom: isBloom, // TODO UNDOCUMENTED
    isTopic: isTopic, // TODO UNDOCUMENTED
    checkAddressChecksum: checkAddressChecksum,
    utf8ToHex: utf8ToHex,
    hexToUtf8: hexToUtf8,
    hexToNumber: hexToNumber,
    hexToNumberString: hexToNumberString,
    numberToHex: numberToHex,
    toHex: toHex,
    hexToBytes: hexToBytes,
    bytesToHex: bytesToHex,
    isHex: isHex,
    isHexStrict: isHexStrict,
    leftPad: leftPad,
    rightPad: rightPad,
    toTwosComplement: toTwosComplement,
    sha3: sha3,
    parsePredefinedBlockNumber: parsePredefinedBlockNumber,
    isPredefinedBlockNumber: isPredefinedBlockNumber,
    isValidBlockNumberCandidate: isValidBlockNumberCandidate,
    isValidPrivateKey: isValidPrivateKey,
    isValidNSHSN: isValidNSHSN,
    parsePrivateKey: parsePrivateKey,
    isKlaytnWalletKey: isKlaytnWalletKey,

    rlpEncode: rlpEncode,
    rlpDecode: rlpDecode,
    xyPointFromPublicKey: xyPointFromPublicKey,
    resolveSignature: resolveSignature,
    getTxTypeStringFromRawTransaction,
    trimLeadingZero,
    makeEven,
    txTypeToString,
    isCompressedPublicKey,
    compressPublicKey,
};
