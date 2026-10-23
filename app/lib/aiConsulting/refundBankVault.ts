import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { REFUND_BANK_OPTIONS, type RefundBankCode } from "./refundBankOptions";

export type BankRefundDetails={accountNumber:string;accountHolder:string};

function encryptionKey():Buffer {
  const raw=process.env.AI_CREDIT_REFUND_BANK_KEY_B64?.trim()??"";
  // Base64 only: do not silently accept empty/weak keys.
  if(!/^[A-Za-z0-9+/]{43}=$/.test(raw))throw new Error("BANK_INTAKE_ENCRYPTION_UNAVAILABLE");
  const key=Buffer.from(raw,"base64");
  if(key.length!==32)throw new Error("BANK_INTAKE_ENCRYPTION_UNAVAILABLE");
  return key;
}
export function isBankCode(value:string):value is RefundBankCode {
  return REFUND_BANK_OPTIONS.some(option=>option.value===value);
}
export function validBankDetails(value:BankRefundDetails):boolean {
  return /^[0-9]{8,20}$/.test(value.accountNumber)
    && /^[가-힣a-zA-Z][가-힣a-zA-Z\s·.]{0,39}$/.test(value.accountHolder)
    && value.accountHolder.trim().length>=2;
}
export function encryptBankDetails(refundId:string, value:BankRefundDetails):string {
  if(!validBankDetails(value))throw new Error("BANK_INTAKE_INVALID_INPUT");
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",encryptionKey(),iv);
  cipher.setAAD(Buffer.from(refundId,"utf8"));
  const plaintext=Buffer.from(JSON.stringify(value),"utf8");
  const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  return ["v1",iv.toString("base64"),cipher.getAuthTag().toString("base64"),encrypted.toString("base64")].join(":");
}
export function decryptBankDetails(refundId:string,ciphertext:string):BankRefundDetails {
  const [version,iv,tag,encrypted,...rest]=ciphertext.split(":");
  if(version!=="v1"||!iv||!tag||!encrypted||rest.length)throw new Error("BANK_INTAKE_CIPHERTEXT_INVALID");
  const nonce=Buffer.from(iv,"base64"),authTag=Buffer.from(tag,"base64");
  if(nonce.length!==12||authTag.length!==16)throw new Error("BANK_INTAKE_CIPHERTEXT_INVALID");
  const decipher=createDecipheriv("aes-256-gcm",encryptionKey(),nonce);
  decipher.setAAD(Buffer.from(refundId,"utf8"));
  decipher.setAuthTag(authTag);
  const raw=Buffer.concat([decipher.update(Buffer.from(encrypted,"base64")),decipher.final()]).toString("utf8");
  const value=JSON.parse(raw) as BankRefundDetails;
  if(!validBankDetails(value))throw new Error("BANK_INTAKE_DECRYPTED_INVALID");
  return value;
}
