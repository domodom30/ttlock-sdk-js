"use strict";

export function stringifyBuffers(json: Object): Object {
  if (json === null || typeof json !== "object") {
    return json;
  }
  if (json instanceof Set || json instanceof Map) {
    return json;
  }
  if (json instanceof Buffer) {
    return json.toString("hex");
  }

  const result: any = Array.isArray(json) ? [] : {};
  Object.getOwnPropertyNames(json).forEach((key) => {
    const val = Reflect.get(json, key);
    if (val !== null && typeof val == "object") {
      result[key] = stringifyBuffers(val);
    } else {
      result[key] = val;
    }
  });
  return result;
}
