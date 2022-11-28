import {
  Transfer as AgreementTransfer,
  Approval as AgreementApproval,
  AdminAdded,
  AdminRemoved,
  UserIncomeCollected,
  DataHashChanged,
} from "../../generated/templates/Agreement/Agreement";
import * as Schema from "../../generated/schema";
import { BigInt, ipfs, store, ethereum, Bytes } from "@graphprotocol/graph-ts";
import { insertPushNotification } from "./pushNotification";
import { networkName } from "../constants";

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_BALANCE = new BigInt(0)

export function handleAgreementTransfer(event: AgreementTransfer): void {
  let agreement = Schema.Agreement.load(event.address.toHex());
  if (!agreement) {
    return;
  } else {
    if (event.params.from.toHex() == ZERO_ADDRESS) {
      agreement.totalSupply = agreement.totalSupply.plus(event.params.value);
    }
    let agreementTransfer = new Schema.AgreementTransfer(
      `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
    );
    agreementTransfer.contract = event.address;
    agreementTransfer.agreement = agreement.id;
    agreementTransfer.timestamp = event.block.timestamp;
    agreementTransfer.blockHash = event.block.hash;
    agreementTransfer.network = networkName;
    agreementTransfer.blockNumber = event.block.number;
    agreementTransfer.transactionHash = event.transaction.hash;
    agreementTransfer.logIndex = event.logIndex;
    agreementTransfer.from = event.params.from;
    agreementTransfer.to = event.params.to;
    agreementTransfer.value = event.params.value;
    agreementTransfer.save();

    let agreementHolders = agreement.holders;

    let agreementTransferReceiver = Schema.AgreementHolder.load(
      `${event.address.toHex()}-${event.params.to.toHex()}`
    );
    if (!agreementTransferReceiver) {
      agreementTransferReceiver = new Schema.AgreementHolder(
        `${event.address.toHex()}-${event.params.to.toHex()}`
      );
      agreementTransferReceiver.balance = event.params.value;
      agreementTransferReceiver.network = networkName;
      agreementTransferReceiver.holderAddress = event.params.to;
      agreementTransferReceiver.agreementAddress = event.address;
      agreementTransferReceiver.agreement = agreement.id;
      agreementTransferReceiver.save();
      agreementHolders.push(agreementTransferReceiver.id);
      agreement.holders = agreementHolders;
    } else {
      agreementTransferReceiver.balance = agreementTransferReceiver.balance.plus(
        event.params.value
      );
      agreementTransferReceiver.holderAddress = event.params.to;
      agreementTransferReceiver.agreementAddress = event.address;
      agreementTransferReceiver.save();
    }

    let agreementTransferSender = Schema.AgreementHolder.load(
      `${event.address.toHex()}-${event.params.from.toHex()}`
    );
    if (agreementTransferSender) {
      const currentBalance = agreementTransferSender.balance;
      if (
        currentBalance == event.params.value &&
        !agreementTransferSender.isAdmin
      ) {
        for (let i = 0; i < agreement.holders.length; i++) {
          if (agreement.holders[i] == agreementTransferSender.id) {
            agreementHolders.splice(i, 1);
          }
        }
        agreement.holders = agreementHolders;
        store.remove(
          "AgreementHolder",
          `${event.address.toHex()}-${event.params.from.toHex()}`
        );
      } else {
        agreementTransferSender.balance = currentBalance.minus(
          event.params.value
        );
        agreementTransferSender.save();
      }
    }

    let agreementTransfers = agreement.transfers
    agreementTransfers.push(agreementTransfer.id)
    agreement.transfers = agreementTransfers
    agreement.save()

    const from = ethereum.Value.fromAddress(event.params.from);
    const to = ethereum.Value.fromAddress(event.params.to);
    const value = ethereum.Value.fromUnsignedBigInt(event.params.value);
    const fixedSizedArray = ethereum.Value.fromFixedSizedArray([
      from,
      to,
    ]);
    const tupleArray: Array<ethereum.Value> = [
      fixedSizedArray,
      value,
      ethereum.Value.fromBoolean(false)
    ];
    const tuple = changetype<ethereum.Tuple>(tupleArray);
    const encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;
  
    insertPushNotification(event, "Transfer(address,address,uint256)", encoded);
  }
}

export function handleAgreementApproval(event: AgreementApproval): void {
  let agreement = Schema.Agreement.load(event.address.toHex());
  if (!agreement) {
    return;
  }

  let agreementApproval = new Schema.AgreementApproval(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  agreementApproval.contract = event.address;
  agreementApproval.timestamp = event.block.timestamp;
  agreementApproval.blockHash = event.block.hash;
  agreementApproval.network = networkName;
  agreementApproval.blockNumber = event.block.number;
  agreementApproval.transactionHash = event.transaction.hash;
  agreementApproval.logIndex = event.logIndex;
  agreementApproval.owner = event.params.owner;
  agreementApproval.spender = event.params.spender;
  agreementApproval.value = event.params.value;

  agreementApproval.save();
}

export function handleAdminAdded(event: AdminAdded): void {
  let agreement = Schema.Agreement.load(event.address.toHex());
  if (!agreement) {
    return;
  } else {
    let agreementHolder = Schema.AgreementHolder.load(
      `${event.address.toHex()}-${event.params.account.toHex()}`
    );
    if (agreementHolder) {
      agreementHolder.isAdmin = true;
    } else {
      agreementHolder = new Schema.AgreementHolder(
        `${event.address.toHex()}-${event.params.account.toHex()}`
      );
      agreementHolder.isAdmin = true;
      agreementHolder.balance = new BigInt(0);
      agreementHolder.network = networkName;
      agreementHolder.agreement = agreement.id;
      agreementHolder.holderAddress = event.params.account;
      agreementHolder.agreementAddress = event.address;
      let agreementHolders = agreement.holders;
      agreementHolders.push(agreementHolder.id);
      agreement.holders = agreementHolders;
    }
    agreement.save();
    agreementHolder.save();
  }

  let adminAdded = new Schema.AdminAdded(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  adminAdded.contract = event.address;
  adminAdded.network = networkName;
  adminAdded.timestamp = event.block.timestamp;
  adminAdded.blockHash = event.block.hash;
  adminAdded.agreement = agreement.id;
  adminAdded.blockNumber = event.block.number;
  adminAdded.transactionHash = event.transaction.hash;
  adminAdded.logIndex = event.logIndex;
  adminAdded.account = event.params.account;
  adminAdded.from = event.transaction.from;

  adminAdded.save();

  const address = ethereum.Value.fromAddress(event.params.account);
  const from = ethereum.Value.fromAddress(event.transaction.from);
  const isAdmin = ethereum.Value.fromBoolean(true);
  const fixedSizedArray = ethereum.Value.fromFixedSizedArray([
    from,
    address,
  ]);
  const tupleArray: Array<ethereum.Value> = [
    fixedSizedArray,
    isAdmin
  ];
  const tuple = changetype<ethereum.Tuple>(tupleArray);
  const encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;

  insertPushNotification(event, "AdminAdded(address)", encoded);
}

export function handleAdminRemoved(event: AdminRemoved): void {
  let agreement = Schema.Agreement.load(event.address.toHex());
  if (!agreement) {
    return;
  } else {
    let agreementHolder = Schema.AgreementHolder.load(
      `${event.address.toHex()}-${event.params.account.toHex()}`
    );
    if (agreementHolder) {
      if (agreementHolder.balance == ZERO_BALANCE) {
        let agreementHolders = agreement.holders;
        for (let i = 0; i < agreement.holders.length; i++) {
          if (agreement.holders[i] == agreementHolder.id) {
            agreementHolders.splice(i, 1);
          }
        }
        agreement.holders = agreementHolders;
        agreement.save();
        store.remove(
          "AgreementHolder",
          `${event.address.toHex()}-${event.params.account.toHex()}`
        );
      } else {
        agreementHolder.isAdmin = false;
        agreementHolder.save();
      }
    }
  }

  let adminRemoved = new Schema.AdminRemoved(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  adminRemoved.contract = event.address;
  adminRemoved.network = networkName;
  adminRemoved.timestamp = event.block.timestamp;
  adminRemoved.blockHash = event.block.hash;
  adminRemoved.agreement = agreement.id;
  adminRemoved.blockNumber = event.block.number;
  adminRemoved.transactionHash = event.transaction.hash;
  adminRemoved.logIndex = event.logIndex;
  adminRemoved.account = event.params.account;
  adminRemoved.from = event.transaction.from;

  adminRemoved.save();

  const address = ethereum.Value.fromAddress(event.params.account);
  const from = ethereum.Value.fromAddress(event.transaction.from);
  const isAdmin = ethereum.Value.fromBoolean(false);
  const fixedSizedArray = ethereum.Value.fromFixedSizedArray([
    from,
    address,
  ]);
  const tupleArray: Array<ethereum.Value> = [
    fixedSizedArray,
    isAdmin
  ];
  const tuple = changetype<ethereum.Tuple>(tupleArray);
  const encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;

  insertPushNotification(event, "AdminRemoved(address)", encoded);
}

export function handleUserIncomeCollected(event: UserIncomeCollected): void {
  let agreement = Schema.Agreement.load(event.address.toHex());
  if (agreement) {
    let userIncomeCollected = new Schema.UserIncomeCollected(
      `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
    );
    const isRoyaltyPayout = checkForRoyaltyPayoutTx(event.transaction.input)
    userIncomeCollected.contract = event.address;
    userIncomeCollected.agreement = agreement.id
    userIncomeCollected.network = networkName;
    userIncomeCollected.timestamp = event.block.timestamp;
    userIncomeCollected.blockHash = event.block.hash;
    userIncomeCollected.blockNumber = event.block.number;
    userIncomeCollected.transactionHash = event.transaction.hash;
    userIncomeCollected.logIndex = event.logIndex;
    userIncomeCollected.account = event.params.account;
    userIncomeCollected.value = event.params.value;
    userIncomeCollected.isRoyaltyPayout = isRoyaltyPayout
    if (isRoyaltyPayout) {
      userIncomeCollected.originalPayoutTxHash = Bytes.fromUint8Array(event.transaction.input.subarray(36))
    }
  
    userIncomeCollected.save();

    const isRoyaltyPayoutEthereumValue = ethereum.Value.fromBoolean(isRoyaltyPayout)
    const from = ethereum.Value.fromAddress(event.address);
    const to = ethereum.Value.fromAddress(event.params.account);
    const value = ethereum.Value.fromUnsignedBigInt(event.params.value);
    const fixedSizedArray = ethereum.Value.fromFixedSizedArray([
      from,
      to,
    ]);
    const tupleArray: Array<ethereum.Value> = [
      fixedSizedArray,
      value,
      isRoyaltyPayoutEthereumValue
    ];
    const tuple = changetype<ethereum.Tuple>(tupleArray);
    const encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;

    insertPushNotification(event, "UserIncomeCollected(address,uint256)", encoded);
  }
}

export function handleDataHashChanged(event: DataHashChanged): void {
  let agreement = Schema.Agreement.load(event.address.toHex());
  if (!agreement) {
    return;
  } else {
    const ipfsContractData = ipfs.cat(event.params.dataHash)
    agreement.dataHash = event.params.dataHash;
    if (ipfsContractData) {
      agreement.contractData = ipfsContractData.toString();
    }
    agreement.save();
  }

  let dataHashChanged = new Schema.DataHashChanged(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  dataHashChanged.contract = event.address;
  dataHashChanged.timestamp = event.block.timestamp;
  dataHashChanged.network = networkName;
  dataHashChanged.blockHash = event.block.hash;
  dataHashChanged.blockNumber = event.block.number;
  dataHashChanged.transactionHash = event.transaction.hash;
  dataHashChanged.logIndex = event.logIndex;
  dataHashChanged.dataHash = event.params.dataHash;
  
  dataHashChanged.save();
}


function checkForRoyaltyPayoutTx(input: Bytes):boolean {
  if (input.length > 36) {
    return true
  } else {
    return false
  }
}
