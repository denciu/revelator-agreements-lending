import { Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Transfer as TrackedTokenTransfer,
  Approval as TrackedTokenApproval,
} from "../../generated/TrackedToken/ERC20";
import * as Schema from "../../generated/schema";
import { networkName } from "../constants";
import { insertPushNotification } from "./pushNotification";


export function handleTrackedTokenTransfer(event: TrackedTokenTransfer): void {
  let trackedTokenTransfer = new Schema.TrackedTokenTransfer(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  trackedTokenTransfer.contract = event.address;
  trackedTokenTransfer.from = event.params.from;
  trackedTokenTransfer.network = networkName;
  trackedTokenTransfer.to = event.params.to;
  trackedTokenTransfer.value = event.params.value;
  trackedTokenTransfer.timestamp = event.block.timestamp;
  trackedTokenTransfer.blockHash = event.block.hash;
  trackedTokenTransfer.blockNumber = event.block.number;
  trackedTokenTransfer.transactionHash = event.transaction.hash;
  trackedTokenTransfer.logIndex = event.logIndex;
  trackedTokenTransfer.save();

  const isRoyaltyPayout = checkForRoyaltyPayoutTx(event.transaction.input)

  const isRoyaltyPayoutEthereumValue = ethereum.Value.fromBoolean(isRoyaltyPayout)
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
    isRoyaltyPayoutEthereumValue
  ];
  const tuple = changetype<ethereum.Tuple>(tupleArray);
  const encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;

  let agreement = Schema.Agreement.load(event.params.to.toHex());
  if (agreement) {
    let tokenTransferToAgreement = new Schema.TokenTransferToAgreement(
      `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
    )
    tokenTransferToAgreement.agreement = agreement.id
    tokenTransferToAgreement.from = trackedTokenTransfer.from
    tokenTransferToAgreement.to = trackedTokenTransfer.to
    tokenTransferToAgreement.transfer = trackedTokenTransfer.id
    tokenTransferToAgreement.isRoyaltyPayout = isRoyaltyPayout
    tokenTransferToAgreement.save()
    insertPushNotification(event, "__TokenTransferToAgreement(address,address,uint256)", encoded)

    for (let i = 0; i < agreement.holders.length; i++) {
      const agreementHolder = Schema.AgreementHolder.load(agreement.holders[i])
      if (agreementHolder) {
        const transfersToOwnedAgreements = agreementHolder.transfersToOwnedAgreements
        transfersToOwnedAgreements.push(tokenTransferToAgreement.id)
        agreementHolder.transfersToOwnedAgreements = transfersToOwnedAgreements
        agreementHolder.save()
      }
    }
  } else {
    insertPushNotification(event, "Transfer(address,address,uint256)", encoded);
  }
}

export function handleTrackedTokenApproval(event: TrackedTokenApproval): void {
  let trackedTokenApproval = new Schema.TrackedTokenApproval(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}`
  );
  trackedTokenApproval.contract = event.address;
  trackedTokenApproval.owner = event.params.owner;
  trackedTokenApproval.network = networkName
  trackedTokenApproval.spender = event.params.spender;
  trackedTokenApproval.value = event.params.value;
  trackedTokenApproval.timestamp = event.block.timestamp;
  trackedTokenApproval.blockHash = event.block.hash;
  trackedTokenApproval.blockNumber = event.block.number;
  trackedTokenApproval.transactionHash = event.transaction.hash;
  trackedTokenApproval.logIndex = event.logIndex;
  trackedTokenApproval.save();
}


function checkForRoyaltyPayoutTx(input: Bytes):boolean {
  if (input.length === 70 &&
    Bytes.fromUint8Array(input.subarray(68)) == Bytes.fromByteArray(Bytes.fromHexString("0xbeef"))
    ) {
    return true
  } else {
    return false
  }
}