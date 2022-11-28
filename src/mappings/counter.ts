import * as Schema from "../../generated/schema";

export function getCounterValue(name: string): i32 {
         const counter = Schema.Counter.load(name);
         return counter ? counter.value : 0;
       }

export function incrementCounter(name: string): i32 {
         let counter = Schema.Counter.load(name);
         let newCounterValue = getCounterValue(name) + 1;
         if (!counter) {
           counter = new Schema.Counter(name);
         }
         counter.value = newCounterValue;
         counter.save();
         return newCounterValue;
       }
