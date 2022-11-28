import {  Bytes, ethereum } from "@graphprotocol/graph-ts";
import * as Schema from "../../generated/schema";
import { networkName } from "../constants";
import { incrementCounter } from "./counter";


export function insertPushNotification(
  event: ethereum.Event,
  transactionDataSignature: string,
  transactionData: Bytes
): void {
  const newPushNotificationId = incrementCounter("PUSH_NOTIFICATION");
  let pushNotification = new Schema.PushNotification(
    `${event.transaction.hash.toHex()}-${event.logIndex.toString()}-${newPushNotificationId}`
  );
  pushNotification.contract = event.address;
  pushNotification.network = networkName;
  pushNotification.timestamp = event.block.timestamp;
  pushNotification.blockHash = event.block.hash;
  pushNotification.blockNumber = event.block.number;
  pushNotification.transactionHash = event.transaction.hash;
  pushNotification.logIndex = event.logIndex;
  pushNotification.signature = transactionDataSignature;
  pushNotification.transactionData = transactionData;
  pushNotification.seqNumber = newPushNotificationId
  pushNotification.save();
}