var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra2) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra2);
  }, set [name](x) {
    return __privateSet(this, extra2, x);
  } }, name));
  k ? p && k < 4 && __name(extra2, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra2 : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra2 : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra2 : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra2 = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra2 : desc : target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// src/bridge.ts
import { promises as fs2 } from "node:fs";

// ../../zrepo/deepseek-harness/vendor/cosmokit/src/misc.ts
function isNullable(value) {
  return value === null || value === void 0;
}
function isPlainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}
function filterKeys(object, filter) {
  return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
function mapValues(object, transform) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
function pick(source, keys, forced) {
  if (!keys) return { ...source };
  const result = {};
  for (const key of keys) {
    if (forced || source[key] !== void 0) result[key] = source[key];
  }
  return result;
}
function defineProperty(object, key, value) {
  return Object.defineProperty(object, key, { writable: true, value, enumerable: false });
}

// ../../zrepo/deepseek-harness/vendor/cosmokit/src/volatile.ts
var write = /* @__PURE__ */ Symbol.for("cosmokit.volatile.write");
function snapshot(value, ancestors = /* @__PURE__ */ new Set()) {
  if (typeof value === "function") throw new TypeError("volatile config cannot contain functions");
  if (value === null || typeof value !== "object") return value;
  if (ancestors.has(value)) throw new TypeError("volatile config cannot contain cycles");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return Object.freeze(value.map((item) => snapshot(item, ancestors)));
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new TypeError("volatile config objects must be plain objects or arrays");
    }
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, snapshot(item, ancestors)])));
  } finally {
    ancestors.delete(value);
  }
}
function createVolatile(value) {
  let current = snapshot(value);
  return Object.freeze({
    get: () => current,
    [write]: (value2) => {
      current = value2;
    }
  });
}
function isVolatile(value) {
  return typeof value === "object" && value !== null && write in value;
}

// ../../zrepo/deepseek-harness/vendor/cosmokit/src/types.ts
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
((Binary2) => {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) {
      return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    } else {
      return source;
    }
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(source).toString("base64");
    }
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex;
  function fromHex(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) {
      buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    }
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function clone(source, refs = /* @__PURE__ */ new Map()) {
  if (!source || typeof source !== "object") return source;
  if (is("Date", source)) return new Date(source.valueOf());
  if (is("RegExp", source)) return new RegExp(source.source, source.flags);
  if (isArrayBufferLike(source)) return source.slice(0);
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const cached = refs.get(source);
  if (cached) return cached;
  if (Array.isArray(source)) {
    const result2 = [];
    refs.set(source, result2);
    source.forEach((value, index) => {
      result2[index] = Reflect.apply(clone, null, [value, refs]);
    });
    return result2;
  }
  const result = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result);
  for (const key of Reflect.ownKeys(source)) {
    const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
    if ("value" in descriptor) {
      descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
    }
    Reflect.defineProperty(result, key, descriptor);
  }
  return result;
}
function deepEqual(a, b, strict) {
  const ancestors = /* @__PURE__ */ new Set();
  function compare(a2, b2) {
    if (a2 === b2) return true;
    if (isVolatile(a2) || isVolatile(b2)) return isVolatile(a2) && isVolatile(b2);
    if (!strict && isNullable(a2) && isNullable(b2)) return true;
    if (typeof a2 !== typeof b2 || typeof a2 !== "object" || !a2 || !b2) return false;
    if (ancestors.has(a2)) return false;
    function check(test, then) {
      return test(a2) ? test(b2) ? then(a2, b2) : false : test(b2) ? false : void 0;
    }
    ancestors.add(a2);
    try {
      return check(Array.isArray, (a3, b3) => {
        if (a3.length !== b3.length) return false;
        for (let index = 0; index < a3.length; index++) {
          if (!compare(a3[index], b3[index])) return false;
        }
        return true;
      }) ?? check(is("Date"), (a3, b3) => a3.valueOf() === b3.valueOf()) ?? check(is("URL"), (a3, b3) => a3.href === b3.href) ?? check(is("RegExp"), (a3, b3) => a3.source === b3.source && a3.flags === b3.flags) ?? check(isArrayBufferLike, (a3, b3) => {
        if (a3.byteLength !== b3.byteLength) return false;
        const viewA = new Uint8Array(a3);
        const viewB = new Uint8Array(b3);
        for (let i = 0; i < viewA.length; i++) {
          if (viewA[i] !== viewB[i]) return false;
        }
        return true;
      }) ?? ((!strict || [a2, b2].every((value) => Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) && Object.keys({ ...a2, ...b2 }).every((key) => compare(a2[key], b2[key])));
    } finally {
      ancestors.delete(a2);
    }
  }
  return compare(a, b);
}

// ../../zrepo/deepseek-harness/vendor/cosmokit/src/string.ts
function tokenize(source, delimiters, delimiter) {
  const output = [];
  let state = 0 /* DELIM */;
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      if (state === 1 /* UPPER */) {
        const next = source.charCodeAt(i + 1);
        if (next >= 97 && next <= 122) {
          output.push(delimiter);
        }
        output.push(code + 32);
      } else {
        if (state !== 0 /* DELIM */) {
          output.push(delimiter);
        }
        output.push(code + 32);
      }
      state = 1 /* UPPER */;
    } else if (code >= 97 && code <= 122) {
      output.push(code);
      state = 2 /* LOWER */;
    } else if (delimiters.includes(code)) {
      if (state !== 0 /* DELIM */) {
        output.push(delimiter);
      }
      state = 0 /* DELIM */;
    } else {
      output.push(code);
    }
  }
  return String.fromCharCode(...output);
}
function paramCase(source) {
  return tokenize(source, [45, 95], 45);
}
var hyphenate = paramCase;

// ../../zrepo/deepseek-harness/vendor/cosmokit/src/time.ts
var Time;
((Time2) => {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset) {
    timezoneOffset = offset;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date2 = /* @__PURE__ */ new Date(), offset) {
    if (typeof date2 === "number") date2 = new Date(date2);
    if (offset === void 0) offset = timezoneOffset;
    return Math.floor((date2.valueOf() / Time2.minute - offset) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset) {
    const date2 = new Date(value * Time2.day);
    if (offset === void 0) offset = timezoneOffset;
    return new Date(+date2 + offset * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date2) {
    const parsed = parseTime(date2);
    if (parsed) {
      date2 = Date.now() + parsed;
    } else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) {
      date2 = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date2}`;
    } else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) {
      date2 = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date2}`;
    }
    return date2 ? new Date(date2) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) {
      return Math.round(ms / Time2.day) + "d";
    } else if (abs >= Time2.hour - Time2.minute / 2) {
      return Math.round(ms / Time2.hour) + "h";
    } else if (abs >= Time2.minute - Time2.second / 2) {
      return Math.round(ms / Time2.minute) + "m";
    } else if (abs >= Time2.second) {
      return Math.round(ms / Time2.second) + "s";
    }
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// ../../zrepo/deepseek-harness/vendor/cordis/lib/index.js
var DisposableList = class {
  sn = 0;
  map = /* @__PURE__ */ new Map();
  weak = /* @__PURE__ */ new WeakMap();
  get length() {
    return this.map.size;
  }
  push(value) {
    const sn = ++this.sn;
    this.map.set(sn, value);
    this.weak.set(value, sn);
    return () => this.map.delete(sn);
  }
  delete(value) {
    const sn = this.weak.get(value);
    if (!sn) return false;
    return this.map.delete(sn);
  }
  clear() {
    const values = [...this.map.values()];
    this.map.clear();
    return values.reverse();
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this];
  }
};
var symbols = {
  shadow: /* @__PURE__ */ Symbol.for("cordis.shadow"),
  caller: /* @__PURE__ */ Symbol.for("cordis.caller"),
  receiver: /* @__PURE__ */ Symbol.for("cordis.receiver"),
  original: /* @__PURE__ */ Symbol.for("cordis.original"),
  metadata: /* @__PURE__ */ Symbol.for("cordis.metadata"),
  initHooks: /* @__PURE__ */ Symbol.for("cordis.initHooks"),
  checkProto: /* @__PURE__ */ Symbol.for("cordis.checkProto"),
  effect: /* @__PURE__ */ Symbol.for("cordis.effect"),
  filter: /* @__PURE__ */ Symbol.for("cordis.filter"),
  isolate: /* @__PURE__ */ Symbol.for("cordis.isolate"),
  intercept: /* @__PURE__ */ Symbol.for("cordis.intercept"),
  init: /* @__PURE__ */ Symbol.for("cordis.init"),
  check: /* @__PURE__ */ Symbol.for("cordis.check"),
  config: /* @__PURE__ */ Symbol.for("cordis.config"),
  invoke: /* @__PURE__ */ Symbol.for("cordis.invoke"),
  extend: /* @__PURE__ */ Symbol.for("cordis.extend"),
  tracker: /* @__PURE__ */ Symbol.for("cordis.tracker"),
  resolveConfig: /* @__PURE__ */ Symbol.for("cordis.resolveConfig")
};
var GeneratorFunction = function* () {
}.constructor;
var AsyncGeneratorFunction = async function* () {
}.constructor;
function isConstructor(func) {
  if (!func.prototype) return false;
  if (func instanceof GeneratorFunction) return false;
  if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
  return true;
}
function joinPrototype(proto1, proto2) {
  if (proto1 === Object.prototype) return proto2;
  const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
  for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
  return result;
}
function isObject(value) {
  return value && (typeof value === "object" || typeof value === "function");
}
function getPropertyDescriptor(target, prop) {
  let proto = target;
  while (proto) {
    const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
    if (desc) return desc;
    proto = Object.getPrototypeOf(proto);
  }
}
function getTraceable(ctx, value) {
  if (!isObject(value)) return value;
  if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
  const tracker = value[symbols.tracker];
  if (!tracker) return value;
  return createTraceable(ctx, value, tracker);
}
function withProps(target, props) {
  if (!props) return target;
  return new Proxy(target, {
    get: (target2, prop, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
      return Reflect.get(target2, prop, receiver);
    },
    set: (target2, prop, value, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
      return Reflect.set(target2, prop, value, receiver);
    }
  });
}
function withProp(target, prop, value) {
  return withProps(target, Object.defineProperty(/* @__PURE__ */ Object.create(null), prop, {
    value,
    writable: false
  }));
}
function createShadow(useSite, target, property2, receiver) {
  if (!property2) return receiver;
  const value = getPropertyDescriptor(target, property2)?.value;
  if (!value) return receiver;
  const defSite = value[symbols.shadow] ?? value;
  return withProp(receiver, property2, useSite.extend({ [symbols.shadow]: defSite }));
}
function createShadowMethod(ctx, value, outer, shadow) {
  return new Proxy(value, { apply: (target, thisArg, args) => {
    if (thisArg === outer) thisArg = shadow;
    return getTraceable(ctx, Reflect.apply(target, thisArg, args));
  } });
}
function createTraceable(ctx, value, tracker) {
  const defSite = ctx[symbols.shadow] ?? ctx;
  const useSite = ctx[symbols.shadow] ? Object.getPrototypeOf(ctx) : ctx;
  const proxy = new Proxy(value, {
    get: (target, prop, receiver) => {
      if (prop === symbols.original) return target;
      if (prop === symbols.caller) return defSite;
      if (prop === tracker.property) return useSite;
      if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      if (tracker.associate && useSite.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
      let shadow, innerValue;
      const desc = getPropertyDescriptor(target, prop);
      if (desc && "value" in desc) innerValue = desc.value;
      else {
        shadow = createShadow(useSite, target, tracker.property, receiver);
        innerValue = Reflect.get(target, prop, shadow);
      }
      const innerTracker = innerValue?.[symbols.tracker];
      if (innerTracker) return createTraceable(useSite, innerValue, innerTracker);
      else if (!tracker.noShadow && typeof innerValue === "function") {
        shadow ??= createShadow(useSite, target, tracker.property, receiver);
        return createShadowMethod(useSite, innerValue, receiver, shadow);
      } else return innerValue;
    },
    set: (target, prop, value2, receiver) => {
      if (prop === symbols.original) return false;
      if (prop === symbols.caller) return false;
      if (prop === tracker.property) return false;
      if (typeof prop === "symbol") return Reflect.set(target, prop, value2, receiver);
      if (tracker.associate && useSite.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value2, withProp(ctx, symbols.receiver, receiver));
      const shadow = createShadow(useSite, target, tracker.property, receiver);
      return Reflect.set(target, prop, value2, shadow);
    },
    apply: (target, thisArg, args) => {
      return applyTraceable(tracker.noShadow ? proxy : createShadow(useSite, target, tracker.property, proxy), target, thisArg, args);
    }
  });
  return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
  if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
  return value[symbols.invoke].apply(proxy, args);
}
function createCallable(name, proto, tracker) {
  const self = function(...args) {
    const proxy = createTraceable(self["ctx"], self, tracker);
    return Reflect.apply(proxy, this, args);
  };
  defineProperty(self, "name", name);
  return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
  const innerLines = info.error.stack.split("\n");
  if (typeof reason?.stack !== "string") {
    const outerError = new Error(reason);
    const lines2 = outerError.stack.split("\n");
    lines2.splice(1, Infinity, ...getOuterStack());
    outerError.stack = lines2.join("\n");
    throw outerError;
  }
  const lines = reason.stack.split("\n");
  let index = lines.indexOf(innerLines[2]);
  if (index === -1) throw reason;
  index -= info.offset;
  while (index > 0) {
    if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
    index -= 1;
  }
  lines.splice(index, Infinity, ...getOuterStack());
  reason.stack = lines.join("\n");
  throw reason;
}
function composeError(callback, getOuterStack = buildOuterStack()) {
  const info = {
    offset: 1,
    error: /* @__PURE__ */ new Error()
  };
  try {
    const result = callback(info);
    if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
    else return result;
  } catch (reason) {
    handleError(info, reason, getOuterStack);
  }
}
function buildOuterStack(offset = 0) {
  const outerError = /* @__PURE__ */ new Error();
  return () => outerError.stack.split("\n").slice(3 + offset);
}
var kValidationError = /* @__PURE__ */ Symbol.for("ValidationError");
var ValidationError = class extends TypeError {
  name = "ValidationError";
  /**
  * Build the aggregated message from schema issues.
  *
  * @param issues — the standard-schema issues, one message line each.
  */
  constructor(issues) {
    super(`invalid config:
` + issues.map((issue) => {
      if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
      else return `  - ${issue.message}`;
    }).join("\n"));
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
function resolveConfig(runtime, config) {
  if (!runtime.Config) return config;
  const result = runtime.Config["~standard"].validate(config);
  if ("then" in result) throw new TypeError("Async config validation is not supported");
  if (result.issues) throw new ValidationError(result.issues);
  else return result.value;
}
var effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
  const result = dispose();
  return effectInertia.get(dispose)?.() ?? result;
}
function emitPluginDisposed(context, fiber) {
  const args = ["internal/plugin", fiber];
  let callbacks;
  try {
    callbacks = context.events.dispatch("emit", args);
  } catch (error) {
    context.logger.error(error);
    return;
  }
  for (const callback of callbacks) try {
    const returned = callback(...args);
    Promise.resolve(returned).catch((error) => context.logger.error(error));
  } catch (error) {
    context.logger.error(error);
  }
}
var CordisError = class CordisError2 extends Error {
  code;
  /**
  * @param code — the stable error code; also the default message.
  * @param message — optional human-readable override.
  */
  constructor(code, message) {
    super(message ?? CordisError2.Code[code]);
    this.code = code;
  }
};
(function(CordisError4) {
  CordisError4.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
var INACTIVE = "__INACTIVE__";
var Fiber = class {
  parent;
  inject;
  runtime;
  /** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
  uid;
  /** The context this fiber's plugin runs in (extends the parent context). */
  ctx;
  /** Raw plugin input retained for the next activation. */
  config;
  /** Current lifecycle state; transitions emit `internal/status`. */
  state = 0;
  /** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
  dispose;
  /** Required implementations retained through dependent teardown. */
  committed;
  /** Service implementations owned by this fiber, including isolated provisions. */
  provisions = /* @__PURE__ */ new Set();
  /** The in-flight load/unload transition, if one is currently running. */
  inertia;
  _hooks = /* @__PURE__ */ Object.create(null);
  _disposables = new DisposableList();
  context;
  _error;
  _revision = 0;
  _configRevision = 0;
  _effectiveConfig;
  _runner;
  _store = /* @__PURE__ */ Object.create(null);
  _release;
  /**
  * Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
  * rather than constructing them directly.
  *
  * @param parent — the context the plugin was loaded from.
  * @param config — raw config, validated against the runtime's schema.
  * @param inject — resolved dependency map (service name → intercept config).
  * @param runtime — the shared plugin runtime, or `null` for the root fiber.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  */
  constructor(parent, config, inject, runtime, getOuterStack) {
    this.parent = parent;
    this.inject = inject;
    this.runtime = runtime;
    this.config = config;
    const collect = (dispose) => {
      this._disposables.push(dispose);
    };
    if (runtime) {
      this.uid = parent.registry.counter;
      this.ctx = this.context = parent.extend({ fiber: this });
      const injectEntries = Object.entries(this.inject);
      if (injectEntries.length) {
        this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
        for (const [name, config2] of injectEntries) {
          if (isNullable(config2)) continue;
          this.ctx[Context.intercept][name] = config2;
        }
      }
      this._runner = {
        epoch: INACTIVE,
        getOuterStack,
        execute: function() {
          const config2 = this.resolveConfig(this.config);
          this._effectiveConfig = config2;
          if (isConstructor(runtime.callback)) {
            const instance = new runtime.callback(this.ctx, config2);
            for (const hook of instance?.[symbols.initHooks] ?? []) hook();
            return instance?.[symbols.init]?.();
          } else return runtime.callback(this.ctx, config2);
        },
        collect
      };
      this.dispose = parent.fiber.effect(() => {
        const remove = runtime.fibers.push(this);
        return async () => {
          this.uid = null;
          emitPluginDisposed(this.context, this);
          if (this.ctx.registry.has(runtime.callback)) {
            remove();
            if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
          }
          this._setEpoch(INACTIVE);
          if (!this.inertia) this._updateState(() => {
            this.inertia = this._unload();
            return 5;
          });
          while (this.inertia) await this.inertia;
        };
      }, "ctx.plugin()");
      try {
        this.context.emit("internal/plugin", this);
      } catch (error) {
        Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
        throw error;
      }
      if (this.uid !== null && parent.fiber.state !== 5) {
        for (const name of Object.keys(this.inject)) this._checkImpl(name);
        this._refresh();
      }
    } else {
      this.uid = 0;
      this.ctx = this.context = parent;
      this.state = 2;
      this.committed = /* @__PURE__ */ Object.create(null);
      this._runner = {
        epoch: "0",
        getOuterStack,
        execute: () => {
        },
        collect
      };
      this.dispose = () => this.restart();
    }
  }
  /** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
  get name() {
    let fiber = this;
    do {
      if (fiber.runtime?.name) return fiber.runtime.name;
      fiber = fiber.parent.fiber;
    } while (fiber !== fiber.parent.fiber);
    return "root";
  }
  /**
  * Throw if the fiber has already been disposed.
  *
  * @returns nothing when the fiber is still active.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
  */
  assertActive() {
    if (this.uid !== null) return;
    throw new CordisError("INACTIVE_EFFECT");
  }
  _execute(runner) {
    const oldEpoch = runner.epoch;
    return composeError((info) => {
      const safeCollect = (dispose) => {
        if (typeof dispose === "function") runner.collect(dispose);
        else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
      };
      const effect = runner.execute.call(this);
      if (typeof effect === "function") return runner.collect(effect);
      else if (isNullable(effect)) {
      } else if (!isObject(effect)) throw new TypeError("Invalid effect");
      else if ("then" in effect) return effect.then(safeCollect);
      else if (Symbol.iterator in effect) {
        info.error = /* @__PURE__ */ new Error();
        const iter = effect[Symbol.iterator]();
        while (true) {
          const result = iter.next();
          safeCollect(result.value);
          if (result.done) return;
        }
      } else if (Symbol.asyncIterator in effect) {
        const iter = effect[Symbol.asyncIterator]();
        return (async () => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          while (true) {
            if (runner.epoch !== oldEpoch) return;
            const result = await iter.next();
            safeCollect(result.value);
            if (result.done) return;
          }
        })();
      } else throw new TypeError("Invalid effect");
    }, runner.getOuterStack);
  }
  effect(execute, label = "anonymous") {
    this.assertActive();
    if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
    const disposables = [];
    let disposing = false;
    let disposalTask;
    const dispose = () => {
      if (disposing) return disposalTask;
      disposing = true;
      let task2;
      for (const disposable of disposables.splice(0).reverse()) if (task2) task2 = task2.then(() => runDisposable(disposable));
      else {
        const result = runDisposable(disposable);
        if (isObject(result) && "then" in result) task2 = result;
      }
      return disposalTask = task2;
    };
    const meta = {
      label,
      children: []
    };
    const runner = {
      execute,
      epoch: true,
      collect: (dispose2) => {
        disposables.push(dispose2);
        this._disposables.delete(dispose2);
        if (dispose2[symbols.effect]) meta.children.push(dispose2[symbols.effect]);
      },
      getOuterStack: buildOuterStack()
    };
    let task;
    let executing = true;
    let resolveSetup;
    let rejectSetup;
    let setupBarrier;
    let setupFailed = false;
    let inFlight;
    let removeWrapper = () => false;
    const waitForSetup = () => {
      setupBarrier ??= new Promise((resolve2, reject) => {
        resolveSetup = resolve2;
        rejectSetup = reject;
      });
      return setupBarrier;
    };
    const disposeAfter = (setup) => {
      return Promise.resolve(setup).then(() => dispose(), async (reason) => {
        await dispose();
        throw reason;
      });
    };
    const finalizeDisposal = (callback) => {
      let result;
      try {
        result = callback();
      } catch (error) {
        removeWrapper();
        throw error;
      }
      if (isObject(result) && "then" in result) {
        const pending = Promise.resolve(result).finally(() => {
          removeWrapper();
          if (inFlight === pending) inFlight = void 0;
        });
        return inFlight = pending;
      }
      removeWrapper();
      return result;
    };
    const wrapper = defineProperty(() => {
      if (!runner.epoch) return setupFailed ? inFlight : void 0;
      runner.epoch = false;
      return finalizeDisposal(() => {
        if (executing) return disposeAfter(waitForSetup());
        return task ? disposeAfter(task) : dispose();
      });
    }, symbols.effect, meta);
    effectInertia.set(wrapper, () => inFlight);
    removeWrapper = this._disposables.push(wrapper);
    try {
      task = this._execute(runner);
    } catch (reason) {
      executing = false;
      setupFailed = true;
      runner.epoch = false;
      let cleanup;
      try {
        cleanup = finalizeDisposal(dispose);
      } finally {
        rejectSetup?.(reason);
      }
      if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
      throw reason;
    }
    executing = false;
    if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
    task?.catch(() => {
      if (!runner.epoch) return dispose();
      return finalizeDisposal(dispose);
    }).catch((error) => this.ctx.logger.error(error));
    const disposeAsync = () => {
      if (!runner.epoch) return;
      runner.epoch = false;
      return finalizeDisposal(dispose);
    };
    wrapper.then = async (onFulfilled, onRejected) => {
      return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
    };
    return wrapper;
  }
  /**
  * Return metadata for currently registered effects.
  *
  * @returns one {@link EffectMeta} tree per labeled live effect.
  */
  getEffects() {
    return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
  }
  _getState() {
    if (this.uid === null) return 4;
    if (this._error) return 3;
    if (this._runner.epoch !== INACTIVE) return 2;
    return 0;
  }
  _updateState(callback) {
    const oldState = this.state;
    this.state = callback() ?? this._getState();
    if (oldState === this.state) return;
    this.context.emit("internal/status", this, oldState);
    if (oldState !== 2 && this.state !== 2) return;
    for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
      const impl = this.ctx.reflect.store[key];
      if (impl.ctx.fiber !== this) continue;
      this.ctx.isolate(impl.name, impl.isolate).reflect.notify([impl.name]);
    }
  }
  _checkImpl(name) {
    const impl = this.ctx.reflect._getImpl(name, true);
    if (!impl) return delete this._store[name];
    try {
      if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name];
    } catch (error) {
      impl.ctx.logger.error(error);
      return delete this._store[name];
    }
    this._store[name] = impl;
  }
  _refresh() {
    let epoch = `${this._revision}`;
    for (const name of Object.keys(this.inject)) {
      const impl = this._store[name];
      if (!impl) {
        epoch = INACTIVE;
        break;
      }
      epoch += ":" + impl.uid;
    }
    this._setEpoch(epoch);
  }
  _setEpoch(epoch) {
    const oldEpoch = this._runner.epoch;
    if (epoch === oldEpoch) return;
    if (this._error) return;
    this._runner.epoch = epoch;
    if (this.inertia) return;
    this._updateState(() => {
      if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
        this.inertia = this._reload();
        return 1;
      } else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  /** Raw input retained for the next activation, without evaluating expressions or validating it. */
  get rawConfig() {
    return this.ctx.fiber.config;
  }
  /** Retain raw input without changing the running config or triggering an update. */
  set rawConfig(config) {
    this.ctx.fiber.config = config;
    this.ctx.fiber._configRevision++;
  }
  /**
  * The object passed to plugin activation or the latest successful update that retained the instance.
  * Candidate resolution does not publish it; volatile updates retain its references.
  * Undefined before activation and readable after unload; callers requiring a live instance check `state`.
  */
  get effectiveConfig() {
    return this.ctx.fiber._effectiveConfig;
  }
  /**
  * Evaluate and validate a candidate using this fiber's `internal/config` hooks and runtime schema.
  * Does not publish the result, replace raw input, or commit running volatile references.
  * Required injections must be available when a hook uses them.
  * @param config Raw candidate input.
  * @returns The candidate's resolved config, retaining the schema's result identity.
  * @throws {ValidationError} when the runtime schema rejects the candidate; hook errors propagate.
  */
  resolveConfig(config) {
    const fiber = this.ctx.fiber;
    return fiber.context.waterfall("internal/config", fiber, () => config);
  }
  async _reload() {
    this.committed = { ...this._store };
    for (const impl of Object.values(this.committed)) {
      if (impl.ctx.fiber === this) continue;
      impl.dependents.add(this);
    }
    const oldEpoch = this._runner.epoch;
    try {
      await Promise.resolve();
      if (this._runner.epoch === oldEpoch) await this._execute(this._runner);
    } catch (reason) {
      this.ctx.logger.error(reason);
      if (this._runner.epoch === oldEpoch) {
        this._error = reason;
        this._runner.epoch = INACTIVE;
      }
    }
    this._updateState(() => {
      if (this._runner.epoch === oldEpoch) this.inertia = void 0;
      else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  async _unload() {
    while ([...this.provisions].some((impl) => impl.dependents.size)) await new Promise((resolve2) => this._release = resolve2);
    this._release = void 0;
    await Promise.all(this._disposables.clear().map(async (dispose) => {
      try {
        await composeError(async (info) => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          await runDisposable(dispose);
        }, this._runner.getOuterStack);
      } catch (reason) {
        this.ctx.logger.error(reason);
      }
    }));
    for (const impl of Object.values(this.committed ?? {})) {
      if (!impl.dependents.delete(this) || impl.dependents.size) continue;
      impl.release?.();
      impl.ctx.fiber._release?.();
    }
    this.committed = void 0;
    this._updateState(() => {
      if (this._runner.epoch === INACTIVE) this.inertia = void 0;
      else {
        this.inertia = this._reload();
        return 1;
      }
    });
  }
  /**
  * Wait for current lifecycle work and rethrow startup errors.
  *
  * @returns this fiber, once it has settled into a stable state.
  * @throws the config-validation or plugin-startup error, if any.
  */
  async await() {
    while (this.inertia) await this.inertia;
    if (this._error) throw this._error;
    return this;
  }
  /**
  * Dispose and immediately reload this plugin with its current config.
  *
  * @returns a promise resolving once the reload settled.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
  */
  async restart() {
    const fiber = this.ctx.fiber;
    fiber.assertActive();
    fiber._revision++;
    fiber._refresh();
    await fiber.await();
  }
  /**
  * Resolve a candidate, retain its raw config and apply it through the update waterfall.
  * @param config Raw config; pending fibers defer resolution until activation.
  * @param noSave Suppress the persistence notification when true.
  * @returns The awaited update/restart result, or undefined when a synchronous listener handles it.
  * @throws {ValidationError} when an active fiber's candidate is invalid.
  */
  update(config, noSave = false) {
    const fiber = this.ctx.fiber;
    fiber.assertActive();
    const loaded = fiber._runner.epoch !== INACTIVE;
    const resolved = loaded ? fiber.resolveConfig(config) : void 0;
    if (!noSave) fiber.context.emit("internal/commit", fiber, config);
    fiber.config = config;
    fiber._error = void 0;
    const configRevision = ++fiber._configRevision;
    const epoch = fiber._runner.epoch;
    const committed = fiber.committed;
    let restarted = false;
    const restart = () => {
      restarted = true;
      return fiber.restart();
    };
    const publish = () => {
      if (!restarted && fiber.uid !== null && fiber._configRevision === configRevision && fiber._runner.epoch === epoch && fiber.committed === committed) fiber._effectiveConfig = resolved;
    };
    const result = loaded ? fiber.context.waterfall(fiber, "internal/update", resolved, restart) : restart();
    if (result === void 0) {
      publish();
      return;
    }
    const task = Promise.resolve(result).then(publish);
    task.catch(() => {
    });
    return task;
  }
};
function isBailed(value) {
  return value !== null && value !== false && value !== void 0;
}
var EventsService = class {
  ctx;
  _hooks = /* @__PURE__ */ Object.create(null);
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.on("internal/listener", function(name, listener, options) {
      if (name === "internal/update" && !options.global) {
        const hooks = this.fiber._hooks["internal/update"] ??= new DisposableList();
        const method = options.prepend ? "unshift" : "push";
        return this.fiber.effect(() => hooks[method](listener), 'ctx.on("internal/update")');
      }
    });
    this.on("internal/update", function(config, next) {
      const cbs = [...this._hooks["internal/update"] || []];
      const _next = () => {
        return (cbs.shift() ?? next).call(this, config, _next);
      };
      return _next();
    }, {
      global: true,
      prepend: true
    });
    this.on("internal/config", (fiber, next) => {
      const config = next();
      return fiber.runtime ? resolveConfig(fiber.runtime, config) : config;
    });
  }
  _resolve(type, args) {
    const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
    const name = args.shift();
    if ((typeof name !== "string" || !name.startsWith("internal/")) && this._hooks["internal/dispatch"]?.length) this.emit("internal/dispatch", type, name, args, thisArg);
    const filter = thisArg?.[Context.filter];
    return [thisArg, (this._hooks[name] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback)];
  }
  /**
  * Resolve bound callbacks using the event's context filter.
  * @param type Dispatch mode reported to observers.
  * @param args Dispatch arguments, consumed through the event name.
  * @returns Matching callbacks bound to the dispatch receiver.
  * DSH retains callback enumeration for per-listener error containment.
  */
  dispatch(type, args) {
    const [thisArg, callbacks] = this._resolve(type, args);
    return callbacks.map((callback) => callback.bind(thisArg));
  }
  /**
  * Run listeners concurrently and wait for all of them.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns a promise resolving once every listener has settled.
  */
  async parallel(...args) {
    const [thisArg, callbacks] = this._resolve("parallel", args);
    const errors = (await Promise.allSettled(callbacks.map(async (callback) => Reflect.apply(callback, thisArg, args)))).filter((result) => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
  }
  /**
  * Run listeners synchronously without waiting for returned promises.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  */
  emit(...args) {
    const [thisArg, callbacks] = this._resolve("emit", args);
    for (const callback of callbacks) Reflect.apply(callback, thisArg, args);
  }
  /**
  * Run listeners in order, awaiting each, until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  async serial(...args) {
    const [thisArg, callbacks] = this._resolve("serial", args);
    for (const callback of callbacks) {
      const result = await Reflect.apply(callback, thisArg, args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Run listeners synchronously until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  bail(...args) {
    const [thisArg, callbacks] = this._resolve("bail", args);
    for (const callback of callbacks) {
      const result = Reflect.apply(callback, thisArg, args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Compose listeners around the final `next` callback.
  *
  * The last dispatch argument is treated as the innermost `next`. Listeners
  * run outermost-first; a listener that does not call `next()` vetoes the
  * rest of the chain, including the built-in behavior.
  *
  * @param args — optional `this`, the event name, listener arguments, then `next`.
  * @returns the outermost listener's return value.
  */
  waterfall(...args) {
    const [thisArg, callbacks] = this._resolve("waterfall", args);
    const inner = args.pop();
    const dispatch = () => {
      const callback = callbacks.shift();
      if (!callback) return inner();
      let called = false;
      const next = () => {
        if (called) throw new Error("next() called multiple times");
        called = true;
        return dispatch();
      };
      return Reflect.apply(callback, thisArg, [...args, next]);
    };
    return dispatch();
  }
  register(label, name, callback, options) {
    const method = options.prepend ? "unshift" : "push";
    return this.ctx.fiber.effect(() => {
      (this._hooks[name] ??= [])[method]({
        ctx: this.ctx,
        callback,
        ...options
      });
      return () => this.unregister(name, callback);
    }, label);
  }
  unregister(name, callback) {
    const hooks = this._hooks[name];
    if (!hooks) return;
    const index = hooks.findIndex((hook) => hook.callback === callback);
    if (index >= 0) {
      hooks.splice(index, 1);
      if (!hooks.length) delete this._hooks[name];
      return true;
    }
  }
  /**
  * Register an event listener owned by the current fiber.
  *
  * The listener is removed automatically when the fiber unloads. Throws
  * `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
  *
  * @param name — the event name to listen for.
  * @param listener — called with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  on(name, listener, options) {
    if (typeof options !== "object") options = { prepend: options };
    this.ctx.fiber.assertActive();
    listener = this.ctx.reflect.bind(listener);
    const result = this.bail(this.ctx, "internal/listener", name, listener, options);
    if (result) return result;
    const label = `ctx.on(${typeof name === "string" ? JSON.stringify(name) : name.toString()})`;
    return this.register(label, name, listener, options);
  }
  /**
  * Register an event listener that disposes itself after the first call.
  *
  * @param name — the event name to listen for.
  * @param listener — called at most once with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  once(name, listener, options) {
    const dispose = this.on(name, function(...args) {
      dispose();
      return listener.apply(this, args);
    }, options);
    return dispose;
  }
};
var defaultFormatters = {
  s: (value) => String(value),
  d: (value) => Math.trunc(Number(value)),
  i: (value) => Math.trunc(Number(value)),
  f: (value) => Number(value),
  o: (value) => JSON.stringify(value),
  O: (value) => JSON.stringify(value),
  c: () => "",
  C: (value, exporter, message) => {
    return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
  }
};
function isAggregateError(error) {
  return error instanceof Error && Array.isArray(error["errors"]);
}
var Logger = class {
  service;
  static color(exporter, code, value, decoration = "") {
    if (!exporter.colors) return "" + value;
    return `\x1B[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\x1B[0m`;
  }
  static code(name, level) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !level ? [] : level >= 2 ? c256 : c16;
    return colors[Math.abs(hash) % colors.length];
  }
  static format(exporter, message) {
    const args = message.args.slice();
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") args.unshift("%o");
    let format = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
      if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
      return match;
    });
    const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
    for (let arg of args) {
      if (typeof arg === "object" && arg) arg = oFormatter(arg, exporter, message);
      format += " " + arg;
    }
    const { maxLength = 10240 } = exporter;
    return format.split(/\r?\n/g).map((line) => {
      return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
    }).join("\n");
  }
  constructor(options, service) {
    this.service = service;
    Object.assign(this, options);
    this.error = this._method("error", 0);
    this.info = this._method("info", 2);
    this.warn = this._method("warn", 1);
    this.debug = this._method("debug", 3);
  }
  _method(type, level) {
    return (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) this[type](args[0].cause);
        else if (isAggregateError(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const sn = ++this.service._snMessage;
      const ts = Date.now();
      for (const exporter of this.service.exporters.values()) {
        if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 2) < level) continue;
        const message = {
          sn,
          ts,
          type,
          level,
          name: this.name,
          ...this.meta,
          args
        };
        exporter.export(message);
      }
    };
  }
};
var c16 = [
  6,
  2,
  3,
  4,
  5,
  1
];
var c256 = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221
];
var LoggerService = class LoggerService2 {
  bufferSize = 1e3;
  buffer = [];
  ctx;
  _snMessage = 0;
  _snExporter = 0;
  exporters = /* @__PURE__ */ new Map();
  constructor(ctx) {
    const tracker = {
      property: "ctx",
      noShadow: true
    };
    const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    Object.assign(self, this);
    self.ctx = ctx;
    defineProperty(self, symbols.tracker, tracker);
    self.exporter({
      colors: 3,
      export: (message) => {
        self.buffer.push(message);
        const overflow = self.buffer.length - self.bufferSize;
        if (overflow === 1) self.buffer.shift();
        else if (overflow > 1) self.buffer.splice(0, overflow);
      }
    });
    return self;
  }
  /**
  * Register an exporter and dispose it with the current fiber.
  *
  * @param exporter — the sink that receives structured log messages.
  * @returns a disposer that removes the exporter.
  */
  exporter(exporter) {
    return this.ctx.effect(() => {
      const id = ++this._snExporter;
      this.exporters.set(id, exporter);
      return () => this.exporters.delete(id);
    }, "ctx.logger.exporter()");
  }
  _resolveConfig() {
    let intercept = this.ctx[symbols.intercept];
    const configs = [];
    while ("logger" in intercept) {
      if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
      intercept = Object.getPrototypeOf(intercept);
    }
    return Object.assign({}, ...configs);
  }
  [symbols.invoke](name) {
    const config = this._resolveConfig();
    const fiber = (this[symbols.caller] ?? this.ctx).fiber;
    name ??= config.name;
    name ??= hyphenate(fiber.name);
    return new Logger({
      name,
      level: config.level,
      meta: { fiber: new WeakRef(fiber) }
    }, this);
  }
  static {
    for (const type of [
      "error",
      "info",
      "warn",
      "debug"
    ]) LoggerService2.prototype[type] = function(...args) {
      return this()[type](...args);
    };
  }
};
function enhanceError(error) {
  const lines = error.stack.split("\n");
  lines.splice(0, 2, `Error: ${error.message}`);
  error.stack = lines.join("\n");
  return error;
}
var RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
  return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
var ReflectService = class {
  ctx;
  /** Proxy traps implementing service resolution for every context object. */
  static handler = {
    get: (target, prop, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
      if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
      const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
      try {
        const def = target.reflect.props[prop];
        if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
        const defSite = ctx[symbols.shadow] ?? ctx;
        if (!defSite.fiber.runtime) return ctx.reflect.get(prop, false);
        return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
          const key = defSite[symbols.isolate][prop];
          let fiber = defSite.fiber;
          while (true) {
            let impl = fiber.committed?.[prop];
            for (const provision of fiber.provisions) if (provision.name === prop && provision.ctx[symbols.isolate][prop] === key) impl = provision;
            if (impl) return getTraceable(ctx, impl.value);
            if (prop in fiber.inject) {
              error.message = `cannot get required service "${prop}" in inactive context`;
              throw error;
            }
            if (!fiber.runtime) throw error;
            if (fiber.parent[symbols.isolate][prop] !== key) throw error;
            fiber = fiber.parent.fiber;
          }
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    set: (target, prop, value, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
      const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
      const def = target.reflect.props[prop];
      if (!def) {
        if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
        throw enhanceError(error);
      }
      try {
        if (def.type === "accessor") {
          if (!def.set) return false;
          return def.set.call(ctx, value, ctx[symbols.receiver], error);
        }
        return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
          return ctx.reflect.set(prop, value, error);
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    has: (target, prop) => {
      if (isSpecialProperty(prop)) return Reflect.has(target, prop);
      if (Reflect.has(target, prop)) return true;
      return !!target.reflect.props[prop];
    }
  };
  /** Service implementations, keyed by isolation label. */
  store = /* @__PURE__ */ Object.create(null);
  /** Declared context properties (services and accessors), by name. */
  props = /* @__PURE__ */ Object.create(null);
  _implCounter = 0;
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.mixin("reflect", [
      "get",
      "set",
      "provide",
      "accessor",
      "mixin"
    ]);
    this.mixin("fiber", ["runtime", "effect"]);
    this.mixin("registry", ["inject", "plugin"]);
    this.mixin("events", [
      "on",
      "once",
      "parallel",
      "emit",
      "serial",
      "bail",
      "waterfall"
    ]);
  }
  /**
  * Read a service from the store without the inject requirement.
  *
  * @param name — the service name.
  * @param strict — when `true`, only return implementations whose providing
  * fiber is currently active.
  * @returns the service value, or `undefined` when not (yet) provided.
  */
  get(name, strict = true) {
    return getTraceable(this.ctx, this._getImpl(name, strict)?.value);
  }
  _getImpl(name, strict = true) {
    const key = this.ctx[symbols.isolate][name];
    const impl = key && this.store[key];
    if (!impl) return;
    if (strict && impl.ctx.fiber.state !== 2) return;
    return impl;
  }
  /**
  * Overwrite a provided service's value.
  *
  * @param name — the service name.
  * @param value — the new service value.
  * @param error — carrier for the caller stack in diagnostics.
  * @returns `true` on success.
  * @throws when `name` was never provided, or was provided by another fiber.
  */
  set(name, value, error) {
    const key = this.ctx[symbols.isolate][name];
    const impl = this.store[key];
    if (!impl) throw new Error(`cannot set property "${name}" without provide`);
    if (impl.ctx.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name}" in multiple fibers`);
    impl.value = value;
    return true;
  }
  /**
  * Register a service implementation owned by the current fiber.
  *
  * See the `ctx.provide()` overload above for the full contract.
  *
  * @param name — the service name.
  * @param value — the service value.
  * @param check — optional availability predicate for dependents.
  * @returns a disposer that unregisters the service.
  */
  provide(name, value, check) {
    return this.ctx.fiber.effect(() => {
      if (!this.props[name]) this.props[name] ??= { type: "service" };
      else if (this.props[name].type !== "service") throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      this.props[name] = { type: "service" };
      this.ctx.root[symbols.isolate][name] ??= Symbol(name);
      const key = this.ctx[symbols.isolate][name];
      const impl = {
        uid: ++this._implCounter,
        name,
        value,
        ctx: this.ctx,
        check,
        isolate: key,
        dependents: /* @__PURE__ */ new Set()
      };
      if (this.store[key]) throw new Error(`service "${name}" has been registered at <${this.store[key].ctx.fiber.name}>`);
      this.store[key] = impl;
      this.ctx.fiber.provisions.add(impl);
      if (this.ctx.fiber.state === 2) this.notify([name]);
      return async () => {
        if (this.store[impl.isolate] === impl) delete this.store[impl.isolate];
        this.ctx.isolate(name, impl.isolate).reflect.notify([name]);
        await new Promise((resolve2) => {
          impl.release = resolve2;
          if (!impl.dependents.size) resolve2();
        });
        impl.release = void 0;
        this.ctx.fiber.provisions.delete(impl);
      };
    }, `ctx.provide(${JSON.stringify(name)})`);
  }
  /**
  * Re-evaluate every fiber that requires one of the given services.
  *
  * @param names — the service names that changed.
  * @param filter — restricts notification to matching isolation scopes.
  */
  notify(names, filter = (ctx, name) => ctx[symbols.isolate][name] === this.ctx[symbols.isolate][name]) {
    for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
      let hasUpdate = false;
      for (const name of names) {
        if (!(name in fiber.inject)) continue;
        if (!filter(fiber.ctx, name)) continue;
        hasUpdate = true;
        fiber._checkImpl(name);
      }
      if (!hasUpdate) continue;
      fiber._refresh();
    }
    for (const name of names) {
      const self = Object.create(this.ctx);
      self[symbols.filter] = (target) => filter(target, name);
      this.ctx.events.emit(self, "internal/service", name, this._getImpl(name, false)?.value);
    }
  }
  /**
  * Define a computed context property backed by get/set hooks.
  *
  * @param name — the context property name.
  * @param options — the `get` hook and optional `set` hook.
  * @returns a disposer that removes the accessor.
  */
  accessor(name, options) {
    return this.ctx.fiber.effect(() => {
      if (name in this.props) throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      this.props[name] = {
        type: "accessor",
        ...options
      };
      return () => delete this.props[name];
    }, `ctx.accessor(${JSON.stringify(name)})`);
  }
  /**
  * Expose selected members of a service directly on `ctx`.
  *
  * See the `ctx.mixin()` overload above for the full contract.
  *
  * @param source — a context property name or a source object.
  * @param mixins — keys to forward, or a source-key → ctx-key map.
  * @returns a disposer that removes all created accessors.
  */
  mixin(source, mixins) {
    const self = this;
    return this.ctx.fiber.effect(function* () {
      const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
      const getTarget = (ctx, error) => {
        return ctx[source];
      };
      for (const [key, value] of entries) yield self.accessor(value, {
        get(receiver, error) {
          const service = getTarget(this, error);
          if (isNullable(service)) return service;
          const mixin = receiver ? withProps(receiver, service) : service;
          const value2 = Reflect.get(service, key, mixin);
          if (typeof value2 !== "function") return value2;
          return value2.bind(mixin ?? service);
        },
        set(value2, receiver, error) {
          const service = getTarget(this, error);
          const mixin = receiver ? withProps(receiver, service) : service;
          return Reflect.set(service, key, value2, mixin);
        }
      });
    }, `ctx.mixin(${JSON.stringify(source)})`);
  }
  /**
  * Attach this context's tracing wrapper to a value.
  *
  * @param value — the value to wrap.
  * @returns the traceable wrapper (or the value itself when not applicable).
  */
  trace(value) {
    return getTraceable(this.ctx, value);
  }
  /**
  * Wrap a callback so calls trace `this` and arguments to this context.
  *
  * @param callback — the function to wrap.
  * @returns a proxy delegating to `callback` with traced values.
  */
  bind(callback) {
    return new Proxy(callback, {
      apply: (target, thisArg, args) => {
        return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
      },
      construct: (target, args, newTarget) => {
        return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
      }
    });
  }
};
function isApplicable(object) {
  return object && typeof object === "object" && typeof object.apply === "function";
}
function Inject(name, config) {
  return function(value, decorator) {
    if (decorator.kind === "class") {
      if (!Object.hasOwn(value, "inject")) {
        defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
        defineProperty(value.inject, symbols.checkProto, true);
      }
      value.inject[name] = config;
    } else if (decorator.kind === "method") {
      const inject = (value[symbols.metadata] ??= {}).inject ??= /* @__PURE__ */ Object.create(null);
      inject[name] = config;
      decorator.addInitializer(function() {
        const property2 = this[symbols.tracker]?.property;
        (this[symbols.initHooks] ??= []).push(() => {
          this.ctx.inject(inject, (ctx) => {
            return value.call(property2 ? withProps(this, { [property2]: ctx }) : this);
          });
        });
      });
    } else throw new Error("@Inject() can only be used on class or class methods");
  };
}
(function(Inject3) {
  function resolve2(inject, result = /* @__PURE__ */ Object.create(null)) {
    if (!inject) return result;
    if (Array.isArray(inject)) for (const name of inject) result[name] = null;
    else if (Reflect.has(inject, symbols.checkProto)) {
      Object.assign(result, resolve2(Object.getPrototypeOf(inject)));
      for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
    } else for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
    return result;
  }
  Inject3.resolve = resolve2;
})(Inject || (Inject = {}));
var RegistryService = class {
  ctx;
  _counter = 0;
  _internal = /* @__PURE__ */ new Map();
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
  }
  /** Allocate the next fiber uid (increments on every read). */
  get counter() {
    return ++this._counter;
  }
  /** Number of registered plugin runtimes. */
  get size() {
    return this._internal.size;
  }
  /**
  * Resolve a supported plugin shape to its executable callback.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @returns the callback identifying the plugin, or `undefined` if invalid.
  */
  resolve(plugin) {
    try {
      if (typeof plugin === "function") return plugin;
      if (isApplicable(plugin)) return plugin.apply;
    } catch {
    }
  }
  /**
  * Look up the runtime record for a plugin.
  *
  * @param plugin — any supported plugin shape.
  * @returns the runtime, or `undefined` when the plugin is not registered.
  */
  get(plugin) {
    const key = this.resolve(plugin);
    return key && this._internal.get(key);
  }
  /**
  * Check whether a plugin has a registered runtime.
  *
  * @param plugin — any supported plugin shape.
  * @returns `true` when at least one fiber of the plugin exists.
  */
  has(plugin) {
    const key = this.resolve(plugin);
    return !!key && this._internal.has(key);
  }
  /**
  * Dispose every running fiber for a plugin and remove its runtime record.
  *
  * @param plugin — any supported plugin shape.
  * @returns the removed runtime, or `undefined` when none was registered.
  */
  delete(plugin) {
    const key = this.resolve(plugin);
    const runtime = key && this._internal.get(key);
    if (!runtime) return;
    this._internal.delete(key);
    for (const fiber of runtime.fibers) fiber.dispose();
    return runtime;
  }
  /** Iterate the registered plugin callbacks. */
  keys() {
    return this._internal.keys();
  }
  /** Iterate the registered plugin runtimes. */
  values() {
    return this._internal.values();
  }
  /** Iterate `[callback, runtime]` pairs. */
  entries() {
    return this._internal.entries();
  }
  /**
  * Visit every registered runtime.
  *
  * @param callback — receives each runtime and its identifying callback.
  */
  forEach(callback) {
    return this._internal.forEach(callback);
  }
  /**
  * Start a callback once the requested dependencies are available.
  *
  * @param inject — required services, as an array or a name → config map.
  * @param callback — plugin body called with `(ctx, config)`.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  inject(inject, callback) {
    return this.plugin({
      inject,
      apply: callback,
      name: callback.name
    });
  }
  /**
  * Start a plugin in the current context and return its fiber.
  *
  * Creates (or reuses) the plugin's runtime record, then starts a new fiber
  * under the current context. Throws if `plugin` is not a supported shape or
  * if the current fiber is already disposed.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @param config — the plugin config, validated against its `Config` schema.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  plugin(plugin, config, getOuterStack = buildOuterStack()) {
    const callback = this.resolve(plugin);
    if (!callback) throw new Error('invalid plugin, expect function or object with an "apply" method, received ' + typeof plugin);
    this.ctx.fiber.assertActive();
    let runtime = this._internal.get(callback);
    if (!runtime) {
      let name = plugin.name;
      if (name === "apply") name = void 0;
      runtime = {
        name,
        callback,
        fibers: new DisposableList(),
        Config: plugin.Config
      };
      this._internal.set(callback, runtime);
    }
    const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
    const wrapped = Object.create(fiber);
    wrapped.then = (onFulfilled, onRejected) => {
      return fiber.await().then(onFulfilled, onRejected);
    };
    return wrapped;
  }
};
var Context = class Context2 {
  /** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
  static effect = symbols.effect;
  /** Symbol key for a context's listener filter, consulted on every event dispatch. */
  static filter = symbols.filter;
  /** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
  static isolate = symbols.isolate;
  /** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
  static intercept = symbols.intercept;
  /**
  * Returns true for Cordis context proxies and context prototypes.
  *
  * Works across realms and across multiple copies of cordis, because the
  * brand is keyed by a global symbol rather than by `instanceof`.
  *
  * @param value — the value to test.
  * @returns `true` if `value` is a Cordis context, narrowing its type.
  */
  static is(value) {
    return !!value?.[Context2.is];
  }
  static {
    Context2.is[Symbol.toPrimitive] = () => /* @__PURE__ */ Symbol.for("cordis.is");
    Context2.prototype[Context2.is] = true;
  }
  /** Create the root context and install the built-in services. */
  constructor() {
    this[symbols.isolate] = /* @__PURE__ */ Object.create(null);
    this[symbols.intercept] = /* @__PURE__ */ Object.create(null);
    const self = new Proxy(this, ReflectService.handler);
    this.root = self;
    this.baseUrl = void 0;
    this.fiber = new Fiber(self, {}, /* @__PURE__ */ Object.create(null), null, () => []);
    this.reflect = new ReflectService(self);
    this.registry = new RegistryService(self);
    this.events = new EventsService(self);
    this.logger = new LoggerService(self);
    this.fiber._disposables.clear();
    return self;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `Context <${this.fiber.name}>`;
  }
  /**
  * Create a child context with extra metadata on top of the current scope.
  *
  * The child prototypally inherits every property of this context; own
  * properties of `meta` shadow the inherited ones. The parent is not mutated.
  *
  * @param meta — own properties (including symbol keys) to define on the child.
  * @returns a child context inheriting from this one.
  */
  extend(meta = {}) {
    const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
    const self = Object.create(getTraceable(this, this));
    for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
    if (!shadow) return self;
    return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
  }
  /**
  * Create a child context with an independent service scope for `name`.
  *
  * Below the returned context, reads and writes of the service `name`
  * resolve against the new label instead of the parent's, so a different
  * implementation can be provided without affecting the parent scope.
  * Passing the same `label` to two `isolate()` calls joins their scopes.
  *
  * @param name — the service name to isolate.
  * @param label — scope label to join; defaults to a fresh unique symbol.
  * @returns a child context whose `name` service resolves in the new scope.
  */
  isolate(name, label) {
    const shadow = Object.create(this[symbols.isolate]);
    shadow[name] = label ?? Symbol(name);
    return this.extend({ [symbols.isolate]: shadow });
  }
  intercept(name, config) {
    const intercept = Object.create(this[symbols.intercept]);
    intercept[name] = config;
    return this.extend({ [symbols.intercept]: intercept });
  }
};
var Service = class Service2 {
  ctx;
  /** Symbol key of an instance method run after construction (class plugins). */
  static init = symbols.init;
  /** Symbol key of the availability predicate passed to `ctx.provide()`. */
  static check = symbols.check;
  /** Symbol key of the phantom intercept-config type parameter. */
  static config = symbols.config;
  /** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
  static invoke = symbols.invoke;
  /** Symbol key of the helper deriving an extended service instance. */
  static extend = symbols.extend;
  /** Symbol key of the tracker metadata used for context tracing. */
  static tracker = symbols.tracker;
  /** Symbol key of the intercept-config resolution helper below. */
  static resolveConfig = symbols.resolveConfig;
  /** The service name this instance is registered under. */
  name;
  /**
  * Register this instance as `name` in the current context.
  *
  * Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
  * service is unregistered automatically when the owning fiber unloads.
  * Services with a `[Service.invoke]` body return a callable instance.
  *
  * @param ctx — the context to register in (stored as `this.ctx`).
  * @param name — the service name; defaults to the static `provide` field.
  */
  constructor(ctx, name) {
    this.ctx = ctx;
    name ??= this.constructor["provide"];
    let self = this;
    const tracker = {
      associate: name,
      property: "ctx"
    };
    if (self[symbols.invoke]) self = createCallable(name, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    self.ctx = ctx;
    self.name = name;
    defineProperty(self, symbols.tracker, tracker);
    self.ctx.reflect.provide(name, self, this[symbols.check]);
    return self;
  }
  [symbols.filter](ctx) {
    return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
  }
  [symbols.extend](props) {
    let self;
    if (this[Service2.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
    else self = Object.create(this);
    return Object.assign(self, props);
  }
  /**
  * Merge intercept config from ancestors with optional base and head values.
  *
  * Entries added closer to the root apply first; `base` is prepended and
  * `head` appended. Uses `Config.merge` when the service declares one,
  * otherwise a shallow `Object.assign`.
  *
  * @param base — lowest-precedence config merged before all intercepts.
  * @param head — highest-precedence config merged after all intercepts.
  * @returns the merged config.
  */
  [symbols.resolveConfig](base, head) {
    let intercept = this.ctx[Context.intercept];
    const configs = [];
    while (this.name in intercept) {
      if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
      intercept = Object.getPrototypeOf(intercept);
    }
    if (base) configs.unshift(base);
    if (head) configs.push(head);
    if (this["Config"]?.merge) return this["Config"].merge(...configs);
    else return Object.assign({}, ...configs);
  }
  static [Symbol.hasInstance](instance) {
    if (!instance) return false;
    let constructor = instance.constructor;
    while (constructor) {
      constructor = constructor.prototype?.constructor;
      if (constructor === this) return true;
      constructor &&= Object.getPrototypeOf(constructor);
    }
    return false;
  }
};

// ../../zrepo/deepseek-harness/vendor/schemastery/src/index.ts
var kSchema = /* @__PURE__ */ Symbol.for("schemastery");
var kValidationError2 = /* @__PURE__ */ Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError2 = class extends TypeError {
  constructor(message, options) {
    let prefix = "$";
    for (const segment of options.path || []) {
      if (typeof segment === "string") {
        prefix += "." + segment;
      } else if (typeof segment === "number") {
        prefix += "[" + segment + "]";
      } else if (typeof segment === "symbol") {
        prefix += `[Symbol(${segment.toString()})]`;
      }
    }
    if (prefix.startsWith(".")) prefix = prefix.slice(1);
    super((prefix === "$" ? "" : `${prefix} `) + message);
    this.options = options;
  }
  options;
  name = "ValidationError";
  static is(error) {
    return !!error?.[kValidationError2];
  }
};
Object.defineProperty(ValidationError2.prototype, kValidationError2, {
  value: true
});
var Schema = function(options) {
  const schema = function(data, options2 = {}) {
    return Schema.resolve(data, schema, options2)[0];
  };
  if (options.refs) {
    const refs = mapValues(options.refs, (options2) => new Schema(options2));
    const getRef = (uid) => refs[uid];
    for (const key in refs) {
      const options2 = refs[key];
      options2.sKey = getRef(options2.sKey);
      options2.inner = getRef(options2.inner);
      options2.list = options2.list && options2.list.map(getRef);
      options2.dict = options2.dict && mapValues(options2.dict, getRef);
    }
    return refs[options.uid];
  }
  Object.assign(schema, options);
  if (typeof schema.callback === "string") {
    try {
      schema.callback = new Function("return " + schema.callback)();
    } catch {
    }
  }
  Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
  Object.setPrototypeOf(schema, Schema.prototype);
  schema.meta ||= {};
  schema.toString = schema.toString.bind(schema);
  return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", {
  get() {
    return {
      version: 1,
      vendor: "schemastery",
      validate: (value) => {
        try {
          return { value: Schema.resolve(value, this, {})[0] };
        } catch (error) {
          if (ValidationError2.is(error)) {
            return { issues: [{ message: error.message, path: error.options.path }] };
          }
          throw error;
        }
      }
    };
  }
});
Schema.ValidationError = ValidationError2;
Schema.prototype.toJSON = function toJSON() {
  if (globalThis.__schemastery_refs__) {
    globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
    return this.uid;
  }
  globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
  globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
  const result = { uid: this.uid, refs: globalThis.__schemastery_refs__ };
  globalThis.__schemastery_refs__ = void 0;
  return result;
};
Schema.prototype.set = function set(key, value) {
  this.dict[key] = value;
  return this;
};
Schema.prototype.push = function push(value) {
  this.list.push(value);
  return this;
};
function mergeDesc(original, messages) {
  const result = typeof original === "string" ? { "": original } : { ...original };
  for (const locale in messages) {
    const value = messages[locale];
    if (value?.$description || value?.$desc) {
      result[locale] = value.$description || value.$desc;
    } else if (typeof value === "string") {
      result[locale] = value;
    }
  }
  return result;
}
function getInner(value) {
  return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
  return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
  const schema = Schema(this);
  const desc = mergeDesc(schema.meta.description, messages);
  if (Object.keys(desc).length) schema.meta.description = desc;
  if (schema.dict) {
    schema.dict = mapValues(schema.dict, (inner, key) => {
      return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
    });
  }
  if (schema.list) {
    schema.list = schema.list.map((inner, index) => {
      return inner.i18n(mapValues(messages, (data = {}) => {
        if (Array.isArray(getInner(data))) return getInner(data)[index];
        if (Array.isArray(data)) return data[index];
        return extractKeys(data);
      }));
    });
  }
  if (schema.inner) {
    schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
      if (getInner(data)) return getInner(data);
      return extractKeys(data);
    }));
  }
  if (schema.sKey) {
    schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
  }
  return schema;
};
Schema.prototype.extra = function extra(key, value) {
  const schema = Schema(this);
  schema.meta = { ...schema.meta, [key]: value };
  return schema;
};
for (const key of ["required", "disabled", "collapse", "hidden", "loose"]) {
  Object.assign(Schema.prototype, {
    [key](value = true) {
      const schema = Schema(this);
      schema.meta = { ...schema.meta, [key]: value };
      return schema;
    }
  });
}
Schema.prototype.deprecated = function deprecated() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({ text: "deprecated", type: "danger" });
  return schema;
};
Schema.prototype.experimental = function experimental() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({ text: "experimental", type: "warning" });
  return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
  const schema = Schema(this);
  const pattern2 = pick(regexp, ["source", "flags"]);
  schema.meta = { ...schema.meta, pattern: pattern2 };
  return schema;
};
Schema.prototype.simplify = function simplify(value) {
  if (isVolatile(value)) value = value.get();
  if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
  if (isNullable(value)) return value;
  if (this.type === "object" || this.type === "dict") {
    const result = {};
    for (const key in value) {
      const schema = this.type === "object" ? this.dict[key] : this.inner;
      const item = schema?.simplify(value[key]);
      if (this.type === "dict" || !isNullable(item)) result[key] = item;
    }
    if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
    return result;
  } else if (this.type === "array" || this.type === "tuple") {
    const result = [];
    value.forEach((value2, index) => {
      const schema = this.type === "array" ? this.inner : this.list[index];
      const item = schema ? schema.simplify(value2) : value2;
      result.push(item);
    });
    return result;
  } else if (this.type === "intersect") {
    const result = {};
    for (const item of this.list) {
      Object.assign(result, item.simplify(value));
    }
    return result;
  } else if (this.type === "union") {
    for (const schema of this.list) {
      try {
        Schema.resolve(value, schema, {});
        return schema.simplify(value);
      } catch {
      }
    }
  }
  return value;
};
Schema.prototype.toString = function toString(inline) {
  return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra2) {
  const schema = Schema(this);
  schema.meta = { ...schema.meta, role, extra: extra2 };
  return schema;
};
for (const key of ["default", "link", "comment", "description", "max", "min", "step"]) {
  Object.assign(Schema.prototype, {
    [key](value) {
      const schema = Schema(this);
      schema.meta = { ...schema.meta, [key]: value };
      return schema;
    }
  });
}
Schema.prototype.volatile = function volatile() {
  if (this.meta.volatile) throw new TypeError("volatile schema is already wrapped");
  return this.extra("volatile", true);
};
var resolvers = {};
var checkedVolatile = /* @__PURE__ */ Symbol("checked-volatile-schema");
function validateVolatileSchema(schema, path2 = [], blocked = false, seen = /* @__PURE__ */ new Map()) {
  const states = seen.get(schema) ?? /* @__PURE__ */ new Set();
  if (states.has(blocked)) return;
  states.add(blocked);
  seen.set(schema, states);
  if (schema.meta?.volatile && blocked) {
    throw new ValidationError2("volatile fields require a fixed object path without an enclosing volatile field", { path: path2 });
  }
  const nested = blocked || !!schema.meta?.volatile;
  if (schema.dict) {
    for (const [key, child] of Object.entries(schema.dict)) validateVolatileSchema(child, [...path2, key], nested, seen);
  }
  if (schema.sKey) validateVolatileSchema(schema.sKey, [...path2, "<key>"], true, seen);
  if (schema.inner && (schema.type !== "lazy" || schema.inner[kSchema])) {
    validateVolatileSchema(schema.inner, [...path2, "*"], true, seen);
  }
  if (schema.list) {
    for (let index = 0; index < schema.list.length; index++) {
      validateVolatileSchema(schema.list[index], [...path2, String(index)], true, seen);
    }
  }
}
Schema.extend = function extend(type, resolve2) {
  resolvers[type] = resolve2;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
  if (!schema) return [data];
  if (!options[checkedVolatile]) {
    validateVolatileSchema(schema, options.path);
    options = { ...options, [checkedVolatile]: true };
  }
  if (schema.meta?.volatile) {
    const inner = Schema(schema);
    inner.meta = { ...schema.meta, volatile: false };
    const [value, adapted] = Schema.resolve(data, inner, options, strict);
    try {
      return [createVolatile(value), adapted];
    } catch (error) {
      throw new ValidationError2(error instanceof Error ? error.message : String(error), options);
    }
  }
  if (options.ignore?.(data, schema)) return [data];
  if (isNullable(data) && schema.type !== "lazy") {
    if (schema.meta.required) throw new ValidationError2(`missing required value`, options);
    let current = schema;
    let fallback = schema.meta.default;
    while (current?.type === "intersect" && isNullable(fallback)) {
      current = current.list[0];
      fallback = current?.meta.default;
    }
    if (isNullable(fallback)) return [data];
    data = clone(fallback);
  }
  const callback = resolvers[schema.type];
  if (!callback) throw new ValidationError2(`unsupported type "${schema.type}"`, options);
  try {
    return callback(data, schema, options, strict);
  } catch (error) {
    if (!schema.meta.loose) throw error;
    return [schema.meta.default];
  }
};
Schema.from = function from(source) {
  if (isNullable(source)) {
    return Schema.any();
  } else if (["string", "number", "boolean"].includes(typeof source)) {
    return Schema.const(source).required();
  } else if (source[kSchema]) {
    return source;
  } else if (typeof source === "function") {
    switch (source) {
      case String:
        return Schema.string().required();
      case Number:
        return Schema.number().required();
      case Boolean:
        return Schema.boolean().required();
      case Function:
        return Schema.function().required();
      default:
        return Schema.is(source).required();
    }
  } else {
    throw new TypeError(`cannot infer schema from ${source}`);
  }
};
Schema.lazy = function lazy(builder) {
  const toJSON2 = () => {
    if (!schema.inner[kSchema]) {
      schema.inner = schema.builder();
      schema.inner.meta = { ...schema.meta, ...schema.inner.meta };
    }
    return schema.inner.toJSON();
  };
  const schema = new Schema({ type: "lazy", builder, inner: { toJSON: toJSON2 } });
  return schema;
};
Schema.natural = function natural() {
  return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
  return Schema.number().step(0.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
  return Schema.union([
    Schema.is(Date),
    Schema.transform(Schema.string().role("datetime"), (value, options) => {
      const date2 = new Date(value);
      if (isNaN(+date2)) throw new ValidationError2(`invalid date "${value}"`, options);
      return date2;
    }, true)
  ]);
};
Schema.regExp = function regExp(flag = "") {
  return Schema.union([
    Schema.is(RegExp),
    Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
      try {
        return new RegExp(value, flag);
      } catch (e) {
        throw new ValidationError2(e.message, options);
      }
    }, true)
  ]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
  return Schema.union([
    Schema.is(ArrayBuffer),
    Schema.is(SharedArrayBuffer),
    Schema.transform(Schema.any(), (value, options) => {
      if (Binary.isSource(value)) return Binary.fromSource(value);
      throw new ValidationError2(`expected ArrayBufferSource but got ${value}`, options);
    }, true),
    ...encoding ? [Schema.transform(Schema.string(), (value, options) => {
      try {
        return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
      } catch (e) {
        throw new ValidationError2(e.message, options);
      }
    }, true)] : []
  ]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
  if (!schema.inner[kSchema]) {
    schema.inner = schema.builder();
    schema.inner.meta = { ...schema.meta, ...schema.inner.meta };
    validateVolatileSchema(schema.inner, options.path, true);
  }
  return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
  return [data];
});
Schema.extend("never", (data, _, options) => {
  throw new ValidationError2(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
  if (deepEqual(data, value)) return [value];
  throw new ValidationError2(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
  const { max = Infinity, min = -Infinity } = meta;
  if (data > max) throw new ValidationError2(`expected ${description} <= ${max} but got ${data}`, options);
  if (data < min && !skipMin) throw new ValidationError2(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
  if (typeof data !== "string") throw new ValidationError2(`expected string but got ${data}`, options);
  if (meta.pattern) {
    const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
    if (!regexp.test(data)) throw new ValidationError2(`expect string to match regexp ${regexp}`, options);
  }
  checkWithinRange(data.length, meta, "string length", options);
  return [data];
});
function decimalShift(data, digits) {
  const str = data.toString();
  if (str.includes("e")) return data * Math.pow(10, digits);
  const index = str.indexOf(".");
  if (index === -1) return data * Math.pow(10, digits);
  const frac = str.slice(index + 1);
  const integer = str.slice(0, index);
  if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
  return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
  step = Math.abs(step);
  if (!/^\d+\.\d+$/.test(step.toString())) {
    return (data - min) % step === 0;
  }
  const index = step.toString().indexOf(".");
  const digits = step.toString().slice(index + 1).length;
  return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
  if (typeof data !== "number") throw new ValidationError2(`expected number but got ${data}`, options);
  checkWithinRange(data, meta, "number", options);
  const { step } = meta;
  if (step && !isMultipleOf(data, meta.min ?? 0, step)) {
    throw new ValidationError2(`expected number multiple of ${step} but got ${data}`, options);
  }
  return [data];
});
Schema.extend("boolean", (data, _, options) => {
  if (typeof data === "boolean") return [data];
  throw new ValidationError2(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
  let value = 0, keys = [];
  if (typeof data === "number") {
    value = data;
    for (const key in bits) {
      if (data & bits[key]) {
        keys.push(key);
      }
    }
  } else if (Array.isArray(data)) {
    keys = data;
    for (const key of keys) {
      if (typeof key !== "string") throw new ValidationError2(`expected string but got ${key}`, options);
      if (key in bits) value |= bits[key];
    }
  } else {
    throw new ValidationError2(`expected number or array but got ${data}`, options);
  }
  if (value === meta.default) return [value];
  return [value, keys];
});
Schema.extend("function", (data, _, options) => {
  if (typeof data === "function") return [data];
  throw new ValidationError2(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
  if (typeof constructor === "function") {
    if (data instanceof constructor) return [data];
    throw new ValidationError2(`expected ${constructor.name} but got ${data}`, options);
  } else {
    if (isNullable(data)) {
      throw new ValidationError2(`expected ${constructor} but got ${data}`, options);
    }
    let prototype = Object.getPrototypeOf(data);
    while (prototype) {
      if (prototype.constructor?.name === constructor) return [data];
      prototype = Object.getPrototypeOf(prototype);
    }
    throw new ValidationError2(`expected ${constructor} but got ${data}`, options);
  }
});
function property(data, key, schema, options) {
  try {
    const [value, adapted] = Schema.resolve(data[key], schema, {
      ...options,
      path: [...options.path || [], key]
    });
    if (adapted !== void 0) data[key] = adapted;
    return value;
  } catch (e) {
    if (!options?.autofix) throw e;
    delete data[key];
    return schema.meta.volatile ? createVolatile(schema.meta.default) : schema.meta.default;
  }
}
Schema.extend("array", (data, { inner, meta }, options) => {
  if (!Array.isArray(data)) throw new ValidationError2(`expected array but got ${data}`, options);
  checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
  return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError2(`expected object but got ${data}`, options);
  const result = {};
  for (const key in data) {
    let rKey;
    try {
      rKey = Schema.resolve(key, sKey, options)[0];
    } catch (error) {
      if (strict) continue;
      throw error;
    }
    result[rKey] = property(data, key, inner, options);
    data[rKey] = data[key];
    if (key !== rKey) delete data[key];
  }
  return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
  if (!Array.isArray(data)) throw new ValidationError2(`expected array but got ${data}`, options);
  const result = list.map((inner, index) => property(data, index, inner, options));
  if (strict) return [result];
  result.push(...data.slice(list.length));
  return [result];
});
function merge(result, data) {
  for (const key in data) {
    if (key in result) continue;
    result[key] = data[key];
  }
}
Schema.extend("object", (data, { dict }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError2(`expected object but got ${data}`, options);
  const result = {};
  for (const key in dict) {
    const value = property(data, key, dict[key], options);
    if (!isNullable(value) || key in data) {
      result[key] = value;
    }
  }
  if (!strict) merge(result, data);
  return [result];
});
Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
  const messages = [];
  for (const inner of list) {
    try {
      return Schema.resolve(data, inner, options, strict);
    } catch (error) {
      messages.push(error);
    }
  }
  throw new ValidationError2(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
  if (!list.length) return [data];
  let result;
  for (const inner of list) {
    const value = Schema.resolve(data, inner, options, true)[0];
    if (isNullable(value)) continue;
    if (isNullable(result)) {
      result = value;
    } else if (typeof result !== typeof value) {
      throw new ValidationError2(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    } else if (typeof value === "object") {
      merge(result ??= {}, value);
    } else if (result !== value) {
      throw new ValidationError2(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    }
  }
  if (!strict && isPlainObject(data)) merge(result, data);
  return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
  const [result, adapted = data] = Schema.resolve(data, inner, options, true);
  if (preserve) {
    return [callback(result)];
  } else {
    return [callback(result), callback(adapted)];
  }
});
var formatters = {};
function defineMethod(name, keys, format) {
  formatters[name] = format;
  Object.assign(Schema, {
    [name](...args) {
      const schema = new Schema({ type: name });
      keys.forEach((key, index) => {
        switch (key) {
          case "sKey":
            schema.sKey = args[index] ?? Schema.string();
            break;
          case "inner":
            schema.inner = Schema.from(args[index]);
            break;
          case "list":
            schema.list = args[index].map(Schema.from);
            break;
          case "dict":
            schema.dict = mapValues(args[index], Schema.from);
            break;
          case "bits": {
            schema.bits = {};
            for (const key2 in args[index]) {
              if (typeof args[index][key2] !== "number") continue;
              schema.bits[key2] = args[index][key2];
            }
            break;
          }
          case "callback": {
            const callback = schema.callback = args[index];
            callback["toJSON"] ||= () => callback.toString();
            break;
          }
          case "constructor": {
            const constructor = schema.constructor = args[index];
            if (typeof constructor === "function") {
              ;
              constructor["toJSON"] ||= () => constructor["name"];
            }
            break;
          }
          default:
            schema[key] = args[index];
        }
      });
      if (name === "object" || name === "dict") {
        schema.meta.default = {};
      } else if (name === "array" || name === "tuple") {
        schema.meta.default = [];
      } else if (name === "bitset") {
        schema.meta.default = 0;
      }
      return schema;
    }
  });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
  if (typeof constructor === "function") {
    return constructor.name;
  } else {
    return constructor;
  }
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
  if (Object.keys(dict).length === 0) return "{}";
  return `{ ${Object.entries(dict).map(([key, inner]) => {
    return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
  }).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
  const result = list.map(({ toString: format }) => format()).join(" | ");
  return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
  return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", ["inner", "callback", "preserve"], ({ inner }, isInner) => inner.toString(isInner));
var src_default = Schema;

// ../../zrepo/deepseek-harness/vendor/cordis/src/utils.ts
var DisposableList2 = class {
  sn = 0;
  map = /* @__PURE__ */ new Map();
  weak = /* @__PURE__ */ new WeakMap();
  get length() {
    return this.map.size;
  }
  push(value) {
    const sn = ++this.sn;
    this.map.set(sn, value);
    this.weak.set(value, sn);
    return () => this.map.delete(sn);
  }
  delete(value) {
    const sn = this.weak.get(value);
    if (!sn) return false;
    return this.map.delete(sn);
  }
  clear() {
    const values = [...this.map.values()];
    this.map.clear();
    return values.reverse();
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this];
  }
};
var symbols2 = {
  // internal symbols
  shadow: /* @__PURE__ */ Symbol.for("cordis.shadow"),
  caller: /* @__PURE__ */ Symbol.for("cordis.caller"),
  receiver: /* @__PURE__ */ Symbol.for("cordis.receiver"),
  original: /* @__PURE__ */ Symbol.for("cordis.original"),
  metadata: /* @__PURE__ */ Symbol.for("cordis.metadata"),
  initHooks: /* @__PURE__ */ Symbol.for("cordis.initHooks"),
  checkProto: /* @__PURE__ */ Symbol.for("cordis.checkProto"),
  // context symbols
  effect: /* @__PURE__ */ Symbol.for("cordis.effect"),
  filter: /* @__PURE__ */ Symbol.for("cordis.filter"),
  isolate: /* @__PURE__ */ Symbol.for("cordis.isolate"),
  intercept: /* @__PURE__ */ Symbol.for("cordis.intercept"),
  // service symbols
  init: /* @__PURE__ */ Symbol.for("cordis.init"),
  check: /* @__PURE__ */ Symbol.for("cordis.check"),
  config: /* @__PURE__ */ Symbol.for("cordis.config"),
  invoke: /* @__PURE__ */ Symbol.for("cordis.invoke"),
  extend: /* @__PURE__ */ Symbol.for("cordis.extend"),
  tracker: /* @__PURE__ */ Symbol.for("cordis.tracker"),
  resolveConfig: /* @__PURE__ */ Symbol.for("cordis.resolveConfig")
};
var GeneratorFunction2 = function* () {
}.constructor;
var AsyncGeneratorFunction2 = async function* () {
}.constructor;
function isConstructor2(func) {
  if (!func.prototype) return false;
  if (func instanceof GeneratorFunction2) return false;
  if (AsyncGeneratorFunction2 !== Function && func instanceof AsyncGeneratorFunction2) return false;
  return true;
}
function joinPrototype2(proto1, proto2) {
  if (proto1 === Object.prototype) return proto2;
  const result = Object.create(joinPrototype2(Object.getPrototypeOf(proto1), proto2));
  for (const key of Reflect.ownKeys(proto1)) {
    Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
  }
  return result;
}
function isObject2(value) {
  return value && (typeof value === "object" || typeof value === "function");
}
function getPropertyDescriptor2(target, prop) {
  let proto = target;
  while (proto) {
    const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
    if (desc) return desc;
    proto = Object.getPrototypeOf(proto);
  }
}
function getTraceable2(ctx, value) {
  if (!isObject2(value)) return value;
  if (Object.hasOwn(value, symbols2.shadow)) {
    return Object.getPrototypeOf(value);
  }
  const tracker = value[symbols2.tracker];
  if (!tracker) return value;
  return createTraceable2(ctx, value, tracker);
}
function withProps2(target, props) {
  if (!props) return target;
  return new Proxy(target, {
    get: (target2, prop, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
      return Reflect.get(target2, prop, receiver);
    },
    set: (target2, prop, value, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
      return Reflect.set(target2, prop, value, receiver);
    }
  });
}
function withProp2(target, prop, value) {
  return withProps2(target, Object.defineProperty(/* @__PURE__ */ Object.create(null), prop, {
    value,
    writable: false
  }));
}
function createShadow2(useSite, target, property2, receiver) {
  if (!property2) return receiver;
  const value = getPropertyDescriptor2(target, property2)?.value;
  if (!value) return receiver;
  const defSite = value[symbols2.shadow] ?? value;
  return withProp2(receiver, property2, useSite.extend({ [symbols2.shadow]: defSite }));
}
function createShadowMethod2(ctx, value, outer, shadow) {
  return new Proxy(value, {
    apply: (target, thisArg, args) => {
      if (thisArg === outer) thisArg = shadow;
      return getTraceable2(ctx, Reflect.apply(target, thisArg, args));
    }
  });
}
function createTraceable2(ctx, value, tracker) {
  const defSite = ctx[symbols2.shadow] ?? ctx;
  const useSite = ctx[symbols2.shadow] ? Object.getPrototypeOf(ctx) : ctx;
  const proxy = new Proxy(value, {
    get: (target, prop, receiver) => {
      if (prop === symbols2.original) return target;
      if (prop === symbols2.caller) return defSite;
      if (prop === tracker.property) return useSite;
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }
      if (tracker.associate && useSite.reflect.props[`${tracker.associate}.${prop}`]) {
        return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp2(ctx, symbols2.receiver, receiver));
      }
      let shadow, innerValue;
      const desc = getPropertyDescriptor2(target, prop);
      if (desc && "value" in desc) {
        innerValue = desc.value;
      } else {
        shadow = createShadow2(useSite, target, tracker.property, receiver);
        innerValue = Reflect.get(target, prop, shadow);
      }
      const innerTracker = innerValue?.[symbols2.tracker];
      if (innerTracker) {
        return createTraceable2(useSite, innerValue, innerTracker);
      } else if (!tracker.noShadow && typeof innerValue === "function") {
        shadow ??= createShadow2(useSite, target, tracker.property, receiver);
        return createShadowMethod2(useSite, innerValue, receiver, shadow);
      } else {
        return innerValue;
      }
    },
    set: (target, prop, value2, receiver) => {
      if (prop === symbols2.original) return false;
      if (prop === symbols2.caller) return false;
      if (prop === tracker.property) return false;
      if (typeof prop === "symbol") {
        return Reflect.set(target, prop, value2, receiver);
      }
      if (tracker.associate && useSite.reflect.props[`${tracker.associate}.${prop}`]) {
        return Reflect.set(ctx, `${tracker.associate}.${prop}`, value2, withProp2(ctx, symbols2.receiver, receiver));
      }
      const shadow = createShadow2(useSite, target, tracker.property, receiver);
      return Reflect.set(target, prop, value2, shadow);
    },
    apply: (target, thisArg, args) => {
      const receiver = tracker.noShadow ? proxy : createShadow2(useSite, target, tracker.property, proxy);
      return applyTraceable2(receiver, target, thisArg, args);
    }
  });
  return proxy;
}
function applyTraceable2(proxy, value, thisArg, args) {
  if (!value[symbols2.invoke]) return Reflect.apply(value, thisArg, args);
  return value[symbols2.invoke].apply(proxy, args);
}
function createCallable2(name, proto, tracker) {
  const self = function(...args) {
    const proxy = createTraceable2(self["ctx"], self, tracker);
    return Reflect.apply(proxy, this, args);
  };
  defineProperty(self, "name", name);
  return Object.setPrototypeOf(self, proto);
}
function handleError2(info, reason, getOuterStack) {
  const innerLines = info.error.stack.split("\n");
  if (typeof reason?.stack !== "string") {
    const outerError = new Error(reason);
    const lines2 = outerError.stack.split("\n");
    lines2.splice(1, Infinity, ...getOuterStack());
    outerError.stack = lines2.join("\n");
    throw outerError;
  }
  const lines = reason.stack.split("\n");
  let index = lines.indexOf(innerLines[2]);
  if (index === -1) throw reason;
  index -= info.offset;
  while (index > 0) {
    if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
    index -= 1;
  }
  lines.splice(index, Infinity, ...getOuterStack());
  reason.stack = lines.join("\n");
  throw reason;
}
function composeError2(callback, getOuterStack = buildOuterStack2()) {
  const info = { offset: 1, error: new Error() };
  try {
    const result = callback(info);
    if (isObject2(result) && "then" in result) {
      return result.then(void 0, (reason) => handleError2(info, reason, getOuterStack));
    } else {
      return result;
    }
  } catch (reason) {
    handleError2(info, reason, getOuterStack);
  }
}
function buildOuterStack2(offset = 0) {
  const outerError = new Error();
  return () => outerError.stack.split("\n").slice(3 + offset);
}

// ../../zrepo/deepseek-harness/vendor/cordis/src/fiber.ts
var kValidationError3 = /* @__PURE__ */ Symbol.for("ValidationError");
var ValidationError3 = class extends TypeError {
  name = "ValidationError";
  /**
   * Build the aggregated message from schema issues.
   *
   * @param issues — the standard-schema issues, one message line each.
   */
  constructor(issues) {
    super(`invalid config:
` + issues.map((issue) => {
      if (issue.path) {
        return `  - ${issue.message} (at ${issue.path.join(".")})`;
      } else {
        return `  - ${issue.message}`;
      }
    }).join("\n"));
  }
};
Object.defineProperty(ValidationError3.prototype, kValidationError3, {
  value: true
});
function resolveConfig2(runtime, config) {
  if (!runtime.Config) return config;
  const result = runtime.Config["~standard"].validate(config);
  if ("then" in result) {
    throw new TypeError("Async config validation is not supported");
  }
  if (result.issues) {
    throw new ValidationError3(result.issues);
  } else {
    return result.value;
  }
}
var effectInertia2 = /* @__PURE__ */ new WeakMap();
function runDisposable2(dispose) {
  const result = dispose();
  return effectInertia2.get(dispose)?.() ?? result;
}
function emitPluginDisposed2(context, fiber) {
  const args = ["internal/plugin", fiber];
  let callbacks;
  try {
    callbacks = context.events.dispatch("emit", args);
  } catch (error) {
    context.logger.error(error);
    return;
  }
  for (const callback of callbacks) {
    try {
      const returned = callback(...args);
      void Promise.resolve(returned).catch((error) => context.logger.error(error));
    } catch (error) {
      context.logger.error(error);
    }
  }
}
var CordisError3 = class _CordisError extends Error {
  /**
   * @param code — the stable error code; also the default message.
   * @param message — optional human-readable override.
   */
  constructor(code, message) {
    super(message ?? _CordisError.Code[code]);
    this.code = code;
  }
  code;
};
((CordisError4) => {
  CordisError4.Code = {
    INACTIVE_EFFECT: "cannot create effect on inactive context"
  };
})(CordisError3 || (CordisError3 = {}));
var INACTIVE2 = "__INACTIVE__";
var Fiber2 = class {
  /**
   * Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
   * rather than constructing them directly.
   *
   * @param parent — the context the plugin was loaded from.
   * @param config — raw config, validated against the runtime's schema.
   * @param inject — resolved dependency map (service name → intercept config).
   * @param runtime — the shared plugin runtime, or `null` for the root fiber.
   * @param getOuterStack — captures the caller stack for effect diagnostics.
   */
  constructor(parent, config, inject, runtime, getOuterStack) {
    this.parent = parent;
    this.inject = inject;
    this.runtime = runtime;
    this.config = config;
    const collect = (dispose) => {
      this._disposables.push(dispose);
    };
    if (runtime) {
      this.uid = parent.registry.counter;
      this.ctx = this.context = parent.extend({ fiber: this });
      const injectEntries = Object.entries(this.inject);
      if (injectEntries.length) {
        this.ctx[Context3.intercept] = Object.create(parent[Context3.intercept]);
        for (const [name, config2] of injectEntries) {
          if (isNullable(config2)) continue;
          this.ctx[Context3.intercept][name] = config2;
        }
      }
      this._runner = {
        epoch: INACTIVE2,
        getOuterStack,
        execute: function() {
          const config2 = this.resolveConfig(this.config);
          this._effectiveConfig = config2;
          if (isConstructor2(runtime.callback)) {
            const instance = new runtime.callback(this.ctx, config2);
            for (const hook of instance?.[symbols2.initHooks] ?? []) {
              hook();
            }
            return instance?.[symbols2.init]?.();
          } else {
            return runtime.callback(this.ctx, config2);
          }
        },
        collect
      };
      this.dispose = parent.fiber.effect(() => {
        const remove = runtime.fibers.push(this);
        return async () => {
          this.uid = null;
          emitPluginDisposed2(this.context, this);
          if (this.ctx.registry.has(runtime.callback)) {
            remove();
            if (!runtime.fibers.length) {
              this.ctx.registry.delete(runtime.callback);
            }
          }
          this._setEpoch(INACTIVE2);
          if (!this.inertia) {
            this._updateState(() => {
              this.inertia = this._unload();
              return 5 /* UNLOADING */;
            });
          }
          while (this.inertia) {
            await this.inertia;
          }
        };
      }, "ctx.plugin()");
      try {
        this.context.emit("internal/plugin", this);
      } catch (error) {
        void Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
        throw error;
      }
      if (this.uid !== null && parent.fiber.state !== 5 /* UNLOADING */) {
        for (const name of Object.keys(this.inject)) {
          this._checkImpl(name);
        }
        this._refresh();
      }
    } else {
      this.uid = 0;
      this.ctx = this.context = parent;
      this.state = 2 /* ACTIVE */;
      this.committed = /* @__PURE__ */ Object.create(null);
      this._runner = {
        epoch: "0",
        getOuterStack,
        execute: () => {
        },
        collect
      };
      this.dispose = () => this.restart();
    }
  }
  parent;
  inject;
  runtime;
  /** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
  uid;
  /** The context this fiber's plugin runs in (extends the parent context). */
  ctx;
  /** Raw plugin input retained for the next activation. */
  config;
  /** Current lifecycle state; transitions emit `internal/status`. */
  state = 0 /* PENDING */;
  /** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
  dispose;
  /** Required implementations retained through dependent teardown. */
  committed;
  /** Service implementations owned by this fiber, including isolated provisions. */
  provisions = /* @__PURE__ */ new Set();
  /** The in-flight load/unload transition, if one is currently running. */
  inertia;
  _hooks = /* @__PURE__ */ Object.create(null);
  _disposables = new DisposableList2();
  // Same as `this.ctx`, but with a more specific type.
  context;
  _error;
  _revision = 0;
  _configRevision = 0;
  _effectiveConfig;
  _runner;
  _store = /* @__PURE__ */ Object.create(null);
  _release;
  /** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
  get name() {
    let fiber = this;
    do {
      if (fiber.runtime?.name) return fiber.runtime.name;
      fiber = fiber.parent.fiber;
    } while (fiber !== fiber.parent.fiber);
    return "root";
  }
  /**
   * Throw if the fiber has already been disposed.
   *
   * @returns nothing when the fiber is still active.
   * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
   */
  assertActive() {
    if (this.uid !== null) return;
    throw new CordisError3("INACTIVE_EFFECT");
  }
  _execute(runner) {
    const oldEpoch = runner.epoch;
    return composeError2((info) => {
      const safeCollect = (dispose) => {
        if (typeof dispose === "function") {
          runner.collect(dispose);
        } else if (!isNullable(dispose)) {
          throw new TypeError("Invalid effect");
        }
      };
      const effect = runner.execute.call(this);
      if (typeof effect === "function") {
        return runner.collect(effect);
      } else if (isNullable(effect)) {
      } else if (!isObject2(effect)) {
        throw new TypeError("Invalid effect");
      } else if ("then" in effect) {
        return effect.then(safeCollect);
      } else if (Symbol.iterator in effect) {
        info.error = new Error();
        const iter = effect[Symbol.iterator]();
        while (true) {
          const result = iter.next();
          safeCollect(result.value);
          if (result.done) return;
        }
      } else if (Symbol.asyncIterator in effect) {
        const iter = effect[Symbol.asyncIterator]();
        return (async () => {
          await Promise.resolve();
          info.error = new Error();
          while (true) {
            if (runner.epoch !== oldEpoch) return;
            const result = await iter.next();
            safeCollect(result.value);
            if (result.done) return;
          }
        })();
      } else {
        throw new TypeError("Invalid effect");
      }
    }, runner.getOuterStack);
  }
  effect(execute, label = "anonymous") {
    this.assertActive();
    if (this.state === 5 /* UNLOADING */) {
      throw new CordisError3("INACTIVE_EFFECT");
    }
    const disposables = [];
    let disposing = false;
    let disposalTask;
    const dispose = () => {
      if (disposing) return disposalTask;
      disposing = true;
      let task2;
      for (const disposable of disposables.splice(0).reverse()) {
        if (task2) {
          task2 = task2.then(() => runDisposable2(disposable));
        } else {
          const result = runDisposable2(disposable);
          if (isObject2(result) && "then" in result) {
            task2 = result;
          }
        }
      }
      return disposalTask = task2;
    };
    const meta = { label, children: [] };
    const runner = {
      execute,
      epoch: true,
      collect: (dispose2) => {
        disposables.push(dispose2);
        this._disposables.delete(dispose2);
        if (dispose2[symbols2.effect]) {
          meta.children.push(dispose2[symbols2.effect]);
        }
      },
      getOuterStack: buildOuterStack2()
    };
    let task;
    let executing = true;
    let resolveSetup;
    let rejectSetup;
    let setupBarrier;
    let setupFailed = false;
    let inFlight;
    let removeWrapper = () => false;
    const waitForSetup = () => {
      setupBarrier ??= new Promise((resolve2, reject) => {
        resolveSetup = resolve2;
        rejectSetup = reject;
      });
      return setupBarrier;
    };
    const disposeAfter = (setup) => {
      return Promise.resolve(setup).then(
        () => dispose(),
        async (reason) => {
          await dispose();
          throw reason;
        }
      );
    };
    const finalizeDisposal = (callback) => {
      let result;
      try {
        result = callback();
      } catch (error) {
        removeWrapper();
        throw error;
      }
      if (isObject2(result) && "then" in result) {
        const pending = Promise.resolve(result).finally(() => {
          removeWrapper();
          if (inFlight === pending) inFlight = void 0;
        });
        return inFlight = pending;
      }
      removeWrapper();
      return result;
    };
    const wrapper = defineProperty(() => {
      if (!runner.epoch) return setupFailed ? inFlight : void 0;
      runner.epoch = false;
      return finalizeDisposal(() => {
        if (executing) return disposeAfter(waitForSetup());
        return task ? disposeAfter(task) : dispose();
      });
    }, symbols2.effect, meta);
    effectInertia2.set(wrapper, () => inFlight);
    removeWrapper = this._disposables.push(wrapper);
    try {
      task = this._execute(runner);
    } catch (reason) {
      executing = false;
      setupFailed = true;
      runner.epoch = false;
      let cleanup;
      try {
        cleanup = finalizeDisposal(dispose);
      } finally {
        rejectSetup?.(reason);
      }
      if (isObject2(cleanup) && "then" in cleanup) {
        cleanup.catch((error) => this.ctx.logger.error(error));
      }
      throw reason;
    }
    executing = false;
    if (setupBarrier) {
      Promise.resolve(task).then(resolveSetup, rejectSetup);
    }
    task?.catch(() => {
      if (!runner.epoch) return dispose();
      return finalizeDisposal(dispose);
    }).catch((error) => this.ctx.logger.error(error));
    const disposeAsync = () => {
      if (!runner.epoch) return;
      runner.epoch = false;
      return finalizeDisposal(dispose);
    };
    wrapper.then = async (onFulfilled, onRejected) => {
      return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
    };
    return wrapper;
  }
  /**
   * Return metadata for currently registered effects.
   *
   * @returns one {@link EffectMeta} tree per labeled live effect.
   */
  getEffects() {
    return [...this._disposables].map((dispose) => dispose[symbols2.effect]).filter(Boolean);
  }
  _getState() {
    if (this.uid === null) return 4 /* DISPOSED */;
    if (this._error) return 3 /* FAILED */;
    if (this._runner.epoch !== INACTIVE2) return 2 /* ACTIVE */;
    return 0 /* PENDING */;
  }
  _updateState(callback) {
    const oldState = this.state;
    this.state = callback() ?? this._getState();
    if (oldState === this.state) return;
    this.context.emit("internal/status", this, oldState);
    if (oldState !== 2 /* ACTIVE */ && this.state !== 2 /* ACTIVE */) return;
    for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
      const impl = this.ctx.reflect.store[key];
      if (impl.ctx.fiber !== this) continue;
      this.ctx.isolate(impl.name, impl.isolate).reflect.notify([impl.name]);
    }
  }
  _checkImpl(name) {
    const impl = this.ctx.reflect._getImpl(name, true);
    if (!impl) return delete this._store[name];
    try {
      if (impl.check && !impl.check.call(getTraceable2(this.ctx, impl.value))) {
        return delete this._store[name];
      }
    } catch (error) {
      impl.ctx.logger.error(error);
      return delete this._store[name];
    }
    this._store[name] = impl;
  }
  _refresh() {
    let epoch = `${this._revision}`;
    for (const name of Object.keys(this.inject)) {
      const impl = this._store[name];
      if (!impl) {
        epoch = INACTIVE2;
        break;
      }
      epoch += ":" + impl.uid;
    }
    this._setEpoch(epoch);
  }
  _setEpoch(epoch) {
    const oldEpoch = this._runner.epoch;
    if (epoch === oldEpoch) return;
    if (this._error) return;
    this._runner.epoch = epoch;
    if (this.inertia) return;
    this._updateState(() => {
      if (epoch !== INACTIVE2 && oldEpoch === INACTIVE2) {
        this.inertia = this._reload();
        return 1 /* LOADING */;
      } else {
        this.inertia = this._unload();
        return 5 /* UNLOADING */;
      }
    });
  }
  /** Raw input retained for the next activation, without evaluating expressions or validating it. */
  get rawConfig() {
    return this.ctx.fiber.config;
  }
  /** Retain raw input without changing the running config or triggering an update. */
  set rawConfig(config) {
    this.ctx.fiber.config = config;
    this.ctx.fiber._configRevision++;
  }
  /**
   * The object passed to plugin activation or the latest successful update that retained the instance.
   * Candidate resolution does not publish it; volatile updates retain its references.
   * Undefined before activation and readable after unload; callers requiring a live instance check `state`.
   */
  get effectiveConfig() {
    return this.ctx.fiber._effectiveConfig;
  }
  /**
   * Evaluate and validate a candidate using this fiber's `internal/config` hooks and runtime schema.
   * Does not publish the result, replace raw input, or commit running volatile references.
   * Required injections must be available when a hook uses them.
   * @param config Raw candidate input.
   * @returns The candidate's resolved config, retaining the schema's result identity.
   * @throws {ValidationError} when the runtime schema rejects the candidate; hook errors propagate.
   */
  resolveConfig(config) {
    const fiber = this.ctx.fiber;
    return fiber.context.waterfall("internal/config", fiber, () => config);
  }
  async _reload() {
    this.committed = { ...this._store };
    for (const impl of Object.values(this.committed)) {
      if (impl.ctx.fiber === this) continue;
      impl.dependents.add(this);
    }
    const oldEpoch = this._runner.epoch;
    try {
      await Promise.resolve();
      if (this._runner.epoch === oldEpoch) {
        await this._execute(this._runner);
      }
    } catch (reason) {
      this.ctx.logger.error(reason);
      if (this._runner.epoch === oldEpoch) {
        this._error = reason;
        this._runner.epoch = INACTIVE2;
      }
    }
    this._updateState(() => {
      if (this._runner.epoch === oldEpoch) {
        this.inertia = void 0;
      } else {
        this.inertia = this._unload();
        return 5 /* UNLOADING */;
      }
    });
  }
  async _unload() {
    while ([...this.provisions].some((impl) => impl.dependents.size)) {
      await new Promise((resolve2) => this._release = resolve2);
    }
    this._release = void 0;
    await Promise.all(this._disposables.clear().map(async (dispose) => {
      try {
        await composeError2(async (info) => {
          await Promise.resolve();
          info.error = new Error();
          await runDisposable2(dispose);
        }, this._runner.getOuterStack);
      } catch (reason) {
        this.ctx.logger.error(reason);
      }
    }));
    for (const impl of Object.values(this.committed ?? {})) {
      if (!impl.dependents.delete(this) || impl.dependents.size) continue;
      impl.release?.();
      impl.ctx.fiber._release?.();
    }
    this.committed = void 0;
    this._updateState(() => {
      if (this._runner.epoch === INACTIVE2) {
        this.inertia = void 0;
      } else {
        this.inertia = this._reload();
        return 1 /* LOADING */;
      }
    });
  }
  /**
   * Wait for current lifecycle work and rethrow startup errors.
   *
   * @returns this fiber, once it has settled into a stable state.
   * @throws the config-validation or plugin-startup error, if any.
   */
  async await() {
    while (this.inertia) {
      await this.inertia;
    }
    if (this._error) throw this._error;
    return this;
  }
  /**
   * Dispose and immediately reload this plugin with its current config.
   *
   * @returns a promise resolving once the reload settled.
   * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
   */
  async restart() {
    const fiber = this.ctx.fiber;
    fiber.assertActive();
    fiber._revision++;
    fiber._refresh();
    await fiber.await();
  }
  /**
   * Resolve a candidate, retain its raw config and apply it through the update waterfall.
   * @param config Raw config; pending fibers defer resolution until activation.
   * @param noSave Suppress the persistence notification when true.
   * @returns The awaited update/restart result, or undefined when a synchronous listener handles it.
   * @throws {ValidationError} when an active fiber's candidate is invalid.
   */
  update(config, noSave = false) {
    const fiber = this.ctx.fiber;
    fiber.assertActive();
    const loaded = fiber._runner.epoch !== INACTIVE2;
    const resolved = loaded ? fiber.resolveConfig(config) : void 0;
    if (!noSave) fiber.context.emit("internal/commit", fiber, config);
    fiber.config = config;
    fiber._error = void 0;
    const configRevision = ++fiber._configRevision;
    const epoch = fiber._runner.epoch;
    const committed = fiber.committed;
    let restarted = false;
    const restart = () => {
      restarted = true;
      return fiber.restart();
    };
    const publish = () => {
      if (!restarted && fiber.uid !== null && fiber._configRevision === configRevision && fiber._runner.epoch === epoch && fiber.committed === committed) {
        fiber._effectiveConfig = resolved;
      }
    };
    const result = loaded ? fiber.context.waterfall(fiber, "internal/update", resolved, restart) : restart();
    if (result === void 0) {
      publish();
      return;
    }
    const task = Promise.resolve(result).then(publish);
    task.catch(() => {
    });
    return task;
  }
};

// ../../zrepo/deepseek-harness/vendor/cordis/src/events.ts
function isBailed2(value) {
  return value !== null && value !== false && value !== void 0;
}
var EventsService2 = class {
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols2.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.on("internal/listener", function(name, listener, options) {
      if (name === "internal/update" && !options.global) {
        const hooks = this.fiber._hooks["internal/update"] ??= new DisposableList2();
        const method = options.prepend ? "unshift" : "push";
        return this.fiber.effect(() => hooks[method](listener), 'ctx.on("internal/update")');
      }
    });
    this.on("internal/update", function(config, next) {
      const cbs = [...this._hooks["internal/update"] || []];
      const _next = () => {
        const cb = cbs.shift() ?? next;
        return cb.call(this, config, _next);
      };
      return _next();
    }, { global: true, prepend: true });
    this.on("internal/config", (fiber, next) => {
      const config = next();
      return fiber.runtime ? resolveConfig2(fiber.runtime, config) : config;
    });
  }
  ctx;
  _hooks = /* @__PURE__ */ Object.create(null);
  _resolve(type, args) {
    const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
    const name = args.shift();
    if ((typeof name !== "string" || !name.startsWith("internal/")) && this._hooks["internal/dispatch"]?.length) {
      this.emit("internal/dispatch", type, name, args, thisArg);
    }
    const filter = thisArg?.[Context3.filter];
    return [thisArg, (this._hooks[name] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback)];
  }
  /**
   * Resolve bound callbacks using the event's context filter.
   * @param type Dispatch mode reported to observers.
   * @param args Dispatch arguments, consumed through the event name.
   * @returns Matching callbacks bound to the dispatch receiver.
   * DSH retains callback enumeration for per-listener error containment.
   */
  dispatch(type, args) {
    const [thisArg, callbacks] = this._resolve(type, args);
    return callbacks.map((callback) => callback.bind(thisArg));
  }
  /**
   * Run listeners concurrently and wait for all of them.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns a promise resolving once every listener has settled.
   */
  async parallel(...args) {
    const [thisArg, callbacks] = this._resolve("parallel", args);
    const results = await Promise.allSettled(callbacks.map(async (callback) => Reflect.apply(callback, thisArg, args)));
    const errors = results.filter((result) => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
  }
  /**
   * Run listeners synchronously without waiting for returned promises.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   */
  emit(...args) {
    const [thisArg, callbacks] = this._resolve("emit", args);
    for (const callback of callbacks) Reflect.apply(callback, thisArg, args);
  }
  /**
   * Run listeners in order, awaiting each, until one returns a bail value.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns the first bail value (see {@link isBailed}), if any.
   */
  async serial(...args) {
    const [thisArg, callbacks] = this._resolve("serial", args);
    for (const callback of callbacks) {
      const result = await Reflect.apply(callback, thisArg, args);
      if (isBailed2(result)) return result;
    }
  }
  /**
   * Run listeners synchronously until one returns a bail value.
   *
   * @param args — optional `this`, the event name, then listener arguments.
   * @returns the first bail value (see {@link isBailed}), if any.
   */
  bail(...args) {
    const [thisArg, callbacks] = this._resolve("bail", args);
    for (const callback of callbacks) {
      const result = Reflect.apply(callback, thisArg, args);
      if (isBailed2(result)) return result;
    }
  }
  /**
   * Compose listeners around the final `next` callback.
   *
   * The last dispatch argument is treated as the innermost `next`. Listeners
   * run outermost-first; a listener that does not call `next()` vetoes the
   * rest of the chain, including the built-in behavior.
   *
   * @param args — optional `this`, the event name, listener arguments, then `next`.
   * @returns the outermost listener's return value.
   */
  waterfall(...args) {
    const [thisArg, callbacks] = this._resolve("waterfall", args);
    const inner = args.pop();
    const dispatch = () => {
      const callback = callbacks.shift();
      if (!callback) return inner();
      let called = false;
      const next = () => {
        if (called) throw new Error("next() called multiple times");
        called = true;
        return dispatch();
      };
      return Reflect.apply(callback, thisArg, [...args, next]);
    };
    return dispatch();
  }
  register(label, name, callback, options) {
    const method = options.prepend ? "unshift" : "push";
    return this.ctx.fiber.effect(() => {
      const hooks = this._hooks[name] ??= [];
      hooks[method]({ ctx: this.ctx, callback, ...options });
      return () => this.unregister(name, callback);
    }, label);
  }
  unregister(name, callback) {
    const hooks = this._hooks[name];
    if (!hooks) return;
    const index = hooks.findIndex((hook) => hook.callback === callback);
    if (index >= 0) {
      hooks.splice(index, 1);
      if (!hooks.length) delete this._hooks[name];
      return true;
    }
  }
  /**
   * Register an event listener owned by the current fiber.
   *
   * The listener is removed automatically when the fiber unloads. Throws
   * `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
   *
   * @param name — the event name to listen for.
   * @param listener — called with the dispatch arguments.
   * @param options — listener options; a boolean is shorthand for `prepend`.
   * @returns a disposer removing the listener; `true` if it was still registered.
   */
  on(name, listener, options) {
    if (typeof options !== "object") {
      options = { prepend: options };
    }
    this.ctx.fiber.assertActive();
    listener = this.ctx.reflect.bind(listener);
    const result = this.bail(this.ctx, "internal/listener", name, listener, options);
    if (result) return result;
    const label = `ctx.on(${typeof name === "string" ? JSON.stringify(name) : name.toString()})`;
    return this.register(label, name, listener, options);
  }
  /**
   * Register an event listener that disposes itself after the first call.
   *
   * @param name — the event name to listen for.
   * @param listener — called at most once with the dispatch arguments.
   * @param options — listener options; a boolean is shorthand for `prepend`.
   * @returns a disposer removing the listener; `true` if it was still registered.
   */
  once(name, listener, options) {
    const dispose = this.on(name, function(...args) {
      dispose();
      return listener.apply(this, args);
    }, options);
    return dispose;
  }
};

// ../../zrepo/deepseek-harness/vendor/cordis/src/logger.ts
var defaultFormatters2 = {
  s: (value) => String(value),
  d: (value) => Math.trunc(Number(value)),
  i: (value) => Math.trunc(Number(value)),
  f: (value) => Number(value),
  o: (value) => JSON.stringify(value),
  O: (value) => JSON.stringify(value),
  c: () => "",
  C: (value, exporter, message) => {
    return Logger2.color(exporter, Logger2.code(message.name, exporter.colors), value);
  }
};
function isAggregateError2(error) {
  return error instanceof Error && Array.isArray(error["errors"]);
}
var Logger2 = class {
  constructor(options, service) {
    this.service = service;
    Object.assign(this, options);
    this.error = this._method("error", 0 /* ERROR */);
    this.info = this._method("info", 2 /* INFO */);
    this.warn = this._method("warn", 1 /* WARN */);
    this.debug = this._method("debug", 3 /* DEBUG */);
  }
  service;
  static color(exporter, code, value, decoration = "") {
    if (!exporter.colors) return "" + value;
    return `\x1B[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\x1B[0m`;
  }
  static code(name, level) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !level ? [] : level >= 2 ? c2562 : c162;
    return colors[Math.abs(hash) % colors.length];
  }
  static format(exporter, message) {
    const args = message.args.slice();
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") {
      args.unshift("%o");
    }
    let format = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = exporter.formatters?.[char] ?? defaultFormatters2[char];
      if (typeof formatter === "function") {
        const value = args.shift();
        return formatter(value, exporter, message);
      }
      return match;
    });
    const oFormatter = exporter.formatters?.o ?? defaultFormatters2.o;
    for (let arg of args) {
      if (typeof arg === "object" && arg) {
        arg = oFormatter(arg, exporter, message);
      }
      format += " " + arg;
    }
    const { maxLength = 10240 } = exporter;
    return format.split(/\r?\n/g).map((line) => {
      return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
    }).join("\n");
  }
  _method(type, level) {
    return (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) {
          this[type](args[0].cause);
        } else if (isAggregateError2(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const sn = ++this.service._snMessage;
      const ts = Date.now();
      for (const exporter of this.service.exporters.values()) {
        const targetLevel = exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 2 /* INFO */;
        if (targetLevel < level) continue;
        const message = { sn, ts, type, level, name: this.name, ...this.meta, args };
        exporter.export(message);
      }
    };
  }
};
var c162 = [6, 2, 3, 4, 5, 1];
var c2562 = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221
];
var LoggerService3 = class _LoggerService {
  bufferSize = 1e3;
  buffer = [];
  ctx;
  _snMessage = 0;
  _snExporter = 0;
  exporters = /* @__PURE__ */ new Map();
  constructor(ctx) {
    const tracker = {
      property: "ctx",
      noShadow: true
    };
    const self = createCallable2("logger", joinPrototype2(Object.getPrototypeOf(this), Function.prototype), tracker);
    Object.assign(self, this);
    self.ctx = ctx;
    defineProperty(self, symbols2.tracker, tracker);
    self.exporter({
      colors: 3,
      export: (message) => {
        self.buffer.push(message);
        const overflow = self.buffer.length - self.bufferSize;
        if (overflow === 1) {
          self.buffer.shift();
        } else if (overflow > 1) {
          self.buffer.splice(0, overflow);
        }
      }
    });
    return self;
  }
  /**
   * Register an exporter and dispose it with the current fiber.
   *
   * @param exporter — the sink that receives structured log messages.
   * @returns a disposer that removes the exporter.
   */
  exporter(exporter) {
    return this.ctx.effect(() => {
      const id = ++this._snExporter;
      this.exporters.set(id, exporter);
      return () => this.exporters.delete(id);
    }, "ctx.logger.exporter()");
  }
  _resolveConfig() {
    let intercept = this.ctx[symbols2.intercept];
    const configs = [];
    while ("logger" in intercept) {
      if (Object.hasOwn(intercept, "logger")) {
        configs.unshift(intercept["logger"]);
      }
      intercept = Object.getPrototypeOf(intercept);
    }
    return Object.assign({}, ...configs);
  }
  [symbols2.invoke](name) {
    const config = this._resolveConfig();
    const caller = this[symbols2.caller];
    const fiber = (caller ?? this.ctx).fiber;
    name ??= config.name;
    name ??= hyphenate(fiber.name);
    return new Logger2({
      name,
      level: config.level,
      meta: { fiber: new WeakRef(fiber) }
    }, this);
  }
  static {
    for (const type of ["error", "info", "warn", "debug"]) {
      ;
      _LoggerService.prototype[type] = function(...args) {
        return this()[type](...args);
      };
    }
  }
};

// ../../zrepo/deepseek-harness/vendor/cordis/src/reflect.ts
function enhanceError2(error) {
  const lines = error.stack.split("\n");
  lines.splice(0, 2, `Error: ${error.message}`);
  error.stack = lines.join("\n");
  return error;
}
var RESERVED_WORDS2 = ["prototype", "then"];
function isSpecialProperty2(prop) {
  return typeof prop === "symbol" || RESERVED_WORDS2.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
var ReflectService2 = class {
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols2.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.mixin("reflect", ["get", "set", "provide", "accessor", "mixin"]);
    this.mixin("fiber", ["runtime", "effect"]);
    this.mixin("registry", ["inject", "plugin"]);
    this.mixin("events", ["on", "once", "parallel", "emit", "serial", "bail", "waterfall"]);
  }
  ctx;
  /** Proxy traps implementing service resolution for every context object. */
  static handler = {
    get: (target, prop, ctx) => {
      if (isSpecialProperty2(prop)) {
        return Reflect.get(target, prop, ctx);
      }
      if (Reflect.has(target, prop)) {
        return getTraceable2(ctx, Reflect.get(target, prop, ctx));
      }
      const error = new Error(`cannot get property "${prop}" without inject`);
      try {
        const def = target.reflect.props[prop];
        if (def?.type === "accessor") {
          return def.get.call(ctx, ctx[symbols2.receiver], error);
        }
        const defSite = ctx[symbols2.shadow] ?? ctx;
        if (!defSite.fiber.runtime) return ctx.reflect.get(prop, false);
        return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
          const key = defSite[symbols2.isolate][prop];
          let fiber = defSite.fiber;
          while (true) {
            let impl = fiber.committed?.[prop];
            for (const provision of fiber.provisions) {
              if (provision.name === prop && provision.ctx[symbols2.isolate][prop] === key) impl = provision;
            }
            if (impl) return getTraceable2(ctx, impl.value);
            if (prop in fiber.inject) {
              error.message = `cannot get required service "${prop}" in inactive context`;
              throw error;
            }
            if (!fiber.runtime) throw error;
            if (fiber.parent[symbols2.isolate][prop] !== key) throw error;
            fiber = fiber.parent.fiber;
          }
        });
      } catch (e) {
        throw e === error ? enhanceError2(e) : e;
      }
    },
    set: (target, prop, value, ctx) => {
      if (isSpecialProperty2(prop)) {
        return Reflect.set(target, prop, value, ctx);
      }
      const error = new Error(`cannot set property "${prop}" without provide`);
      const def = target.reflect.props[prop];
      if (!def) {
        if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
        throw enhanceError2(error);
      }
      try {
        if (def.type === "accessor") {
          if (!def.set) return false;
          return def.set.call(ctx, value, ctx[symbols2.receiver], error);
        }
        return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
          return ctx.reflect.set(prop, value, error);
        });
      } catch (e) {
        throw e === error ? enhanceError2(e) : e;
      }
    },
    has: (target, prop) => {
      if (isSpecialProperty2(prop)) {
        return Reflect.has(target, prop);
      }
      if (Reflect.has(target, prop)) return true;
      return !!target.reflect.props[prop];
    }
  };
  /** Service implementations, keyed by isolation label. */
  store = /* @__PURE__ */ Object.create(null);
  /** Declared context properties (services and accessors), by name. */
  props = /* @__PURE__ */ Object.create(null);
  _implCounter = 0;
  /**
   * Read a service from the store without the inject requirement.
   *
   * @param name — the service name.
   * @param strict — when `true`, only return implementations whose providing
   * fiber is currently active.
   * @returns the service value, or `undefined` when not (yet) provided.
   */
  get(name, strict = true) {
    return getTraceable2(this.ctx, this._getImpl(name, strict)?.value);
  }
  _getImpl(name, strict = true) {
    const key = this.ctx[symbols2.isolate][name];
    const impl = key && this.store[key];
    if (!impl) return;
    if (strict && impl.ctx.fiber.state !== 2 /* ACTIVE */) return;
    return impl;
  }
  /**
   * Overwrite a provided service's value.
   *
   * @param name — the service name.
   * @param value — the new service value.
   * @param error — carrier for the caller stack in diagnostics.
   * @returns `true` on success.
   * @throws when `name` was never provided, or was provided by another fiber.
   */
  set(name, value, error) {
    const key = this.ctx[symbols2.isolate][name];
    const impl = this.store[key];
    if (!impl) {
      throw new Error(`cannot set property "${name}" without provide`);
    }
    if (impl.ctx.fiber !== this.ctx.fiber) {
      throw new Error(`cannot set property "${name}" in multiple fibers`);
    }
    impl.value = value;
    return true;
  }
  /**
   * Register a service implementation owned by the current fiber.
   *
   * See the `ctx.provide()` overload above for the full contract.
   *
   * @param name — the service name.
   * @param value — the service value.
   * @param check — optional availability predicate for dependents.
   * @returns a disposer that unregisters the service.
   */
  provide(name, value, check) {
    return this.ctx.fiber.effect(() => {
      if (!this.props[name]) {
        this.props[name] ??= { type: "service" };
      } else if (this.props[name].type !== "service") {
        throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      }
      this.props[name] = { type: "service" };
      this.ctx.root[symbols2.isolate][name] ??= Symbol(name);
      const key = this.ctx[symbols2.isolate][name];
      const impl = { uid: ++this._implCounter, name, value, ctx: this.ctx, check, isolate: key, dependents: /* @__PURE__ */ new Set() };
      if (this.store[key]) {
        throw new Error(`service "${name}" has been registered at <${this.store[key].ctx.fiber.name}>`);
      }
      this.store[key] = impl;
      this.ctx.fiber.provisions.add(impl);
      if (this.ctx.fiber.state === 2 /* ACTIVE */) {
        this.notify([name]);
      }
      return async () => {
        if (this.store[impl.isolate] === impl) delete this.store[impl.isolate];
        this.ctx.isolate(name, impl.isolate).reflect.notify([name]);
        await new Promise((resolve2) => {
          impl.release = resolve2;
          if (!impl.dependents.size) resolve2();
        });
        impl.release = void 0;
        this.ctx.fiber.provisions.delete(impl);
      };
    }, `ctx.provide(${JSON.stringify(name)})`);
  }
  /**
   * Re-evaluate every fiber that requires one of the given services.
   *
   * @param names — the service names that changed.
   * @param filter — restricts notification to matching isolation scopes.
   */
  notify(names, filter = (ctx, name) => ctx[symbols2.isolate][name] === this.ctx[symbols2.isolate][name]) {
    for (const runtime of this.ctx.registry.values()) {
      for (const fiber of runtime.fibers) {
        let hasUpdate = false;
        for (const name of names) {
          if (!(name in fiber.inject)) continue;
          if (!filter(fiber.ctx, name)) continue;
          hasUpdate = true;
          fiber._checkImpl(name);
        }
        if (!hasUpdate) continue;
        fiber._refresh();
      }
    }
    for (const name of names) {
      const self = Object.create(this.ctx);
      self[symbols2.filter] = (target) => filter(target, name);
      this.ctx.events.emit(self, "internal/service", name, this._getImpl(name, false)?.value);
    }
  }
  /**
   * Define a computed context property backed by get/set hooks.
   *
   * @param name — the context property name.
   * @param options — the `get` hook and optional `set` hook.
   * @returns a disposer that removes the accessor.
   */
  accessor(name, options) {
    return this.ctx.fiber.effect(() => {
      if (name in this.props) {
        throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      }
      this.props[name] = { type: "accessor", ...options };
      return () => delete this.props[name];
    }, `ctx.accessor(${JSON.stringify(name)})`);
  }
  /**
   * Expose selected members of a service directly on `ctx`.
   *
   * See the `ctx.mixin()` overload above for the full contract.
   *
   * @param source — a context property name or a source object.
   * @param mixins — keys to forward, or a source-key → ctx-key map.
   * @returns a disposer that removes all created accessors.
   */
  mixin(source, mixins) {
    const self = this;
    return this.ctx.fiber.effect(function* () {
      const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
      const getTarget = (ctx, error) => {
        return ctx[source];
      };
      for (const [key, value] of entries) {
        yield self.accessor(value, {
          get(receiver, error) {
            const service = getTarget(this, error);
            if (isNullable(service)) return service;
            const mixin = receiver ? withProps2(receiver, service) : service;
            const value2 = Reflect.get(service, key, mixin);
            if (typeof value2 !== "function") return value2;
            return value2.bind(mixin ?? service);
          },
          set(value2, receiver, error) {
            const service = getTarget(this, error);
            const mixin = receiver ? withProps2(receiver, service) : service;
            return Reflect.set(service, key, value2, mixin);
          }
        });
      }
    }, `ctx.mixin(${JSON.stringify(source)})`);
  }
  /**
   * Attach this context's tracing wrapper to a value.
   *
   * @param value — the value to wrap.
   * @returns the traceable wrapper (or the value itself when not applicable).
   */
  trace(value) {
    return getTraceable2(this.ctx, value);
  }
  /**
   * Wrap a callback so calls trace `this` and arguments to this context.
   *
   * @param callback — the function to wrap.
   * @returns a proxy delegating to `callback` with traced values.
   */
  bind(callback) {
    return new Proxy(callback, {
      apply: (target, thisArg, args) => {
        return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
      },
      construct: (target, args, newTarget) => {
        return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
      }
    });
  }
};

// ../../zrepo/deepseek-harness/vendor/cordis/src/registry.ts
function isApplicable2(object) {
  return object && typeof object === "object" && typeof object.apply === "function";
}
function Inject2(name, config) {
  return function(value, decorator) {
    if (decorator.kind === "class") {
      if (!Object.hasOwn(value, "inject")) {
        defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
        defineProperty(value.inject, symbols2.checkProto, true);
      }
      value.inject[name] = config;
    } else if (decorator.kind === "method") {
      const inject = (value[symbols2.metadata] ??= {}).inject ??= /* @__PURE__ */ Object.create(null);
      inject[name] = config;
      decorator.addInitializer(function() {
        const property2 = this[symbols2.tracker]?.property;
        (this[symbols2.initHooks] ??= []).push(() => {
          this.ctx.inject(inject, (ctx) => {
            return value.call(property2 ? withProps2(this, { [property2]: ctx }) : this);
          });
        });
      });
    } else {
      throw new Error("@Inject() can only be used on class or class methods");
    }
  };
}
((Inject3) => {
  function resolve2(inject, result = /* @__PURE__ */ Object.create(null)) {
    if (!inject) return result;
    if (Array.isArray(inject)) {
      for (const name of inject) {
        result[name] = null;
      }
    } else if (Reflect.has(inject, symbols2.checkProto)) {
      Object.assign(result, resolve2(Object.getPrototypeOf(inject)));
      for (const name of Object.keys(inject)) {
        result[name] = inject[name] ?? null;
      }
    } else {
      for (const name of Object.keys(inject)) {
        result[name] = inject[name] ?? null;
      }
    }
    return result;
  }
  Inject3.resolve = resolve2;
})(Inject2 || (Inject2 = {}));
var RegistryService2 = class {
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols2.tracker, {
      property: "ctx",
      noShadow: true
    });
  }
  ctx;
  _counter = 0;
  _internal = /* @__PURE__ */ new Map();
  /** Allocate the next fiber uid (increments on every read). */
  get counter() {
    return ++this._counter;
  }
  /** Number of registered plugin runtimes. */
  get size() {
    return this._internal.size;
  }
  /**
   * Resolve a supported plugin shape to its executable callback.
   *
   * @param plugin — a function, class, or `{ apply }` object plugin.
   * @returns the callback identifying the plugin, or `undefined` if invalid.
   */
  resolve(plugin) {
    try {
      if (typeof plugin === "function") return plugin;
      if (isApplicable2(plugin)) return plugin.apply;
    } catch {
    }
  }
  /**
   * Look up the runtime record for a plugin.
   *
   * @param plugin — any supported plugin shape.
   * @returns the runtime, or `undefined` when the plugin is not registered.
   */
  get(plugin) {
    const key = this.resolve(plugin);
    return key && this._internal.get(key);
  }
  /**
   * Check whether a plugin has a registered runtime.
   *
   * @param plugin — any supported plugin shape.
   * @returns `true` when at least one fiber of the plugin exists.
   */
  has(plugin) {
    const key = this.resolve(plugin);
    return !!key && this._internal.has(key);
  }
  /**
   * Dispose every running fiber for a plugin and remove its runtime record.
   *
   * @param plugin — any supported plugin shape.
   * @returns the removed runtime, or `undefined` when none was registered.
   */
  delete(plugin) {
    const key = this.resolve(plugin);
    const runtime = key && this._internal.get(key);
    if (!runtime) return;
    this._internal.delete(key);
    for (const fiber of runtime.fibers) {
      fiber.dispose();
    }
    return runtime;
  }
  /** Iterate the registered plugin callbacks. */
  keys() {
    return this._internal.keys();
  }
  /** Iterate the registered plugin runtimes. */
  values() {
    return this._internal.values();
  }
  /** Iterate `[callback, runtime]` pairs. */
  entries() {
    return this._internal.entries();
  }
  /**
   * Visit every registered runtime.
   *
   * @param callback — receives each runtime and its identifying callback.
   */
  forEach(callback) {
    return this._internal.forEach(callback);
  }
  /**
   * Start a callback once the requested dependencies are available.
   *
   * @param inject — required services, as an array or a name → config map.
   * @param callback — plugin body called with `(ctx, config)`.
   * @returns the fiber; awaiting it settles once loading finished.
   */
  inject(inject, callback) {
    return this.plugin({ inject, apply: callback, name: callback.name });
  }
  /**
   * Start a plugin in the current context and return its fiber.
   *
   * Creates (or reuses) the plugin's runtime record, then starts a new fiber
   * under the current context. Throws if `plugin` is not a supported shape or
   * if the current fiber is already disposed.
   *
   * @param plugin — a function, class, or `{ apply }` object plugin.
   * @param config — the plugin config, validated against its `Config` schema.
   * @param getOuterStack — captures the caller stack for effect diagnostics.
   * @returns the fiber; awaiting it settles once loading finished.
   */
  plugin(plugin, config, getOuterStack = buildOuterStack2()) {
    const callback = this.resolve(plugin);
    if (!callback) throw new Error('invalid plugin, expect function or object with an "apply" method, received ' + typeof plugin);
    this.ctx.fiber.assertActive();
    let runtime = this._internal.get(callback);
    if (!runtime) {
      let name = plugin.name;
      if (name === "apply") name = void 0;
      runtime = { name, callback, fibers: new DisposableList2(), Config: plugin.Config };
      this._internal.set(callback, runtime);
    }
    const fiber = new Fiber2(this.ctx, config, Inject2.resolve(plugin.inject), runtime, getOuterStack);
    const wrapped = Object.create(fiber);
    wrapped.then = (onFulfilled, onRejected) => {
      return fiber.await().then(onFulfilled, onRejected);
    };
    return wrapped;
  }
};

// ../../zrepo/deepseek-harness/vendor/cordis/src/context.ts
var Context3 = class _Context {
  /** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
  static effect = symbols2.effect;
  /** Symbol key for a context's listener filter, consulted on every event dispatch. */
  static filter = symbols2.filter;
  /** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
  static isolate = symbols2.isolate;
  /** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
  static intercept = symbols2.intercept;
  /**
   * Returns true for Cordis context proxies and context prototypes.
   *
   * Works across realms and across multiple copies of cordis, because the
   * brand is keyed by a global symbol rather than by `instanceof`.
   *
   * @param value — the value to test.
   * @returns `true` if `value` is a Cordis context, narrowing its type.
   */
  static is(value) {
    return !!value?.[_Context.is];
  }
  static {
    _Context.is[Symbol.toPrimitive] = () => /* @__PURE__ */ Symbol.for("cordis.is");
    _Context.prototype[_Context.is] = true;
  }
  /** Create the root context and install the built-in services. */
  constructor() {
    this[symbols2.isolate] = /* @__PURE__ */ Object.create(null);
    this[symbols2.intercept] = /* @__PURE__ */ Object.create(null);
    const self = new Proxy(this, ReflectService2.handler);
    this.root = self;
    this.baseUrl = void 0;
    this.fiber = new Fiber2(self, {}, /* @__PURE__ */ Object.create(null), null, () => []);
    this.reflect = new ReflectService2(self);
    this.registry = new RegistryService2(self);
    this.events = new EventsService2(self);
    this.logger = new LoggerService3(self);
    this.fiber._disposables.clear();
    return self;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `Context <${this.fiber.name}>`;
  }
  /**
   * Create a child context with extra metadata on top of the current scope.
   *
   * The child prototypally inherits every property of this context; own
   * properties of `meta` shadow the inherited ones. The parent is not mutated.
   *
   * @param meta — own properties (including symbol keys) to define on the child.
   * @returns a child context inheriting from this one.
   */
  extend(meta = {}) {
    const shadow = Reflect.getOwnPropertyDescriptor(this, symbols2.shadow)?.value;
    const self = Object.create(getTraceable2(this, this));
    for (const prop of Reflect.ownKeys(meta)) {
      Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
    }
    if (!shadow) return self;
    return Object.assign(Object.create(self), { [symbols2.shadow]: shadow });
  }
  /**
   * Create a child context with an independent service scope for `name`.
   *
   * Below the returned context, reads and writes of the service `name`
   * resolve against the new label instead of the parent's, so a different
   * implementation can be provided without affecting the parent scope.
   * Passing the same `label` to two `isolate()` calls joins their scopes.
   *
   * @param name — the service name to isolate.
   * @param label — scope label to join; defaults to a fresh unique symbol.
   * @returns a child context whose `name` service resolves in the new scope.
   */
  isolate(name, label) {
    const shadow = Object.create(this[symbols2.isolate]);
    shadow[name] = label ?? Symbol(name);
    return this.extend({ [symbols2.isolate]: shadow });
  }
  intercept(name, config) {
    const intercept = Object.create(this[symbols2.intercept]);
    intercept[name] = config;
    return this.extend({ [symbols2.intercept]: intercept });
  }
};

// ../../zrepo/deepseek-harness/vendor/cordis/src/service.ts
var Service3 = class _Service {
  /**
   * Register this instance as `name` in the current context.
   *
   * Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
   * service is unregistered automatically when the owning fiber unloads.
   * Services with a `[Service.invoke]` body return a callable instance.
   *
   * @param ctx — the context to register in (stored as `this.ctx`).
   * @param name — the service name; defaults to the static `provide` field.
   */
  constructor(ctx, name) {
    this.ctx = ctx;
    name ??= this.constructor["provide"];
    let self = this;
    const tracker = {
      associate: name,
      property: "ctx"
    };
    if (self[symbols2.invoke]) {
      self = createCallable2(name, joinPrototype2(Object.getPrototypeOf(this), Function.prototype), tracker);
    }
    self.ctx = ctx;
    self.name = name;
    defineProperty(self, symbols2.tracker, tracker);
    self.ctx.reflect.provide(name, self, this[symbols2.check]);
    return self;
  }
  ctx;
  /** Symbol key of an instance method run after construction (class plugins). */
  static init = symbols2.init;
  /** Symbol key of the availability predicate passed to `ctx.provide()`. */
  static check = symbols2.check;
  /** Symbol key of the phantom intercept-config type parameter. */
  static config = symbols2.config;
  /** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
  static invoke = symbols2.invoke;
  /** Symbol key of the helper deriving an extended service instance. */
  static extend = symbols2.extend;
  /** Symbol key of the tracker metadata used for context tracing. */
  static tracker = symbols2.tracker;
  /** Symbol key of the intercept-config resolution helper below. */
  static resolveConfig = symbols2.resolveConfig;
  /** The service name this instance is registered under. */
  name;
  [symbols2.filter](ctx) {
    return ctx[symbols2.isolate][this.name] === this.ctx[symbols2.isolate][this.name];
  }
  [symbols2.extend](props) {
    let self;
    if (this[_Service.invoke]) {
      self = createCallable2(this.name, this, this[symbols2.tracker]);
    } else {
      self = Object.create(this);
    }
    return Object.assign(self, props);
  }
  /**
   * Merge intercept config from ancestors with optional base and head values.
   *
   * Entries added closer to the root apply first; `base` is prepended and
   * `head` appended. Uses `Config.merge` when the service declares one,
   * otherwise a shallow `Object.assign`.
   *
   * @param base — lowest-precedence config merged before all intercepts.
   * @param head — highest-precedence config merged after all intercepts.
   * @returns the merged config.
   */
  [symbols2.resolveConfig](base, head) {
    let intercept = this.ctx[Context3.intercept];
    const configs = [];
    while (this.name in intercept) {
      if (Object.hasOwn(intercept, this.name)) {
        configs.unshift(intercept[this.name]);
      }
      intercept = Object.getPrototypeOf(intercept);
    }
    if (base) configs.unshift(base);
    if (head) configs.push(head);
    if (this["Config"]?.merge) {
      return this["Config"].merge(...configs);
    } else {
      return Object.assign({}, ...configs);
    }
  }
  static [Symbol.hasInstance](instance) {
    if (!instance) return false;
    let constructor = instance.constructor;
    while (constructor) {
      constructor = constructor.prototype?.constructor;
      if (constructor === this) return true;
      constructor &&= Object.getPrototypeOf(constructor);
    }
    return false;
  }
};

// ../../zrepo/deepseek-harness/packages/compaction/compaction/src/brand.ts
function CompactionId(id) {
  return id;
}

// ../../zrepo/deepseek-harness/packages/compaction/compaction/src/tool-pairing.ts
var balanceCacheBySession = /* @__PURE__ */ new WeakMap();
function eventDelta(event) {
  switch (event.type) {
    case "assistant/message":
      return event.data.message.content.filter((block) => block.type === "tool-call").length;
    case "tool/result":
      return -1;
    default:
      return 0;
  }
}
function extendCache(session, cache, seqs) {
  const processed = cache.cutBalanced.length - 1;
  const tail = seqs.slice(processed);
  const pendingCuts = [];
  let inProgressToolCalls = cache.inProgressToolCalls;
  for (const seq of tail) {
    const event = session.eventAt(seq);
    if (event === void 0 || event.seq !== seq) {
      throw new Error(`tool-pairing balance: surface seq ${seq} has no matching session event (corrupt surface)`);
    }
    inProgressToolCalls += eventDelta(event);
    if (inProgressToolCalls < 0) {
      throw new Error(`tool-pairing balance: tool/result at surface seq ${seq} has no matching tool-call (corrupt surface)`);
    }
    pendingCuts.push(inProgressToolCalls === 0);
  }
  tail.forEach((seq, offset) => cache.indexBySeq.set(seq, processed + offset));
  cache.cutBalanced = cache.cutBalanced.concat(pendingCuts);
  cache.inProgressToolCalls = inProgressToolCalls;
  return cache;
}
function balanceCache(session) {
  const surface = session.surface;
  const seqs = surface.nodes;
  const generation = surface.replaceGeneration;
  const cached = balanceCacheBySession.get(session);
  if (cached === void 0 || cached.generation !== generation || cached.cutBalanced.length - 1 > seqs.length) {
    const rebuilt = extendCache(session, {
      generation,
      cutBalanced: [true],
      indexBySeq: /* @__PURE__ */ new Map(),
      inProgressToolCalls: 0
    }, seqs);
    balanceCacheBySession.set(session, rebuilt);
    return rebuilt;
  }
  if (cached.cutBalanced.length - 1 < seqs.length) return extendCache(session, cached, seqs);
  return cached;
}
function cutBalance(cache, seq, offset) {
  const index = cache.indexBySeq.get(seq);
  const balanced = index === void 0 ? void 0 : cache.cutBalanced[index + offset];
  if (balanced === void 0) {
    throw new Error(`tool-pairing balance: surface seq ${seq} not found`);
  }
  return balanced;
}
function toolPairingBalancedBefore(session, seq) {
  return cutBalance(balanceCache(session), seq, 0);
}
function toolPairingBalancedAfter(session, seq) {
  return cutBalance(balanceCache(session), seq, 1);
}

// ../../zrepo/deepseek-harness/packages/compaction/compaction/src/checkpoint.ts
var COMPACT_CHECKPOINT_MARKER = Object.freeze({ kind: "compact-checkpoint" });
function compactCheckpointSource(compactionId, sourceCommandId) {
  return Object.freeze({
    ...COMPACT_CHECKPOINT_MARKER,
    compactionId,
    ...sourceCommandId === void 0 ? {} : { sourceCommandId }
  });
}

// ../../zrepo/deepseek-harness/packages/compaction/compaction/src/index.ts
var ManualCompactionError = class extends Error {
  /**
   * Create one classified compaction failure.
   * @param code - stable failure class; `busy` may originate from any compaction entry path.
   * @param message - backend diagnostic retained as the Error message.
   * @param options - optional original failure.
   */
  constructor(code, message, options) {
    super(message, options);
    this.code = code;
  }
  code;
  name = "ManualCompactionError";
};
var CompactionEngine = class extends Service3 {
  constructor(ctx) {
    super(ctx, "compaction");
  }
};

// ../../zrepo/deepseek-harness/packages/typert/protocol/src/remote-error.ts
var RemoteError = class extends Error {
  /**
   * @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
   * @param message - human diagnostic carried across the wire.
   * @param details - structured payload typed by the code.
   * @param options - standard Error options (`cause` survives in-process only).
   */
  constructor(code, message, details, options) {
    super(message, options);
    this.code = code;
    this.details = details;
    this.name = "RemoteError";
  }
  code;
  details;
  /** Structural marker: cross-realm/bundle identification never uses instanceof. */
  isDSHRemoteError = true;
};

// ../../zrepo/deepseek-harness/packages/typert/protocol/src/index.ts
var TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
function isTypertRemoteSegment(value) {
  return value !== "." && value !== ".." && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
var REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";
function bindTypertRemote(service, serviceKey, options = {}) {
  validateName("service key", serviceKey);
  const namespace = options.namespace ?? serviceKey;
  validateName("namespace", namespace);
  const ctx = Reflect.get(service, "ctx");
  if (Context3.is(ctx)) provideInvocationAccessor(ctx);
  return Object.freeze({ service, serviceKey, namespace });
}
var TypertRemoteService = class extends Service3 {
  /** Visible binding consumed by the Gateway's source-mode discovery. */
  typertRemote;
  /**
   * Register the Service and bind the same key to Typert Gateway.
   * @param ctx - owning Cordis Context.
   * @param serviceKey - exact Cordis service key and default wire namespace.
   * @param options - optional wire namespace.
   */
  constructor(ctx, serviceKey, options = {}) {
    super(ctx, serviceKey);
    this.typertRemote = bindTypertRemote(this, this.name, options);
  }
};
function provideInvocationAccessor(ctx) {
  if (Object.hasOwn(ctx.root.reflect.props, "invocation")) return;
  ctx.root.accessor("invocation", { get: () => void 0 });
}
function Remote(methodExportOrOptions, context) {
  if (typeof methodExportOrOptions === "string") {
    validateName("Remote export name", methodExportOrOptions);
    return remoteDecorator({ kind: "direct" }, { exportName: methodExportOrOptions });
  }
  if (typeof methodExportOrOptions === "object") {
    return remoteDecorator({ kind: "direct" }, markerOptions(
      methodExportOrOptions,
      REMOTE_OPTION_KEYS,
      'Remote options require name, mode: "stream", or resources'
    ));
  }
  if (context === void 0) throw new TypeError("typert-protocol: Remote decorator context is missing");
  addMarkerInitializer(context, { kind: "direct" });
}
var REMOTE_OPTION_KEYS = /* @__PURE__ */ new Set(["name", "mode", "resources"]);
function markerOptions(options, accepted, requirement) {
  const keys = Reflect.ownKeys(options);
  if (keys.length === 0 || keys.some((key) => typeof key !== "string" || !accepted.has(key)) || Object.hasOwn(options, "mode") && options.mode !== "stream") {
    throw new TypeError(`typert-protocol: ${requirement}`);
  }
  const { mode, name, resources } = options;
  if (name !== void 0) validateName("Remote export name", name);
  return {
    ...mode === void 0 ? {} : { mode },
    ...name === void 0 ? {} : { exportName: name },
    ...resources === void 0 ? {} : { resources: resourceReaders(resources) }
  };
}
function resourceReaders(resources) {
  const readers = {};
  for (const [kind, reader] of Object.entries(resources)) {
    if (typeof reader !== "function") {
      throw new TypeError(`typert-protocol: Remote resource reader "${kind}" must be a function`);
    }
    readers[kind] = reader;
  }
  if (Object.keys(readers).length === 0) throw new TypeError("typert-protocol: Remote resources require at least one reader");
  return Object.freeze(readers);
}
function remoteDecorator(invocation, options = {}) {
  return function(_method, context) {
    addMarkerInitializer(context, invocation, options);
  };
}
function readRemoteMethodDescriptor(prototype) {
  const property2 = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR);
  if (property2 === void 0) return void 0;
  const descriptor = property2.value;
  if (descriptor === null || typeof descriptor !== "object") {
    throw new TypeError("typert-protocol: Remote method descriptor must be an object");
  }
  const version2 = Reflect.get(descriptor, "version");
  if (version2 !== 1) {
    throw new TypeError(`typert-protocol: unsupported Remote method descriptor version ${String(version2)}`);
  }
  const methods = Reflect.get(descriptor, "methods");
  if (!Array.isArray(methods)) {
    throw new TypeError("typert-protocol: Remote method descriptor methods must be an array");
  }
  return descriptor;
}
function addMarkerInitializer(context, invocation, options = {}) {
  if (context.private || context.static || typeof context.name !== "string") {
    throw new TypeError("typert-protocol: Remote decorators require a public instance method with a string name");
  }
  const method = context.name;
  context.addInitializer(function() {
    const prototype = Object.getPrototypeOf(this);
    if (prototype === null) {
      throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
    }
    mark(prototype, method, invocation, options);
  });
}
function mark(prototype, method, invocation, { mode, exportName, resources }) {
  const descriptor = readRemoteMethodDescriptor(prototype);
  const marker = Object.freeze({
    method,
    ...exportName === void 0 || exportName === method ? {} : { exportName },
    ...mode === void 0 ? {} : { mode },
    invocation: Object.freeze(invocation),
    ...resources === void 0 ? {} : { resources }
  });
  const current = descriptor?.methods.find((candidate) => candidate.method === method);
  if (current !== void 0) {
    if (current.exportName === marker.exportName && current.mode === marker.mode && current.resources === marker.resources && sameInvocation(current.invocation, invocation)) return;
    throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
  }
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze({
      version: 1,
      methods: Object.freeze([...descriptor?.methods ?? [], marker])
    })
  });
}
function sameInvocation(left, right) {
  if (left.kind === "direct") return right.kind === "direct";
  if (right.kind === "direct") return false;
  return left.context === right.context;
}
function validateName(subject, value) {
  if (!isTypertRemoteSegment(value)) {
    throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
  }
}

// ../../zrepo/deepseek-harness/packages/util/values/src/partial-json.ts
var SIMPLE_ESCAPES = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "	"
};
var CONTENT_ESCAPE = /[\\\u0000-\u001f]/u;
function isWhitespace(c) {
  return c === " " || c === "\n" || c === "\r" || c === "	";
}
function isHex(c) {
  return c >= "0" && c <= "9" || c >= "a" && c <= "f" || c >= "A" && c <= "F";
}
var PartialArguments = class _PartialArguments {
  /** The view of a call with no arguments available. */
  static EMPTY = _PartialArguments.fromObject({});
  /**
   * View finished argument text without scanning it until a reader asks.
   * @param text - the complete argument JSON text.
   * @returns a sealed view.
   */
  static fromText(text) {
    const view = new _PartialArguments();
    view.append(text);
    view.sealed = true;
    return view;
  }
  /**
   * View an already parsed argument payload, such as a PTC dispatch object.
   * @param value - the parsed argument value.
   * @returns a sealed view; a non-object payload has no fields.
   */
  static fromObject(value) {
    const view = new _PartialArguments();
    view.object = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
    view.sealed = true;
    return view;
  }
  /**
   * The source: text so far or a parsed object, plus whether it can still grow.
   * These are the only enumerable fields, so two views over the same source
   * compare equal structurally however far each has been read.
   */
  chunks = [];
  object;
  sealed = false;
  // Scan progress, located fields, and remembered reads are caches over the source.
  #ends = [];
  #size = 0;
  #consumed = 0;
  #mode = "root";
  #escape = false;
  #keyStart = 0;
  #keyEscaped = false;
  #key = "";
  #current = null;
  #nestedEnds = [];
  #nestedInString = false;
  #invalidAt;
  #invalidValue = false;
  #entries = /* @__PURE__ */ new Map();
  #order = [];
  #reads = /* @__PURE__ */ new Map();
  /** Whether this view rejects further appends; does not scan text or register reads. */
  get isSealed() {
    return this.sealed;
  }
  /** Whether indexing or a content read found invalid JSON; unread value contents are not validated. */
  get invalid() {
    this.scan();
    return this.#mode === "invalid" || this.#invalidValue;
  }
  /**
   * Retain streamed argument text without scanning or comparing observed answers.
   * @param fragment - the text following every fragment appended before.
   */
  append(fragment) {
    if (this.sealed) throw new Error("PartialArguments: cannot append to a sealed view");
    if (fragment.length === 0) return;
    this.chunks.push(fragment);
    this.#size += fragment.length;
    this.#ends.push(this.#size);
  }
  /**
   * Reconcile a streamed prefix with authoritative complete text without joining the fragments.
   * @param text - the final argument text, which replaces missing or conflicting deltas.
   * @returns this view sealed with its caches retained when every character matches; otherwise a new sealed view.
   */
  settle(text) {
    if (this.object !== void 0 || text.length !== this.#size) return _PartialArguments.fromText(text);
    let offset = 0;
    for (const chunk of this.chunks) {
      if (!text.startsWith(chunk, offset)) return _PartialArguments.fromText(text);
      offset += chunk.length;
    }
    this.chunks = text.length === 0 ? [] : [text];
    this.#ends = text.length === 0 ? [] : [text.length];
    this.sealed = true;
    return this;
  }
  /**
   * Compare observed answers and advance their publication baseline. Unread views remain unscanned.
   * @returns whether any observed answer changed since its first read or the preceding refresh.
   */
  refresh() {
    if (this.#reads.size === 0) return false;
    this.scan();
    let changed = false;
    let completions = false;
    for (const read of this.#reads.values()) {
      if (read.completion) {
        completions = true;
        continue;
      }
      changed = this.refreshRead(read) || changed;
    }
    if (completions) {
      for (const read of this.#reads.values()) if (read.completion) changed = this.refreshRead(read) || changed;
    }
    if (this.sealed) this.#reads.clear();
    return changed;
  }
  refreshRead(read) {
    const now = read.answer();
    if (Object.is(now, read.last)) return false;
    read.last = now;
    return true;
  }
  /**
   * Check whether no further fields can arrive.
   * @returns whether the outer object closed, indexing failed, or the view is sealed; unread values are not validated.
   */
  closed() {
    return this.remember("closed", "", () => this.closedNow());
  }
  /**
   * List discovered fields in first-appearance order.
   * @returns top-level keys seen so far, in first-appearance order.
   */
  keys() {
    return this.remember("keys", "", () => this.keysNow(), (keys) => keys.length);
  }
  /**
   * Check whether a top-level field has appeared.
   * @param key - argument name.
   * @returns whether the field has appeared (a string opened or another value began).
   */
  has(key) {
    return this.remember("has", key, () => this.hasNow(key));
  }
  /**
   * Check whether a field's closing delimiter has arrived, without validating its contents.
   * @param key - argument name.
   * @returns whether its delimiter arrived and no content reader has reported an error for this value.
   */
  complete(key) {
    return this.remember("complete", key, () => this.completeNow(key));
  }
  /**
   * Read string length without materializing its text.
   * @param key - argument name.
   * @param options - change granularity for a streaming string.
   * @returns decoded UTF-16 length of the string field so far; undefined when absent or not a string.
   */
  stringLength(key, options) {
    const step = Math.max(1, Math.floor(options?.step ?? 1));
    const offset = options?.offset ?? 0;
    return this.remember(
      `length:${step}:${offset}`,
      key,
      () => this.lengthNow(key),
      (length) => length === void 0 ? void 0 : Math.ceil((length + offset) / step)
    );
  }
  /**
   * Check a string against a decoded UTF-16 length limit without materializing it.
   * @param key - argument name.
   * @param maxLength - decoded UTF-16 limit, floored to at least zero.
   * @returns whether the string is longer than the limit; false when absent or not a string.
   */
  stringExceeds(key, maxLength) {
    const limit = Math.max(0, Math.floor(maxLength));
    return this.remember(
      `exceeds:${limit}`,
      key,
      () => (this.lengthNow(key, limit + 1) ?? 0) > limit
    );
  }
  /**
   * Read a decoded string, including a streaming prefix.
   * @param key - argument name.
   * @returns the string field's decoded text so far; undefined when absent or not a string.
   */
  text(key) {
    return this.remember("text", key, () => this.textNow(key));
  }
  /**
   * Read at most the first decoded UTF-16 units of a string.
   * @param key - argument name.
   * @param maxLength - maximum decoded UTF-16 length, floored to at least one.
   * @returns the bounded string prefix; undefined when absent or not a string.
   */
  textPrefix(key, maxLength) {
    const limit = Math.max(1, Math.floor(maxLength));
    return this.remember(
      `prefix:${limit}`,
      key,
      () => this.textPrefixNow(key, limit)
    );
  }
  /**
   * Read a completed non-string argument.
   * @param key - argument name.
   * @returns the parsed non-string value once it closed; undefined while open, absent, or a string.
   */
  value(key) {
    return this.remember("value", key, () => this.valueNow(key));
  }
  /** Answer a question and, on a streaming view, remember it for change detection. */
  remember(kind, key, read, comparison) {
    this.scan();
    const result = read();
    if (!this.sealed) {
      const id = `${kind}/${key}`;
      if (!this.#reads.has(id)) {
        this.#reads.set(id, {
          completion: kind === "complete",
          answer: comparison === void 0 ? read : () => comparison(read()),
          last: comparison === void 0 ? result : comparison(result)
        });
      }
    }
    return result;
  }
  closedNow() {
    return this.sealed || this.#mode === "closed" || this.#mode === "invalid";
  }
  keysNow() {
    return this.object === void 0 ? this.#order : Object.keys(this.object);
  }
  hasNow(key) {
    return this.object === void 0 ? this.#entries.has(key) : Object.hasOwn(this.object, key);
  }
  completeNow(key) {
    if (this.object !== void 0) return Object.hasOwn(this.object, key);
    const entry = this.#entries.get(key);
    return entry !== void 0 && entry.end >= 0 && (entry.kind === "string" ? entry.invalidAt === void 0 : !entry.invalid);
  }
  lengthNow(key, limit = Number.POSITIVE_INFINITY) {
    if (this.object !== void 0) {
      const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
      return typeof field === "string" ? field.length : void 0;
    }
    const entry = this.#entries.get(key);
    if (entry?.kind !== "string") return void 0;
    if (entry.text !== void 0 && entry.text.at === entry.end) return entry.text.length;
    const read = entry.length ??= { at: entry.start, length: 0, text: "" };
    this.readString(entry, read, limit, false);
    return read.length;
  }
  textNow(key) {
    if (this.object !== void 0) {
      const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
      return typeof field === "string" ? field : void 0;
    }
    const entry = this.#entries.get(key);
    if (entry?.kind !== "string") return void 0;
    if (entry.text === void 0 && entry.end >= 0 && entry.needsDecoding && entry.invalidAt === void 0) {
      let text;
      try {
        text = JSON.parse(`"${this.slice(entry.start, entry.end)}"`);
      } catch (_error) {
      }
      if (text !== void 0) entry.text = { at: entry.end, length: text.length, text };
    }
    const read = entry.text ??= { at: entry.start, length: 0, text: "" };
    this.readString(entry, read, Number.POSITIVE_INFINITY, true);
    return read.text;
  }
  textPrefixNow(key, maxLength) {
    if (this.object !== void 0) {
      const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
      return typeof field === "string" ? field.slice(0, maxLength) : void 0;
    }
    const entry = this.#entries.get(key);
    if (entry?.kind !== "string") return void 0;
    const prefixes = entry.prefixes ??= /* @__PURE__ */ new Map();
    let read = prefixes.get(maxLength);
    if (read === void 0) {
      read = { at: entry.start, length: 0, text: "" };
      prefixes.set(maxLength, read);
    }
    this.readString(entry, read, maxLength, true);
    return read.text;
  }
  valueNow(key) {
    if (this.object !== void 0) {
      if (!Object.hasOwn(this.object, key)) return void 0;
      const field = this.object[key];
      return typeof field === "string" ? void 0 : field;
    }
    const entry = this.#entries.get(key);
    if (entry?.kind !== "value" || entry.end < 0 || entry.invalid) return void 0;
    if (entry.parsed === void 0) {
      try {
        entry.parsed = JSON.parse(this.slice(entry.start, entry.end));
      } catch (_error) {
        entry.invalid = true;
        this.#invalidValue = true;
      }
    }
    return entry.parsed;
  }
  chunkAt(at) {
    let low = 0;
    let high = this.#ends.length;
    while (low < high) {
      const mid = low + high >>> 1;
      if (this.#ends[mid] <= at) low = mid + 1;
      else high = mid;
    }
    return low;
  }
  /** Materialize only a requested range, never the cumulative source. */
  slice(start, end) {
    if (start >= end) return "";
    const first = this.chunkAt(start);
    const last = this.chunkAt(end - 1);
    const base = first === 0 ? 0 : this.#ends[first - 1];
    if (first === last) return this.chunks[first].slice(start - base, end - base);
    const parts = [this.chunks[first].slice(start - base)];
    for (let i = first + 1; i < last; i++) parts.push(this.chunks[i]);
    parts.push(this.chunks[last].slice(0, end - this.#ends[last - 1]));
    return parts.join("");
  }
  readString(entry, read, limit, materialize) {
    const end = Math.min(
      entry.end < 0 ? this.#consumed : entry.end,
      entry.invalidAt ?? Number.POSITIVE_INFINITY,
      this.#invalidAt ?? Number.POSITIVE_INFINITY
    );
    if (!entry.needsDecoding) {
      const length = Math.min(end - read.at, limit - read.length);
      if (length <= 0) return;
      if (materialize) read.text += this.slice(read.at, read.at + length);
      read.at += length;
      read.length += length;
      return;
    }
    let chunkIndex = this.chunkAt(read.at);
    while (read.at < end && read.length < limit) {
      const base = chunkIndex === 0 ? 0 : this.#ends[chunkIndex - 1];
      const chunk = this.chunks[chunkIndex];
      const remaining = chunk.slice(read.at - base, Math.min(chunk.length, end - base));
      const boundary = remaining.search(CONTENT_ESCAPE);
      const length = Math.min(boundary < 0 ? remaining.length : boundary, limit - read.length);
      if (length > 0) {
        if (materialize) read.text += remaining.slice(0, length);
        read.at += length;
        read.length += length;
        if (read.at === base + chunk.length) chunkIndex++;
        continue;
      }
      const type = remaining.length > 1 ? remaining[1] : read.at + 1 < end ? this.chunks[chunkIndex + 1][0] : void 0;
      let decoded;
      let width = 2;
      if (remaining[0] === "\\" && type === void 0 && entry.end < 0) return;
      if (remaining[0] === "\\" && type === "u") {
        const hex = this.slice(read.at + 2, Math.min(end, read.at + 6));
        let valid = true;
        for (let i = 0; i < hex.length; i++) if (!isHex(hex[i])) valid = false;
        if (valid) {
          if (hex.length < 4 && entry.end < 0) return;
          if (hex.length === 4) decoded = String.fromCharCode(Number.parseInt(hex, 16));
        }
        width = 6;
      } else if (remaining[0] === "\\" && type !== void 0) {
        decoded = SIMPLE_ESCAPES[type];
      }
      if (decoded === void 0) {
        entry.invalidAt = read.at;
        this.#invalidValue = true;
        return;
      }
      if (materialize) read.text += decoded;
      read.length++;
      read.at += width;
      while (chunkIndex < this.chunks.length && read.at >= this.#ends[chunkIndex]) chunkIndex++;
    }
  }
  /** Locate new field ranges without decoding or parsing their contents. */
  scan() {
    if (this.object !== void 0 || this.#consumed === this.#size) return;
    for (let i = this.chunkAt(this.#consumed); i < this.chunks.length && this.#invalidAt === void 0; i++) {
      const pending = this.chunks[i];
      const base = i === 0 ? 0 : this.#ends[i - 1];
      for (let index = this.#consumed - base; index < pending.length && this.#mode !== "invalid"; index++) {
        if (this.#mode === "string" || this.#mode === "nested" && this.#nestedInString) {
          const end = this.stringBoundary(pending, index);
          this.#consumed += end - index;
          index = end;
          if (index === pending.length) break;
        }
        this.step(pending[index], this.#consumed);
        this.#consumed++;
      }
    }
  }
  /** Only raw quotes and their preceding backslash runs can terminate a string. */
  stringBoundary(fragment, start) {
    let at = start;
    while (true) {
      const quote = fragment.indexOf('"', at);
      const end = quote < 0 ? fragment.length : quote;
      if (this.#mode === "string") {
        const entry = this.#current;
        if (!entry.needsDecoding && CONTENT_ESCAPE.test(fragment.slice(at, end))) entry.needsDecoding = true;
      }
      let slashStart = end;
      while (slashStart > at && fragment[slashStart - 1] === "\\") slashStart--;
      const escaped = (end - slashStart) % 2 === 1 !== (slashStart === at && this.#escape);
      this.#escape = quote < 0 && escaped;
      if (quote < 0 || !escaped) return end;
      at = quote + 1;
    }
  }
  step(c, at) {
    switch (this.#mode) {
      case "root":
        if (isWhitespace(c)) return;
        if (c === "{") {
          this.#mode = "key-or-end";
          return;
        }
        this.fail();
        return;
      case "key-or-end":
        if (isWhitespace(c)) return;
        if (c === "}") {
          this.#mode = "closed";
          return;
        }
        if (c === '"') {
          this.beginKey(at);
          return;
        }
        this.fail();
        return;
      case "key-only":
        if (isWhitespace(c)) return;
        if (c === '"') {
          this.beginKey(at);
          return;
        }
        this.fail();
        return;
      case "key":
        this.stepKey(c, at);
        return;
      case "colon":
        if (isWhitespace(c)) return;
        if (c === ":") {
          this.#mode = "value";
          return;
        }
        this.fail();
        return;
      case "value":
        this.beginValue(c, at);
        return;
      case "string": {
        const entry = this.#current;
        entry.end = at;
        this.#current = null;
        this.#mode = "comma-or-end";
        return;
      }
      case "scalar":
        this.stepScalar(c, at);
        return;
      case "nested":
        this.stepNested(c, at);
        return;
      case "comma-or-end":
        if (isWhitespace(c)) return;
        if (c === ",") {
          this.#mode = "key-only";
          return;
        }
        if (c === "}") {
          this.#mode = "closed";
          return;
        }
        this.fail();
        return;
      case "closed":
        if (isWhitespace(c)) return;
        this.fail();
        return;
      /* v8 ignore next 2 -- scan() stops stepping once the view is invalid. */
      case "invalid":
        return;
      /* v8 ignore next 2 -- Every scanner mode has a handler above. */
      default:
        assertNever(this.#mode);
    }
  }
  fail() {
    this.#invalidAt = this.#consumed;
    this.#mode = "invalid";
    this.#current = null;
  }
  beginKey(at) {
    this.#mode = "key";
    this.#keyStart = at + 1;
    this.#keyEscaped = false;
    this.#escape = false;
  }
  stepKey(c, at) {
    if (c < " ") {
      this.fail();
      return;
    }
    if (this.#escape) {
      this.#escape = false;
      return;
    }
    if (c === "\\") {
      this.#escape = true;
      this.#keyEscaped = true;
      return;
    }
    if (c !== '"') return;
    const raw = this.slice(this.#keyStart, at);
    if (this.#keyEscaped) {
      try {
        this.#key = JSON.parse(`"${raw}"`);
      } catch (_error) {
        this.fail();
        return;
      }
    } else {
      this.#key = raw;
    }
    this.#mode = "colon";
  }
  open(entry) {
    if (!this.#entries.has(this.#key)) this.#order.push(this.#key);
    this.#entries.set(this.#key, entry);
    this.#current = entry;
  }
  beginValue(c, at) {
    if (isWhitespace(c)) return;
    if (c === '"') {
      this.open({
        kind: "string",
        start: at + 1,
        end: -1,
        needsDecoding: false,
        invalidAt: void 0,
        length: void 0,
        text: void 0,
        prefixes: void 0
      });
      this.#escape = false;
      this.#mode = "string";
      return;
    }
    if (c === "}" || c === "," || c === ":" || c === "]") {
      this.fail();
      return;
    }
    this.open({ kind: "value", start: at, end: -1, parsed: void 0, invalid: false });
    if (c === "{" || c === "[") {
      this.#mode = "nested";
      this.#nestedEnds = [c === "{" ? "}" : "]"];
      this.#nestedInString = false;
      this.#escape = false;
      return;
    }
    this.#mode = "scalar";
  }
  stepScalar(c, at) {
    if (c !== "," && c !== "}" && !isWhitespace(c)) return;
    this.closeValue(at);
    this.#mode = c === "," ? "key-only" : c === "}" ? "closed" : "comma-or-end";
  }
  stepNested(c, at) {
    if (this.#nestedInString) {
      this.#nestedInString = false;
      return;
    }
    if (c === '"') {
      this.#nestedInString = true;
      return;
    }
    if (c === "{" || c === "[") {
      this.#nestedEnds.push(c === "{" ? "}" : "]");
      return;
    }
    if (c === "}" || c === "]") {
      if (this.#nestedEnds.pop() !== c) {
        this.fail();
        return;
      }
      if (this.#nestedEnds.length === 0) {
        this.closeValue(at + 1);
        this.#mode = "comma-or-end";
      }
    }
  }
  closeValue(end) {
    const entry = this.#current;
    entry.end = end;
    this.#current = null;
  }
};

// ../../zrepo/deepseek-harness/packages/util/values/src/index.ts
function assertNever(value, context) {
  const rendered = JSON.stringify(value) ?? String(value);
  throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}
function hasIntrinsicConstructor(prototype, name) {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "constructor");
  const constructor = descriptor?.value;
  if (typeof constructor !== "function") return false;
  try {
    return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === Function.prototype.toString.call(name === "Array" ? Array : Object);
  } catch {
    return false;
  }
}
function isIntrinsicObjectPrototype(value) {
  return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
function hasPlainArrayPrototype(value) {
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
  const objectPrototype = Object.getPrototypeOf(prototype);
  return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype(objectPrototype);
}
function hasPlainObjectPrototype(value) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype(prototype);
}
function enumerableStringKeys(value) {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) return void 0;
  return keys;
}
function walkJsonValue(value, detach) {
  const ancestors = /* @__PURE__ */ new Set();
  let root;
  let parent;
  const assign = (item) => {
    if (parent === void 0) {
      if (detach) root = item;
    } else if (parent.kind === "array") {
      if (parent.target !== void 0) parent.target[parent.key] = item;
    } else if (parent.target !== void 0) {
      Object.defineProperty(parent.target, parent.key, {
        value: item,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
  };
  const frames = [];
  let current = value;
  for (; ; ) {
    if (current === null) {
      assign(null);
    } else if (typeof current === "boolean" || typeof current === "string") {
      assign(current);
    } else if (typeof current === "number") {
      if (!Number.isFinite(current) || Object.is(current, -0)) return void 0;
      assign(current);
    } else {
      if (typeof current !== "object") return void 0;
      if (ancestors.has(current)) return void 0;
      if (Array.isArray(current)) {
        if (!hasPlainArrayPrototype(current)) return void 0;
        const length = current.length;
        if (Reflect.ownKeys(current).length !== length + 1) return void 0;
        const target = detach ? [] : void 0;
        if (target !== void 0) assign(target);
        let indices;
        if (!Number.isInteger(length)) {
          indices = [];
          for (let index = length - 1; index >= 0; index--) indices.push(index);
        }
        frames.push({ kind: "array", source: current, length: indices?.length ?? length, index: 0, key: 0, indices, target });
      } else {
        if (!hasPlainObjectPrototype(current)) return void 0;
        const keys = enumerableStringKeys(current);
        if (keys === void 0) return void 0;
        const target = detach ? {} : void 0;
        if (target !== void 0) assign(target);
        frames.push({ kind: "object", source: current, keys, index: 0, key: "", target });
      }
      ancestors.add(current);
    }
    for (; ; ) {
      const frame = frames.at(-1);
      if (frame === void 0) return detach ? root : true;
      const length = frame.kind === "array" ? frame.length : frame.keys.length;
      if (frame.index >= length) {
        ancestors.delete(frame.source);
        frames.pop();
        continue;
      }
      const index = frame.index++;
      parent = frame;
      if (frame.kind === "array") {
        const key = frame.indices === void 0 ? index : frame.indices[frame.indices.length - index - 1];
        if (key === void 0) return void 0;
        if (!Object.prototype.hasOwnProperty.call(frame.source, key)) return void 0;
        frame.key = key;
        current = frame.source[key];
      } else {
        const key = frame.keys[index];
        if (key === void 0) return void 0;
        frame.key = key;
        current = frame.source[key];
      }
      break;
    }
  }
}
function snapshotJsonValue(value) {
  return walkJsonValue(value, true);
}
function deepFreeze(value) {
  const seen = /* @__PURE__ */ new WeakSet();
  const pending = [{ kind: "visit", node: value }];
  while (pending.length > 0) {
    const task = pending.pop();
    if (task === void 0) continue;
    if (task.kind === "property") {
      pending.push({ kind: "visit", node: task.source[task.key] });
      continue;
    }
    const node = task.node;
    if (node === null || typeof node !== "object") continue;
    if (node instanceof AbortSignal) continue;
    if (seen.has(node)) continue;
    seen.add(node);
    Object.freeze(node);
    const keys = Object.keys(node);
    for (let index = keys.length - 1; index >= 0; index--) {
      const key = keys[index];
      if (key === void 0) continue;
      pending.push({ kind: "property", source: node, key });
    }
  }
  return value;
}

// ../../zrepo/deepseek-harness/packages/util/crypto/src/index.ts
function randomUUID() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte, index) => {
    const pinned = index === 6 ? byte & 15 | 64 : index === 8 ? byte & 63 | 128 : byte;
    return pinned.toString(16).padStart(2, "0");
  }).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ../../zrepo/deepseek-harness/packages/util/brand/src/index.ts
function brandString(value) {
  return value;
}
function brandNumber(value) {
  return value;
}

// ../../zrepo/deepseek-harness/packages/llm/llm/src/message.ts
function freezeMessage(message) {
  return deepFreeze(structuredClone(message));
}
function createMessage(input) {
  return deepFreeze(structuredClone({
    ...input,
    id: brandString(randomUUID())
  }));
}
function createUserMessage(input) {
  return createMessage({
    ...input,
    role: "user"
  });
}
function createAssistantMessage(input) {
  return createMessage({
    role: "assistant",
    content: input.content,
    source: {
      kind: "model",
      ...input.source
    }
  });
}

// ../../zrepo/deepseek-harness/packages/util/timeout/src/index.ts
var MAX_TIMER_DELAY_MS = 2147483647;

// ../../zrepo/deepseek-harness/packages/llm/llm/src/error.ts
var HarnessError = class extends Error {
  /** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
  code;
  constructor(message, code, options) {
    super(message, options);
    this.code = code;
    this.name = new.target.name;
  }
};
var CONTEXT_WINDOW_EXCEEDED_CODE = "CONTEXT_WINDOW_EXCEEDED";
var EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
var STRUCTURED_CONTEXT_OVERFLOW = new RegExp(
  String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`,
  "i"
);
var TOO_LARGE_FOR_CONTEXT = new RegExp(
  String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`,
  "i"
);
var EXCEEDS_MODEL_CONTEXT = new RegExp(
  String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`,
  "i"
);
function errorChain(value) {
  const path2 = /* @__PURE__ */ new Set();
  const render = (current) => {
    if (path2.has(current)) return "<circular cause>";
    path2.add(current);
    try {
      if (!(current instanceof Error)) {
        if (typeof current === "object" && current !== null) {
          const descriptor = Object.getOwnPropertyDescriptor(current, "message");
          if (descriptor !== void 0 && "value" in descriptor && typeof descriptor.value === "string") {
            return descriptor.value;
          }
        }
        return String(current);
      }
      const message = current.message === "" ? current.name : current.message;
      const members = current instanceof AggregateError && current.errors.length > 0 ? ` [${current.errors.map(render).join("; ")}]` : "";
      const causeText = current.cause === void 0 || current.cause === null ? "" : render(current.cause);
      const cause = causeText === "" || causeText === message ? "" : `: ${causeText}`;
      return `${message}${members}${cause}`;
    } catch {
      return "<unrenderable value>";
    } finally {
      path2.delete(current);
    }
  };
  return render(value);
}

// ../../zrepo/deepseek-harness/packages/llm/llm/src/retry-policy.ts
var DEFAULT_MAX_RETRIES = 5;
var DEFAULT_INITIAL_DELAY_MS = 500;
var DEFAULT_MAX_DELAY_MS = 1e4;
var DEFAULT_JITTER_RATIO = 0.1;
var DEFAULT_RETRYABLE_CODES = Object.freeze([
  EMPTY_RESPONSE_CODE,
  "RATE_LIMIT",
  "SERVER",
  "TIMEOUT",
  "TRANSPORT"
]);
var backoffSchema = src_default.object({
  initialDelayMs: src_default.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
  maxDelayMs: src_default.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
  jitterRatio: src_default.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
var normalPolicySchema = src_default.object({
  mode: src_default.const("normal").required(),
  maxRetries: src_default.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
  retryableCodes: src_default.array(src_default.string()).default([...DEFAULT_RETRYABLE_CODES]),
  backoff: backoffSchema
});
var alwaysPolicySchema = src_default.object({
  mode: src_default.const("always").required(),
  backoff: backoffSchema
});
var RetryPolicySchema = src_default.union([
  normalPolicySchema,
  alwaysPolicySchema
]);
var NORMAL_POLICY_KEYS = /* @__PURE__ */ new Set([
  "mode",
  "maxRetries",
  "retryableCodes",
  "backoff"
]);
var ALWAYS_POLICY_KEYS = /* @__PURE__ */ new Set([
  "mode",
  "maxRetries",
  "retryableCodes",
  "backoff"
]);
var BACKOFF_KEYS = /* @__PURE__ */ new Set(["initialDelayMs", "maxDelayMs", "jitterRatio"]);
function validateKeys(value, allowed, path2) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${path2}: unknown key "${key}"`);
  }
}
function resolveBackoff(config, path2) {
  if (config !== void 0) validateKeys(config, BACKOFF_KEYS, path2);
  const initialDelayMs = config?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitterRatio = config?.jitterRatio ?? DEFAULT_JITTER_RATIO;
  if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0 || initialDelayMs > MAX_TIMER_DELAY_MS) {
    throw new Error(`${path2}.initialDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
  }
  if (!Number.isFinite(maxDelayMs) || maxDelayMs <= 0 || maxDelayMs > MAX_TIMER_DELAY_MS) {
    throw new Error(`${path2}.maxDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
  }
  if (initialDelayMs > maxDelayMs) {
    throw new Error(`${path2}.initialDelayMs must be less than or equal to maxDelayMs`);
  }
  if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) {
    throw new Error(`${path2}.jitterRatio must be between 0 and 1`);
  }
  return Object.freeze({ initialDelayMs, maxDelayMs, jitterRatio });
}
function resolveRetryPolicy(config, path2) {
  if (config === void 0) {
    return Object.freeze({
      mode: "normal",
      maxRetries: DEFAULT_MAX_RETRIES,
      retryableCodes: DEFAULT_RETRYABLE_CODES,
      ...resolveBackoff(void 0, `${path2}.backoff`)
    });
  }
  switch (config.mode) {
    case "normal": {
      validateKeys(config, NORMAL_POLICY_KEYS, path2);
      const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
      const retryableCodes = config.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES];
      if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) {
        throw new Error(`${path2}.maxRetries must be a non-negative safe integer`);
      }
      if (retryableCodes.length === 0) {
        throw new Error(`${path2}.retryableCodes must not be empty`);
      }
      if (retryableCodes.some((code) => typeof code !== "string" || code.length === 0)) {
        throw new Error(`${path2}.retryableCodes must contain only non-empty strings`);
      }
      if (new Set(retryableCodes).size !== retryableCodes.length) {
        throw new Error(`${path2}.retryableCodes must not contain duplicates`);
      }
      return Object.freeze({
        mode: "normal",
        maxRetries,
        retryableCodes: Object.freeze([...retryableCodes]),
        ...resolveBackoff(config.backoff, `${path2}.backoff`)
      });
    }
    case "always":
      validateKeys(config, ALWAYS_POLICY_KEYS, path2);
      return Object.freeze({
        mode: "always",
        ...resolveBackoff(config.backoff, `${path2}.backoff`)
      });
    default:
      throw new Error(`${path2}.mode must be "normal" or "always"`);
  }
}

// ../../zrepo/deepseek-harness/packages/llm/llm/src/call-config.ts
function callConfigEquals(a, b) {
  if (a.provider !== b.provider || a.model !== b.model || a.reasoningEffort !== b.reasoningEffort || a.temperature !== b.temperature || a.maxTokens !== b.maxTokens) return false;
  if (a.stop === void 0 || b.stop === void 0) return a.stop === b.stop;
  return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}

// ../../zrepo/deepseek-harness/packages/llm/llm/src/adapter-failure.ts
function normalizeLlmFailure(value) {
  const error = value instanceof Error ? value : new HarnessError(thrownMessage(value), "UNKNOWN", { cause: value });
  const carried = ownFailureSnapshot(error);
  if (carried !== void 0 && carried.code === ownErrorCode(error)) return carried;
  return Object.freeze({
    message: errorMessage(error),
    code: harnessErrorCode(error)
  });
}
function thrownMessage(value) {
  try {
    const message = String(value);
    return message.length > 0 ? message : "LLM adapter failed";
  } catch (_hostileThrownValue) {
    return "LLM adapter failed";
  }
}
function ownErrorCode(error) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    return descriptor !== void 0 && "value" in descriptor ? descriptor.value : void 0;
  } catch (_sdkPropertyTrap) {
    return void 0;
  }
}
function ownFailureSnapshot(error) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
    return descriptor !== void 0 && "value" in descriptor ? failureSnapshot(descriptor.value) : void 0;
  } catch (_sdkPropertyTrap) {
    return void 0;
  }
}
function failureSnapshot(value) {
  if (typeof value !== "object" || value === null) return void 0;
  try {
    const candidate = value;
    const message = candidate.message;
    const code = candidate.code;
    const status = candidate.status;
    const providerRetryAfterMs = candidate.providerRetryAfterMs;
    const requestId = candidate.requestId;
    const offloadImages = candidate.offloadImages;
    if (typeof message !== "string" || message.length === 0 || typeof code !== "string" || code.length === 0 || status !== void 0 && (!Number.isInteger(status) || status < 100 || status > 599) || providerRetryAfterMs !== void 0 && (!Number.isFinite(providerRetryAfterMs) || providerRetryAfterMs <= 0) || requestId !== void 0 && (typeof requestId !== "string" || requestId.length === 0) || offloadImages !== void 0 && (!Number.isSafeInteger(offloadImages) || offloadImages <= 0)) return void 0;
    return Object.freeze({
      message,
      code,
      ...status === void 0 ? {} : { status },
      ...providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs },
      ...requestId === void 0 ? {} : { requestId },
      ...offloadImages === void 0 ? {} : { offloadImages }
    });
  } catch (_sdkFailureGetter) {
    return void 0;
  }
}
function errorMessage(error) {
  try {
    const message = error.message;
    if (typeof message === "string" && message.length > 0) return message;
  } catch (_sdkMessageGetter) {
  }
  return "LLM adapter failed";
}
function harnessErrorCode(error) {
  return error instanceof HarnessError ? error.code : "UNKNOWN";
}

// ../../zrepo/deepseek-harness/packages/llm/llm/src/content.ts
function quoted(value) {
  return JSON.stringify(value);
}
function textOnlyImageText(ref) {
  const digest = String(ref.attachmentId).slice("sha256:".length, "sha256:".length + 8);
  return `[image omitted because this model accepts text only; attachment sha256:${digest}]`;
}
function contentHasImage(content) {
  return content.some((block) => block.type === "image");
}
function contentHasFile(content) {
  for (const block of content) {
    if (block.type === "file") return true;
  }
  return false;
}
function fileHandleText(ref, readonlyPath) {
  const digest = String(ref.attachmentId).slice("sha256:".length, "sha256:".length + 8);
  const identity = `File ${quoted(ref.name)} (${ref.bytes} bytes, sha256:${digest})`;
  if (readonlyPath === void 0) {
    return `[${identity} was uploaded, but the current execution environment cannot access a readable path. Report that limitation if its contents are needed; do not claim to have read it.]`;
  }
  return `[${identity}: verbatim read-only copy saved at ${quoted(readonlyPath)}. Read that path with your file tools when its contents are needed; copy it to a writable location before modifying it. When delegating file work, include this saved path in the delegation prompt; only subagents sharing this execution environment can read it.]`;
}
function replaceFilesWithHandles(blocks, resolvePath) {
  let next;
  for (const [index, block] of blocks.entries()) {
    if (block.type === "file") {
      next ??= blocks.slice(0, index);
      next.push({ type: "text", text: fileHandleText(block.attachment, resolvePath(block.attachment)) });
      continue;
    }
    next?.push(block);
  }
  return next ?? blocks;
}
function projectFilesToText(messages, resolvePath) {
  if (!messages.some((message) => contentHasFile(message.content))) return messages;
  return messages.map((message) => {
    const content = replaceFilesWithHandles(message.content, resolvePath);
    return content === message.content ? message : { ...message, content };
  });
}
function replaceImagesForTextModel(blocks) {
  let next;
  for (const [index, block] of blocks.entries()) {
    if (block.type === "image") {
      next ??= blocks.slice(0, index);
      next.push({ type: "text", text: textOnlyImageText(block.attachment) });
      continue;
    }
    next?.push(block);
  }
  return next ?? blocks;
}
function projectImagesForTextModel(messages) {
  if (!messages.some((message) => contentHasImage(message.content))) return messages;
  return messages.map((message) => {
    const content = replaceImagesForTextModel(message.content);
    return content === message.content ? message : { ...message, content };
  });
}
function withoutDeveloperMessages(messages) {
  const retained = messages.filter((message) => message.role !== "developer");
  return retained.length === messages.length ? messages : retained;
}
function toolDeclarations(history) {
  const declarations = new Map(history.tools.map((tool) => [tool.name, tool]));
  for (const update of history.updates) {
    for (const tool of update.additions) {
      if (!declarations.has(tool.name)) {
        declarations.set(tool.name, { ...tool, deferLoading: true });
      }
    }
  }
  return declarations;
}
function rebaseAdditionOnlyHistory(history, messages) {
  const available = new Map(history.tools.map((tool) => [tool.name, tool]));
  let baseline = history.tools;
  let retainedFrom = 0;
  for (const [index, update] of history.updates.entries()) {
    const additions = new Map(update.additions.map((tool) => [tool.name, tool]));
    let reset = available.size === 0 && additions.size > 0;
    for (const block of messages.get(update.messageId)) {
      if (block.type === "tool-addition") {
        const { deferLoading: _loading, ...tool } = additions.get(block.toolName);
        available.set(tool.name, tool);
      } else if (block.type === "tool-removal") {
        reset = true;
        available.delete(block.toolName);
      }
    }
    if (reset) {
      baseline = [...available.values()];
      retainedFrom = index + 1;
    }
  }
  return retainedFrom === 0 ? history : { tools: baseline, updates: history.updates.slice(retainedFrom) };
}
function projectToolUpdates(messages, tools, toolUpdate, history) {
  if (toolUpdate === void 0) {
    let immediateTools = tools;
    if (tools?.some((tool) => tool.deferLoading === true)) {
      immediateTools = tools.map(({ deferLoading: _loading, ...tool }) => tool);
    }
    return { messages: withoutDeveloperMessages(messages), tools: immediateTools };
  }
  if (history === void 0) {
    return { messages: withoutDeveloperMessages(messages), tools };
  }
  const updates = new Map(messages.flatMap((message) => message.role === "developer" ? [[message.id, message.content]] : []));
  if (history.updates.some((update) => !updates.has(update.messageId))) {
    return { messages: withoutDeveloperMessages(messages), tools };
  }
  const projectedHistory = toolUpdate === "addition-only" ? rebaseAdditionOnlyHistory(history, updates) : history;
  const declarations = toolDeclarations(projectedHistory);
  const updateIds = new Set(history.updates.map((update) => update.messageId));
  const retainedUpdateIds = new Set(projectedHistory.updates.map((update) => update.messageId));
  const offered = new Set(projectedHistory.tools.filter((tool) => !tool.deferLoading).map((tool) => tool.name));
  const projectedMessages = [];
  for (const message of messages) {
    if (message.role !== "developer") {
      projectedMessages.push(message);
      continue;
    }
    if (!updateIds.has(message.id)) continue;
    const content = message.content.filter((block) => {
      switch (block.type) {
        case "tool-addition":
          if (!retainedUpdateIds.has(message.id)) return false;
          if (!declarations.has(block.toolName) || offered.has(block.toolName)) return false;
          offered.add(block.toolName);
          return true;
        case "tool-removal":
          if (toolUpdate !== "in-history") return false;
          return offered.delete(block.toolName);
        default:
          return true;
      }
    });
    if (content.length === 0) continue;
    if (content.length === message.content.length) {
      projectedMessages.push(message);
    } else {
      projectedMessages.push({ ...message, content });
    }
  }
  const unchanged = projectedMessages.length === messages.length && projectedMessages.every((message, index) => message === messages[index]);
  return {
    messages: unchanged ? messages : projectedMessages,
    tools: [...declarations.values()]
  };
}

// ../../zrepo/deepseek-harness/packages/llm/llm/src/attribution.ts
import { createRequire } from "node:module";
var { version } = createRequire(import.meta.url)("../package.json");

// ../../zrepo/deepseek-harness/packages/llm/llm/src/assembler.ts
var BlockAssembler = class {
  partials = /* @__PURE__ */ new Map();
  order = [];
  _usage;
  _finish;
  _replayState;
  /**
   * Feed one chunk into the assembly state.
   * @param chunk - the next raw chunk, in stream order.
   */
  push(chunk) {
    switch (chunk.type) {
      case "block-start": {
        if (!this.partials.has(chunk.index)) {
          this.order.push(chunk.index);
          this.partials.set(chunk.index, {
            blockType: chunk.blockType,
            text: "",
            toolCallArguments: ""
          });
        }
        return;
      }
      case "text-delta":
      case "reasoning-delta": {
        const partial = this.ensure(chunk.index, chunk.type === "text-delta" ? "text" : "reasoning");
        if (partial.block) return;
        partial.text += chunk.text;
        return;
      }
      case "tool-call-delta": {
        const partial = this.ensure(chunk.index, "tool-call");
        if (partial.block) return;
        partial.toolCallId = chunk.id;
        if (chunk.name) partial.toolCallName = chunk.name;
        partial.toolCallArguments += chunk.argumentsDelta;
        return;
      }
      case "block-end": {
        const partial = this.ensure(chunk.index, chunk.block.type);
        if (partial.block) return;
        partial.block = chunk.block;
        return;
      }
      case "usage": {
        this._usage = chunk.usage;
        return;
      }
      case "finish": {
        this._finish = chunk.reason;
        this._replayState = chunk.replayState;
        return;
      }
      default:
        return assertNever(chunk, "BlockAssembler.push");
    }
  }
  ensure(index, blockType) {
    let partial = this.partials.get(index);
    if (!partial) {
      partial = { blockType, text: "", toolCallArguments: "" };
      this.partials.set(index, partial);
      this.order.push(index);
    }
    return partial;
  }
  assemble(partial, index) {
    if (partial.block) return partial.block;
    switch (partial.blockType) {
      case "text":
        return { type: "text", text: partial.text };
      case "reasoning":
        return { type: "reasoning", text: partial.text };
      case "tool-call":
        return {
          type: "tool-call",
          id: partial.toolCallId ?? brandString(`call-${index}`),
          name: partial.toolCallName ?? "",
          arguments: partial.toolCallArguments
        };
      default:
        throw new Error(`cannot assemble incomplete block of type "${partial.blockType}"`);
    }
  }
  /** Invariant accessor: every index in `order` has a partial. */
  mustGet(index) {
    const partial = this.partials.get(index);
    if (!partial) throw new Error(`BlockAssembler invariant violated: no partial for index ${index}`);
    return partial;
  }
  /**
   * The one shared keep/drop decision over all seen blocks: max-token
   * truncation drops tool calls that cannot be executed safely. Emitted blocks
   * and replay metadata both derive from this result, so they cannot disagree.
   */
  assembled() {
    const all = this.order.map((index) => this.assemble(this.mustGet(index), index));
    const kept = this.finish.kind === "max-tokens" ? all.map((block) => block.type !== "tool-call") : void 0;
    const blocks = kept === void 0 ? all : all.filter((_, position) => kept[position]);
    const envelope = this._replayState;
    if (envelope?.blocks === void 0) return { blocks, replay: envelope };
    if (envelope.blocks.length !== all.length) return { blocks, replay: void 0 };
    return {
      blocks,
      replay: kept === void 0 || blocks.length === all.length ? envelope : { response: envelope.response, blocks: envelope.blocks.filter((_, position) => kept[position]) }
    };
  }
  /**
   * Assemble all blocks seen so far, in stream order.
   * @returns one block per seen index, except that max-token truncation drops
   *   tool calls that cannot be executed safely; an open block assembles from
   *   its accumulated deltas (an unknown block type never closed by `block-end` throws).
   */
  blocks() {
    return this.assembled().blocks;
  }
  /**
   * Assemble the prefix an interrupted stream can safely finalize: closed and
   * open text/reasoning blocks with non-whitespace content, in stream order.
   * Tool calls are omitted because interruption precedes dispatch; retaining
   * one would require a fabricated result. Open unknown blocks are also omitted.
   * @returns the kept blocks; empty when nothing streamed before the interruption.
   */
  interruptedBlocks() {
    return this.order.map((index) => {
      const partial = this.mustGet(index);
      const type = partial.block?.type ?? partial.blockType;
      if (type !== "text" && type !== "reasoning") return void 0;
      return this.assemble(partial, index);
    }).filter((block) => (block?.type === "text" || block?.type === "reasoning") && block.text.trim() !== "");
  }
  /** Usage from the `usage` chunk; undefined until one arrives. */
  get usage() {
    return this._usage;
  }
  /** Finish reason from the `finish` chunk; `{kind: 'stop'}` when the stream ended without one. */
  get finish() {
    return this._finish ?? { kind: "stop" };
  }
  /**
   * Replay metadata from the terminal finish chunk, if any, with per-block
   * entries pruned in step with {@link blocks}. Undefined when the envelope's
   * entries do not align with the emitted blocks.
   */
  get replayState() {
    return this.assembled().replay;
  }
  /**
   * The assembled assistant message.
   * @param source - provider/model attribution (without the `kind` tag) for the assembled message.
   * @returns a frozen assistant-role message over `blocks()` (same open-block assembly rules).
   */
  message(source) {
    return createAssistantMessage({ content: this.blocks(), source });
  }
};

// ../../zrepo/deepseek-harness/packages/llm/llm/src/index.ts
var LlmError = class extends HarnessError {
  /** Serializable facts retained beside this live Error. */
  failure;
  /**
   * @param message - non-empty human-readable failure summary.
   * @param code - non-empty stable provider-neutral machine code.
   * @param options - optional cause and validated serializable provider facts.
   */
  constructor(message, code, options) {
    if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
    if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
    if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) {
      throw new Error("LlmError status must be an integer from 100 through 599");
    }
    if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) {
      throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
    }
    if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) {
      throw new Error("LlmError requestId must be a non-empty string");
    }
    super(message, code, options);
    this.name = "LlmError";
    this.failure = Object.freeze({
      message,
      code,
      ...options?.status === void 0 ? {} : { status: options.status },
      ...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
      ...options?.requestId === void 0 ? {} : { requestId: options.requestId },
      ...options?.offloadImages === void 0 ? {} : { offloadImages: options.offloadImages }
    });
  }
};
var _remoteDiscoverModels_dec, _listConfigurableProviders_dec, _listProviders_dec, _a, _init;
var LlmRuntime = class extends (_a = TypertRemoteService, _listProviders_dec = [Remote], _listConfigurableProviders_dec = [Remote], _remoteDiscoverModels_dec = [Remote("discoverModels")], _a) {
  constructor(ctx) {
    super(ctx, "llm");
    __runInitializers(_init, 5, this);
    __publicField(this, "adapters", /* @__PURE__ */ new Map());
    __publicField(this, "directory", /* @__PURE__ */ new Map());
    __publicField(this, "discoveries", /* @__PURE__ */ new Map());
  }
  /** Notify topology observers without letting one broken listener veto the commit. */
  emitAdaptersUpdated() {
    for (const listener of this.ctx.events.dispatch("emit", ["llm/adapters-updated"])) {
      try {
        const returned = listener();
        if (returned != null && typeof returned.then === "function") {
          void Promise.resolve(returned).then(void 0, (error) => {
            this.warnAdaptersListenerFailure(error);
          });
        }
      } catch (error) {
        this.warnAdaptersListenerFailure(error);
      }
    }
  }
  /** Contained-listener diagnostic shared by the sync and async failure paths. */
  warnAdaptersListenerFailure(error) {
    this.ctx.logger.warn("llm: an llm/adapters-updated listener failed");
    this.ctx.logger.warn(error);
  }
  /**
   * Register an adapter for the given provider routes. Throws `LlmError` with code
   * `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
   * Disposed with the fiber.
   * @param providers - every provider route this adapter should serve.
   * @param adapter - the adapter that streams calls for those providers.
   * @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
   */
  registerAdapter(providers, adapter) {
    const owned = /* @__PURE__ */ new Set();
    let released = false;
    const dispose = this.ctx.effect(function* () {
      if (providers.length === 0) throw new LlmError("an adapter must register at least one provider", "INVALID_ADAPTER");
      this.commitRoutes(owned, this.prepareRoutes(providers, adapter, owned));
      yield () => {
        released = true;
        for (const provider of owned) this.adapters.delete(provider);
        owned.clear();
        this.emitAdaptersUpdated();
      };
    }.bind(this), "llm.registerAdapter()");
    const handle = (() => void dispose());
    handle.replace = (next) => {
      if (released) {
        throw new LlmError("a disposed adapter registration cannot replace its routes", "REGISTRATION_DISPOSED");
      }
      this.commitRoutes(owned, this.prepareRoutes(next, adapter, owned));
    };
    return handle;
  }
  /**
   * Validate one candidate route set for `adapter`, treating routes this
   * registration already holds as available. Nothing is mutated: a rejected
   * candidate leaves the registry exactly as it was.
   */
  prepareRoutes(providers, adapter, owned) {
    const unique = /* @__PURE__ */ new Set();
    const registrations = [];
    for (const provider of providers) {
      if (provider.length === 0) throw new LlmError("adapter provider names must be non-empty", "INVALID_ADAPTER");
      if (unique.has(provider) || this.adapters.has(provider) && !owned.has(provider)) {
        throw new LlmError(`an adapter for provider "${provider}" is already registered`, "DUPLICATE_ADAPTER");
      }
      const info = adapter.providerInfo(provider);
      if (typeof info.id !== "string" || info.id !== provider || typeof info.name !== "string" || info.name.length === 0) {
        throw new LlmError(`adapter metadata for provider "${provider}" must preserve its id and have a non-empty name`, "INVALID_ADAPTER");
      }
      unique.add(provider);
      const retryPolicy = adapter.providerRetryPolicy(provider) ?? resolveRetryPolicy(void 0, `llm: provider "${provider}" retryPolicy`);
      registrations.push({
        adapter,
        provider: { id: info.id, name: info.name },
        retryPolicy
      });
    }
    return registrations;
  }
  /**
   * Swap this registration's routes for the prepared ones in one synchronous
   * section, so no observer can see the registry between the release and the
   * re-registration. The route set's one mutation point is also where
   * `llm/adapters-updated` is published, so a `replace` announces itself
   * exactly like a first registration.
   */
  commitRoutes(owned, registrations) {
    for (const provider of owned) this.adapters.delete(provider);
    owned.clear();
    for (const registration of registrations) {
      this.adapters.set(registration.provider.id, registration);
      owned.add(registration.provider.id);
    }
    this.emitAdaptersUpdated();
  }
  listProviders() {
    return [...this.adapters.values()].map(({ provider }) => ({ ...provider }));
  }
  /**
   * Declare provider routes an adapter plugin can activate through
   * configuration. Registration is all-or-nothing: an empty list, invalid
   * entry, or a provider already declared by any registration throws
   * `LlmError` without registering the rest. Disposed with the fiber.
   * @param entries - every configurable provider this plugin owns.
   * @returns a handle that withdraws all of them, and can atomically replace them.
   */
  registerConfigurableProviders(entries) {
    let held = [];
    let disposed = false;
    const commit = (candidates) => {
      const detached = [];
      const own = new Set(held.map((entry) => entry.provider));
      for (const entry of candidates) {
        if (entry.provider.length === 0 || entry.displayName.length === 0 || entry.settingsNs.length === 0) {
          throw new LlmError("configurable providers need a non-empty provider, displayName, and settingsNs", "INVALID_DIRECTORY");
        }
        if (entry.settingsPath.some((segment) => segment.length === 0)) {
          throw new LlmError(`configurable provider "${entry.provider}" has an empty settingsPath segment`, "INVALID_DIRECTORY");
        }
        if (this.directory.has(entry.provider) && !own.has(entry.provider) || detached.some((seen) => seen.provider === entry.provider)) {
          throw new LlmError(`configurable provider "${entry.provider}" is already declared`, "DUPLICATE_DIRECTORY");
        }
        detached.push(detachDirectoryEntry(entry));
      }
      for (const entry of held) this.directory.delete(entry.provider);
      for (const entry of detached) this.directory.set(entry.provider, entry);
      held = detached;
      this.emitAdaptersUpdated();
    };
    const dispose = this.ctx.effect(function* () {
      if (entries.length === 0) {
        throw new LlmError("a configurable-provider registration must declare at least one provider", "INVALID_DIRECTORY");
      }
      commit(entries);
      yield () => {
        disposed = true;
        for (const entry of held) this.directory.delete(entry.provider);
        held = [];
        this.emitAdaptersUpdated();
      };
    }.bind(this), "llm.registerConfigurableProviders()");
    const handle = (() => void dispose());
    handle.replace = (next) => {
      if (disposed) {
        throw new LlmError("this configurable-provider registration was disposed", "REGISTRATION_DISPOSED");
      }
      commit(next);
    };
    return handle;
  }
  listConfigurableProviders() {
    return [...this.directory.values()].map(detachDirectoryEntry);
  }
  /**
   * Offer to interrogate provider endpoints on behalf of the settings
   * namespace this plugin owns. The namespace is the key because that is what
   * a configuration surface already holds from the configurable-provider
   * directory, and because a provider being *added* has no route to name yet.
   * Disposed with the fiber.
   * @param settingsNs - the namespace whose profiles this discovery serves.
   * @param discover - interrogates one endpoint and must honor the supplied signal.
   * @returns the disposer that withdraws the offer.
   */
  registerModelDiscovery(settingsNs, discover) {
    const dispose = this.ctx.effect(function* () {
      if (settingsNs.length === 0) {
        throw new LlmError("model discovery needs a non-empty settings namespace", "INVALID_DISCOVERY");
      }
      if (this.discoveries.has(settingsNs)) {
        throw new LlmError(`model discovery for "${settingsNs}" is already registered`, "DUPLICATE_DISCOVERY");
      }
      this.discoveries.set(settingsNs, discover);
      yield () => {
        this.discoveries.delete(settingsNs);
      };
    }.bind(this), "llm.registerModelDiscovery()");
    return () => void dispose();
  }
  /**
   * Interrogate one provider endpoint for the models it advertises. The
   * request describes a draft, not a stored route, so nothing here reads or
   * writes settings or credentials — the caller owns both, and the reply is
   * candidate metadata a surface may offer for adoption.
   * @param settingsNs - namespace whose registered discovery serves this draft.
   * @param request - the endpoint, protocol, and one-shot credential to use.
   * @param signal - caller cancellation.
   * @returns the advertised models, deduplicated in endpoint order.
   */
  async discoverModels(settingsNs, request, signal) {
    const discover = this.discoveries.get(settingsNs);
    if (discover === void 0) {
      throw new LlmError(`no model discovery is registered for "${settingsNs}"`, "NO_DISCOVERY");
    }
    if ((request.provider ?? "").length === 0 && (request.baseURL ?? "").length === 0) {
      throw new LlmError("model discovery needs a provider route or a baseURL", "INVALID_DISCOVERY");
    }
    const discovered = signal === void 0 ? await discover(request) : await discover(request, signal);
    const seen = /* @__PURE__ */ new Set();
    const models = [];
    for (const model of discovered) {
      if (typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) continue;
      seen.add(model.id);
      models.push({
        id: model.id,
        ...model.name === void 0 ? {} : { name: model.name },
        ...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
        ...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens },
        ...model.inputModalities === void 0 ? {} : { inputModalities: [...model.inputModalities] }
      });
    }
    return models;
  }
  async remoteDiscoverModels(settingsNs, request, signal) {
    try {
      return await this.discoverModels(settingsNs, request, signal);
    } catch (error) {
      throw new RemoteError(
        "llm/model-discovery-rejected",
        error instanceof Error ? error.message : String(error),
        {
          settingsNs,
          ...request.baseURL === void 0 ? {} : { baseURL: request.baseURL }
        },
        { cause: error }
      );
    }
  }
  /**
   * Resolve the retry policy captured when one provider route was registered.
   * @param provider - registered provider route to inspect.
   * @returns the provider-owned policy, with normal defaults already resolved.
   */
  providerRetryPolicy(provider) {
    return this.registration(provider).retryPolicy;
  }
  /**
   * Resolve provider-side request-image pricing for one exact route, or
   * `undefined` when the provider is unregistered or declares none. Unknown
   * providers degrade to `undefined` rather than throwing because callers
   * price durable history whose route may no longer be mounted.
   * @param provider - provider route named by a request header.
   * @param model - exact model id named by the same header.
   * @returns the owning adapter's image pricing for the route, when declared.
   */
  imageRequestPricing(provider, model) {
    return this.adapters.get(provider)?.adapter.imageRequestPricing(provider, model);
  }
  /**
   * Resolve the image projection for an exact registered model route.
   * @param provider - registered provider route.
   * @param model - exact model id.
   * @param image - normalized image reference.
   * @returns dimensions and byte target used by the adapter's request serializer.
   */
  imageRequestTarget(provider, model, image) {
    return this.registration(provider).adapter.imageRequestTarget(provider, model, image);
  }
  /**
   * Resolve the exact text one durable file occurrence contributes to every
   * provider request in the current execution environment.
   * @param ref - durable verbatim file reference from model history.
   * @returns the same deterministic handle text used at adapter dispatch.
   */
  fileRequestText(ref) {
    return fileHandleText(ref, this.fileReadPath(ref));
  }
  /** Detach typed adapter-owned modality metadata. */
  detachedModalities(modalities) {
    return modalities === void 0 ? void 0 : [...modalities];
  }
  /**
   * Discover models advertised by one registered provider. Catalog membership
   * does not constrain core routing. Catalog-driven entry points may restrict
   * selection and submission to the advertised models.
   * @param provider - registered provider route to inspect.
   * @returns detached model metadata in adapter-preferred order.
   */
  async listModels(provider) {
    const adapter = this.registration(provider).adapter;
    const models = await adapter.listModels(provider);
    const seen = /* @__PURE__ */ new Set();
    return models.map((model) => {
      if (typeof model.provider !== "string" || model.provider !== provider || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0 || model.description !== void 0 && typeof model.description !== "string" || seen.has(model.id)) {
        throw new LlmError(`adapter returned invalid or duplicate model metadata for provider "${provider}"`, "INVALID_CATALOG");
      }
      seen.add(model.id);
      const inputModalities = this.detachedModalities(model.inputModalities);
      const badge = model.badge;
      return {
        provider: model.provider,
        id: model.id,
        name: model.name,
        ...model.description === void 0 ? {} : { description: model.description },
        ...inputModalities === void 0 ? {} : { inputModalities },
        ...badge === void 0 ? {} : {
          badge: { text: typeof badge.text === "string" ? badge.text : { ...badge.text }, tone: badge.tone }
        }
      };
    });
  }
  /**
   * Resolve and validate all metadata from the adapter that owns one exact
   * route. The result is detached from adapter-owned objects; catalog
   * membership remains advisory and does not control request routing.
   * @param provider - registered provider route to inspect.
   * @param model - exact model id passed to the adapter.
   * @param signal - optional cancellation for adapter-owned asynchronous lookup.
   * @returns exact model identity plus available context and reasoning metadata.
   */
  async resolveModelInfo(provider, model, signal) {
    return this.resolveModelInfoFor(this.registration(provider), model, signal);
  }
  async resolveModelInfoFor(registration, model, signal) {
    const resolved = await registration.adapter.resolveModel(registration.provider.id, model, signal);
    return this.normalizeModelInfo(registration, model, resolved);
  }
  /** Validate and detach one adapter-returned exact model result. */
  normalizeModelInfo(registration, model, resolved) {
    const provider = registration.provider.id;
    if (typeof resolved.provider !== "string" || resolved.provider !== provider || typeof resolved.id !== "string" || resolved.id !== model || typeof resolved.name !== "string" || resolved.name.length === 0 || resolved.description !== void 0 && typeof resolved.description !== "string") {
      throw new LlmError(
        `adapter returned invalid exact model metadata for provider "${provider}" model "${model}"`,
        "INVALID_MODEL_INFO"
      );
    }
    const context = resolved.context;
    if (context !== void 0 && (!Number.isInteger(context.contextWindow) || context.contextWindow <= 0)) {
      throw new LlmError(
        `adapter returned invalid context metadata for provider "${provider}" model "${model}"`,
        "INVALID_MODEL_CONTEXT"
      );
    }
    const inputModalities = this.detachedModalities(resolved.inputModalities);
    const systemPromptUpdate = resolved.systemPromptUpdate;
    if (systemPromptUpdate !== void 0 && systemPromptUpdate !== "in-history") {
      throw new LlmError(
        `adapter returned invalid system prompt update mode for provider "${provider}" model "${model}"`,
        "INVALID_MODEL_INFO"
      );
    }
    const toolUpdate = resolved.toolUpdate;
    if (toolUpdate !== void 0 && toolUpdate !== "in-history" && toolUpdate !== "addition-only") {
      throw new LlmError(
        `adapter returned invalid tool update mode for provider "${provider}" model "${model}"`,
        "INVALID_MODEL_INFO"
      );
    }
    const defaultMaxTokens = resolved.defaultMaxTokens;
    if (defaultMaxTokens !== void 0 && (!Number.isSafeInteger(defaultMaxTokens) || defaultMaxTokens <= 0)) {
      throw new LlmError(
        `adapter returned invalid default maxTokens for provider "${provider}" model "${model}"`,
        "INVALID_MODEL_MAX_TOKENS"
      );
    }
    const info = {
      provider,
      id: model,
      name: resolved.name,
      ...resolved.description === void 0 ? {} : { description: resolved.description },
      ...inputModalities === void 0 ? {} : { inputModalities },
      ...context === void 0 ? {} : { context: { contextWindow: context.contextWindow } },
      ...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens },
      ...resolved.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: resolved.systemPromptUpdate },
      ...resolved.toolUpdate === void 0 ? {} : { toolUpdate: resolved.toolUpdate }
    };
    const reasoning = resolved.reasoning;
    if (reasoning === void 0) return info;
    if (reasoning.efforts.length === 0) {
      throw new LlmError(
        `adapter returned invalid reasoning metadata for provider "${provider}" model "${model}"`,
        "INVALID_MODEL_REASONING"
      );
    }
    const seen = /* @__PURE__ */ new Set();
    const efforts = reasoning.efforts.map((effort) => {
      if (typeof effort.id !== "string" || effort.id.length === 0 || typeof effort.name !== "string" || effort.name.length === 0 || effort.description !== void 0 && typeof effort.description !== "string" || seen.has(effort.id)) {
        throw new LlmError(
          `adapter returned invalid or duplicate reasoning effort metadata for provider "${provider}" model "${model}"`,
          "INVALID_MODEL_REASONING"
        );
      }
      seen.add(effort.id);
      return {
        id: effort.id,
        name: effort.name,
        ...effort.description === void 0 ? {} : { description: effort.description }
      };
    });
    if (reasoning.defaultEffort !== void 0 && !seen.has(reasoning.defaultEffort)) {
      throw new LlmError(
        `adapter returned an unknown default reasoning effort for provider "${provider}" model "${model}"`,
        "INVALID_MODEL_REASONING"
      );
    }
    return {
      ...info,
      reasoning: {
        efforts,
        ...reasoning.defaultEffort === void 0 ? {} : { defaultEffort: reasoning.defaultEffort }
      }
    };
  }
  /**
   * Validate a conversation call config against its exact model capability and
   * materialize adapter-configured defaults. Unsupported explicit efforts
   * reject before provider I/O; no clamping or aliasing is performed. This
   * standalone query does not bind a later dispatch; use {@link prepareCall}
   * when logging and streaming must share one adapter registration.
   * @param config - provider/model route and optional request controls.
   * @param signal - optional cancellation for adapter-owned capability lookup.
   * @returns a detached config only when a default must be materialized.
   */
  async resolveCallConfig(config, signal) {
    return (await this.resolveCallFor(this.registration(config.provider), config, signal)).config;
  }
  async resolveCallFor(registration, config, signal) {
    const info = await this.resolveModelInfoFor(registration, config.model, signal);
    return this.resolveCallWithInfo(config, info);
  }
  /** Validate request controls against one already-bound exact model result. */
  resolveCallWithInfo(config, info) {
    const defaulted = config.maxTokens === void 0 && info.defaultMaxTokens !== void 0 ? { ...config, maxTokens: info.defaultMaxTokens } : config;
    const reasoning = info.reasoning;
    const requested = defaulted.reasoningEffort;
    let resolvedConfig = defaulted;
    if (reasoning === void 0) {
      if (requested !== void 0) {
        throw new LlmError(
          `provider "${config.provider}" model "${config.model}" does not support reasoning effort "${requested}"`,
          "UNSUPPORTED_REASONING_EFFORT"
        );
      }
    } else {
      const effective = requested ?? reasoning.defaultEffort;
      if (effective !== void 0) {
        if (!reasoning.efforts.some((effort) => effort.id === effective)) {
          throw new LlmError(
            `provider "${config.provider}" model "${config.model}" does not support reasoning effort "${effective}"`,
            "UNSUPPORTED_REASONING_EFFORT"
          );
        }
        if (requested !== effective) resolvedConfig = { ...defaulted, reasoningEffort: effective };
      }
    }
    return {
      config: resolvedConfig,
      ...info.context === void 0 ? {} : { context: info.context },
      modelInfo: info
    };
  }
  /**
   * Resolve one call under its current adapter registration. The returned
   * one-shot handle keeps that registration across header logging and dispatch,
   * so HMR cannot combine one adapter's capability result with another adapter.
   * An optional synchronous callback selects concrete controls using captured
   * model metadata. Defaults and validation apply to its result. Callback
   * failures and cancellation reject preparation before dispatch.
   * @param config - provider/model route and optional concrete request controls.
   * @param signal - optional cancellation for adapter-owned capability lookup.
   * @param configure - pure control selection, called once before defaults and validation.
   * @returns a prepared config and its registration-bound stream entry point.
   */
  async prepareCall(config, signal, configure) {
    signal?.throwIfAborted();
    const { provider, model, ...controls } = config;
    const registration = this.registration(provider);
    const adapterCall = await registration.adapter.prepareCall(provider, model, signal);
    signal?.throwIfAborted();
    const modelInfo = this.normalizeModelInfo(registration, model, adapterCall.model);
    const proposed = configure === void 0 ? config : { ...configure(deepFreeze(structuredClone(controls)), deepFreeze(modelInfo)), provider, model };
    signal?.throwIfAborted();
    const resolved = this.resolveCallWithInfo(proposed, modelInfo);
    const resolvedConfig = deepFreeze(structuredClone(resolved.config));
    const context = resolved.context === void 0 ? void 0 : deepFreeze(structuredClone(resolved.context));
    const adapterDefaults = deepFreeze({
      ...proposed.reasoningEffort === void 0 && resolvedConfig.reasoningEffort !== void 0 ? { reasoningEffort: true } : {},
      ...proposed.maxTokens === void 0 && resolvedConfig.maxTokens !== void 0 ? { maxTokens: true } : {}
    });
    let dispatched = false;
    return Object.freeze({
      config: resolvedConfig,
      retryPolicy: registration.retryPolicy,
      adapterDefaults,
      ...context === void 0 ? {} : { context },
      ...modelInfo.inputModalities === void 0 ? {} : { inputModalities: Object.freeze([...modelInfo.inputModalities]) },
      ...modelInfo.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: modelInfo.systemPromptUpdate },
      ...modelInfo.toolUpdate === void 0 ? {} : { toolUpdate: modelInfo.toolUpdate },
      stream: (options) => {
        if (dispatched) {
          throw new LlmError("a prepared LLM call can only be dispatched once", "INVALID_PREPARED_CALL");
        }
        if (!callConfigEquals(options, resolvedConfig)) {
          throw new LlmError(
            "prepared LLM call config changed before adapter dispatch",
            "INVALID_PREPARED_CALL"
          );
        }
        dispatched = true;
        return this.streamWithRegistration(options, {
          registration,
          config: resolvedConfig,
          modelInfo,
          dispatch: (options2) => adapterCall.stream(options2)
        });
      }
    });
  }
  registration(provider) {
    const registration = this.adapters.get(provider);
    if (!registration) throw new LlmError(`no adapter registered for provider "${provider}"`, "NO_ADAPTER");
    return registration;
  }
  /** Remove replay state whose historical route is owned by another adapter. */
  forAdapter(options, adapter) {
    const messages = options.messages.map((message) => {
      if (message.role !== "assistant") return message;
      const source = message.source;
      if (source.replayState === void 0) return message;
      if (this.adapters.get(source.provider)?.adapter === adapter) return message;
      return freezeMessage({
        ...message,
        source: { kind: "model", provider: source.provider, model: source.model }
      });
    });
    if (messages.every((message, index) => message === options.messages[index])) return options;
    const filtered = { ...options, messages };
    return Object.isFrozen(options) ? deepFreeze(filtered) : filtered;
  }
  /**
   * Resolve the current execution-world read path of one durable file
   * reference through the mounted attachment and filesystem providers.
   */
  fileReadPath(ref) {
    let hostPath;
    try {
      hostPath = this.ctx.get("attachments")?.fileHostPath(ref);
    } catch {
      return void 0;
    }
    if (hostPath === void 0) return void 0;
    const fs3 = this.ctx.get("fs");
    return fs3?.processPathFromHostPath(hostPath);
  }
  /**
   * Final adapter boundary. Adapter selection, dispatch, iterator construction,
   * and iteration failures become one terminal failure chunk. Middleware and
   * downstream consumer failures remain thrown plugin or consumer errors.
   */
  async *adapterStream(options, prepared) {
    let iterator;
    try {
      const registration = prepared?.registration ?? this.registration(options.provider);
      const adapter = registration.adapter;
      let modelInfo;
      let resolvedConfig;
      let dispatch;
      if (prepared === void 0) {
        const adapterCall = await adapter.prepareCall(options.provider, options.model, options.signal);
        modelInfo = this.normalizeModelInfo(registration, options.model, adapterCall.model);
        resolvedConfig = this.resolveCallWithInfo(options, modelInfo).config;
        dispatch = (options2) => adapterCall.stream(options2);
      } else {
        modelInfo = prepared.modelInfo;
        resolvedConfig = prepared.config;
        dispatch = prepared.dispatch;
      }
      if (prepared !== void 0 && !callConfigEquals(options, resolvedConfig)) {
        throw new LlmError(
          "prepared LLM call config changed before adapter dispatch",
          "INVALID_PREPARED_CALL"
        );
      }
      const resolvedOptions = callConfigEquals(options, resolvedConfig) ? options : Object.isFrozen(options) ? deepFreeze({ ...options, ...resolvedConfig }) : { ...options, ...resolvedConfig };
      let projectedMessages = resolvedOptions.messages;
      if (projectedMessages.some((message) => contentHasFile(message.content))) {
        projectedMessages = projectFilesToText(projectedMessages, (ref) => this.fileReadPath(ref));
      }
      if (modelInfo.inputModalities !== void 0 && !modelInfo.inputModalities.includes("image") && projectedMessages.some((message) => contentHasImage(message.content))) {
        projectedMessages = projectImagesForTextModel(projectedMessages);
      }
      const projectedTools = projectToolUpdates(projectedMessages, resolvedOptions.tools, modelInfo.toolUpdate, resolvedOptions.toolHistory);
      projectedMessages = projectedTools.messages;
      let projectedOptions = resolvedOptions;
      if (projectedMessages !== resolvedOptions.messages || projectedTools.tools !== resolvedOptions.tools) {
        projectedOptions = {
          ...resolvedOptions,
          messages: projectedMessages,
          ...projectedTools.tools === void 0 ? {} : { tools: projectedTools.tools }
        };
        if (Object.isFrozen(resolvedOptions)) deepFreeze(projectedOptions);
      }
      const stream = dispatch(this.forAdapter(projectedOptions, adapter));
      iterator = stream[Symbol.asyncIterator]();
    } catch (error) {
      yield adapterFailureChunk(error, options.signal);
      return;
    }
    let completed = false;
    try {
      while (true) {
        let item;
        try {
          const next = await iterator.next();
          item = next.done ? { done: true } : { done: false, value: next.value };
        } catch (error) {
          completed = true;
          yield adapterFailureChunk(error, options.signal);
          return;
        }
        if (item.done) {
          completed = true;
          return;
        }
        yield item.value;
      }
    } finally {
      if (!completed) {
        const close = iterator.return?.bind(iterator);
        if (close) await close();
      }
    }
  }
  /**
   * Stream one model call as raw chunks (token-level deltas). Replay state is
   * retained only when the same adapter instance owns its historical provider
   * and the target provider. Final adapter selection remains fixed through
   * asynchronous exact-model resolution and dispatch. Adapter selection,
   * dispatch, and iteration failures become terminal `error` or `aborted`
   * finish chunks; middleware, nested-call, cleanup, and consumer failures
   * remain thrown.
   * @param options - the full request; `options.provider` selects the adapter.
   * @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
   */
  stream(options) {
    return this.streamWithRegistration(options);
  }
  streamWithRegistration(options, prepared) {
    return this.ctx.waterfall(
      this,
      "llm/stream",
      options,
      () => this.adapterStream(options, prepared)
    );
  }
};
_init = __decoratorStart(_a);
__decorateElement(_init, 1, "listProviders", _listProviders_dec, LlmRuntime);
__decorateElement(_init, 1, "listConfigurableProviders", _listConfigurableProviders_dec, LlmRuntime);
__decorateElement(_init, 1, "remoteDiscoverModels", _remoteDiscoverModels_dec, LlmRuntime);
__decoratorMetadata(_init, LlmRuntime);
function adapterFailureChunk(error, signal) {
  const failure = normalizeLlmFailure(error);
  return {
    type: "finish",
    reason: signal?.aborted || failure.code === "ABORTED" ? { kind: "aborted", failure } : { kind: "error", failure }
  };
}
function detachDirectoryEntry(entry) {
  const { nativeAuth } = entry;
  return {
    ...entry,
    settingsPath: [...entry.settingsPath],
    ...entry.baseURLEnv === void 0 ? {} : { baseURLEnv: [...entry.baseURLEnv] },
    ...nativeAuth === void 0 ? {} : { nativeAuth: { ...nativeAuth, env: [...nativeAuth.env] } }
  };
}

// ../../zrepo/deepseek-harness/packages/compaction/compaction-basic/lib/index.js
import { randomUUID as randomUUID2 } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

// ../../zrepo/deepseek-harness/packages/core/session/src/index.ts
import { isAbsolute } from "node:path";

// ../../zrepo/deepseek-harness/packages/core/session/src/types.ts
function SessionSeq(value) {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    throw new TypeError(`SessionSeq must be a non-negative safe integer, got ${String(value)}`);
  }
  return brandNumber(value);
}
function SessionLogOffset(value) {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    throw new TypeError(`SessionLogOffset must be a non-negative safe integer, got ${String(value)}`);
  }
  return brandNumber(value);
}
var SESSION_FORMAT_VERSION = 4;

// ../../zrepo/deepseek-harness/packages/core/session/src/known-event-types.ts
var KNOWN_SESSION_EVENT_TYPES = /* @__PURE__ */ new Set([
  "agent-preset/selected",
  "agent/inbox/spliced",
  "approval/asked",
  "approval/decided",
  "approval/policy",
  "assistant/attempt",
  "assistant/message",
  "command/done",
  "command/run",
  "compaction/end",
  "compaction/prune",
  "compaction/start",
  "compaction/summary",
  "deliverables/presented",
  "developer/message",
  "feedback/message-delete",
  "feedback/message-put",
  "feedback/record",
  "goal/change",
  "hook/invoked",
  "hook/result",
  "image/offload",
  "job/registered",
  "job/settled",
  "llm/retry",
  "llm/retry-started",
  "model/selection",
  "permission/preset",
  "plan/mode",
  "request/context",
  "request/header",
  "sandbox/mode",
  "schedule/change",
  "session-log-deepseek/delivery-accepted",
  "session/end-seed",
  "session/title",
  "session/title-llm-request",
  "step/end",
  "step/start",
  "subagent/catalog",
  "subagent/descriptor",
  "subagent/model-selection-policy",
  "system/message",
  "team/member",
  "team/message/delivered",
  "team/message/queued",
  "team/mode",
  "team/task",
  "todo/write",
  "tool-workflow/agent-end",
  "tool-workflow/agent-start",
  "tool-workflow/run-end",
  "tool-workflow/run-start",
  "tool/call",
  "tool/ptc-dispatch",
  "tool/ptc-dispatch-start",
  "tool/result",
  "turn/end",
  "turn/start",
  "user/message",
  "web/deepseek-search-llm-request",
  "working-directory/change",
  "workspace/changes"
]);
var MESSAGE_PROJECTION_EVENT_TYPES = /* @__PURE__ */ new Set([
  "image/offload"
]);

// ../../zrepo/deepseek-harness/packages/core/session/src/surface.ts
var SURFACE_EVENT_TYPES = /* @__PURE__ */ new Set([
  "system/message",
  "developer/message",
  "user/message",
  "assistant/message",
  "tool/result"
]);
function isSurfaceEligibleType(type) {
  return SURFACE_EVENT_TYPES.has(type);
}
function deriveEventMessage(event, projectedMessages) {
  const projected = projectedMessages?.get(event.seq);
  if (projected !== void 0) return projected;
  switch (event.type) {
    // Ordinary prompts and injected context retain producer-owned framing.
    // See Derived history in packages/core/session/README.md.
    case "user/message": {
      return event.data;
    }
    // Empty system and developer nodes retain their surface positions without
    // adding wire messages. An empty assistant event hosts a max-tokens step's
    // usage and must not inject a content-less turn into the provider transcript.
    case "system/message":
    case "developer/message":
    case "assistant/message": {
      if (event.data.message.content.length === 0) return null;
      return event.data.message;
    }
    case "tool/result": {
      return event.data.message;
    }
    default:
      return null;
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateSessionEventData(event, subject) {
  const data = event.data;
  if (SURFACE_EVENT_TYPES.has(event.type) && isRecord(data)) {
    const message = event.type === "user/message" ? data : data["message"];
    if (isRecord(message)) {
      if (event.type === "developer/message" !== (message["role"] === "developer")) {
        throw new Error(`${subject} developer/message and developer role must occur together`);
      }
      if (message["role"] !== "developer" && Array.isArray(message["content"]) && message["content"].some((block) => isRecord(block) && (block["type"] === "tool-addition" || block["type"] === "tool-removal"))) {
        throw new Error(`${subject} tool-change blocks require developer role`);
      }
      if (event.type === "developer/message" && Array.isArray(message["content"])) {
        let hasAdditions = false;
        for (const block of message["content"]) {
          if (!isRecord(block) || block["type"] !== "tool-addition" && block["type"] !== "tool-removal") continue;
          if (typeof block["toolName"] !== "string" || block["toolName"].length === 0) {
            throw new Error(`${subject} ${block["type"]} requires a nonempty toolName`);
          }
          if (block["type"] === "tool-addition") {
            hasAdditions = true;
            if (Object.hasOwn(block, "tool")) throw new Error(`${subject} tool-addition must omit inline tool definitions`);
          }
        }
        if (hasAdditions ? !isEventSeq(data["headerSeq"]) : Object.hasOwn(data, "headerSeq")) {
          throw new Error(`${subject} requires headerSeq exactly when tool additions are present`);
        }
      }
    }
  }
  if (event.type === "request/header") {
    if (!isRecord(data)) throw new Error(`${subject} data must be an object`);
    const header = data["header"];
    if (!isRecord(header)) throw new Error(`${subject} header must be an object`);
    if (Object.hasOwn(header, "system")) throw new Error(`${subject} must omit header.system; use system/message`);
    if (Array.isArray(header["tools"]) && header["tools"].length === 0) {
      throw new Error(`${subject} must omit empty tools`);
    }
    const defaults = header["adapterDefaults"];
    if (isRecord(defaults) && Object.keys(defaults).length === 0) {
      throw new Error(`${subject} must omit empty adapterDefaults`);
    }
  } else if (event.type === "tool/result") {
    if (!isRecord(data)) throw new Error(`${subject} data must be an object`);
    if (data["error"] === void 0) return;
    const message = data["message"];
    if (!isRecord(message) || message["isError"] !== true) {
      throw new Error(`${subject} error requires message.isError === true`);
    }
  }
}
function createFoldState() {
  return { nodes: [], replaceGeneration: 0, contentGeneration: 0, projectedMessages: /* @__PURE__ */ new Map(), projections: /* @__PURE__ */ new Set() };
}
function isEventSeq(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
}
function isReplaceOp(value) {
  const op = value;
  return Object.keys(op).length === 3 && Object.hasOwn(op, "op") && Object.hasOwn(op, "startSeq") && Object.hasOwn(op, "endSeq") && op["op"] === "replace" && isEventSeq(op["startSeq"]) && isEventSeq(op["endSeq"]);
}
function surfaceOpOf(event) {
  const raw = event;
  if (!isSurfaceEligibleType(event.type)) {
    if (!KNOWN_SESSION_EVENT_TYPES.has(event.type) && event.ignorable === true) return;
    if (raw.surfaceOp !== void 0) {
      throw new Error(`session event "${event.type}" is not surface-eligible and cannot carry surfaceOp`);
    }
    if (raw.sourceEventSeqs !== void 0) {
      throw new Error(`session event "${event.type}" is not surface-eligible and cannot carry sourceEventSeqs`);
    }
    return;
  }
  const op = raw.surfaceOp;
  if (op === void 0) {
    throw new Error(`session event "${event.type}" is surface-eligible and requires a surfaceOp marker`);
  }
  if (op === "append") return op;
  if (op === null || typeof op !== "object" || Array.isArray(op)) {
    throw new Error(`session event "${event.type}" carries an invalid surfaceOp`);
  }
  if (!isReplaceOp(op)) {
    throw new Error(`session event "${event.type}" carries an invalid replace surfaceOp`);
  }
  return op;
}
function assertSourceEventReferences(event, shadowedSeqs) {
  const raw = event.sourceEventSeqs;
  if (event.type === "assistant/message" && raw !== void 0) {
    throw new Error("assistant/message embeds its source stream and cannot carry sourceEventSeqs");
  }
  const sources = /* @__PURE__ */ new Set();
  if (raw !== void 0) {
    if (!Array.isArray(raw)) {
      throw new Error(`sourceEventSeqs on event at seq ${event.seq} must be an array when present`);
    }
    if (raw.length === 0) {
      throw new Error("sourceEventSeqs must not be empty");
    }
    let nonEarlierSource;
    for (const source of raw) {
      if (!isEventSeq(source)) {
        throw new Error(`session event "${event.type}" sourceEventSeqs must densely contain non-negative safe integers`);
      }
      sources.add(source);
      if (nonEarlierSource === void 0 && source >= event.seq) nonEarlierSource = source;
    }
    if (sources.size !== raw.length) {
      throw new Error("sourceEventSeqs must not contain duplicates");
    }
    if (nonEarlierSource !== void 0) {
      throw new Error(`sourceEventSeqs must reference earlier events: ${nonEarlierSource} >= current seq ${event.seq}`);
    }
  }
  const missing = shadowedSeqs.filter((seq) => !sources.has(seq));
  if (missing.length > 0) {
    throw new Error(`surface replace: sourceEventSeqs must include every shadowed surface node; missing ${missing.join(", ")}`);
  }
}
function assertDeveloperHeader(event, events, baseSeq) {
  if (event.type !== "developer/message") return;
  validateSessionEventData(event, `developer/message at seq ${event.seq}`);
  if (event.data.headerSeq === void 0) return;
  const headerSeq = event.data.headerSeq;
  const headerEvent = events[headerSeq - baseSeq];
  if (headerSeq >= event.seq || headerEvent?.type !== "request/header") {
    throw new Error("developer/message headerSeq must reference an earlier request/header");
  }
  for (const block of event.data.message.content) {
    if (block.type !== "tool-addition") continue;
    const definitions = headerEvent.data.header.tools?.filter((tool) => tool.name === block.toolName) ?? [];
    if (definitions.length !== 1) {
      throw new Error(`developer/message tool-addition "${block.toolName}" must name exactly one tool in headerSeq ${headerSeq}`);
    }
    const definition = definitions[0];
    if (typeof definition.description !== "string" || !isRecord(definition.parameters)) {
      throw new Error(`developer/message tool-addition "${block.toolName}" requires a complete tool definition in headerSeq ${headerSeq}`);
    }
    if (Object.hasOwn(definition, "deferLoading") && definition.deferLoading !== true) {
      throw new Error("developer/message referenced tool deferLoading must be true when present");
    }
  }
}
function validateSurfaceMetadata(event) {
  const op = surfaceOpOf(event);
  if (op !== void 0 && op !== "append" && (op.startSeq >= event.seq || op.endSeq >= event.seq)) {
    throw new Error(`surface replace at seq ${event.seq}: startSeq and endSeq must reference earlier events`);
  }
  if (op !== void 0) assertSourceEventReferences(event, []);
  return op;
}
function replacementRange(state, op) {
  const startIdx = state.nodes.indexOf(op.startSeq);
  if (startIdx === -1) {
    throw new Error(`surface replace: start seq ${op.startSeq} not found in surface`);
  }
  const endIdx = state.nodes.indexOf(op.endSeq);
  if (endIdx === -1) {
    throw new Error(`surface replace: end seq ${op.endSeq} not found in surface`);
  }
  if (startIdx > endIdx) {
    throw new Error(`surface replace: start seq ${op.startSeq} (index ${startIdx}) is after end seq ${op.endSeq} (index ${endIdx})`);
  }
  return {
    startIdx,
    endIdx,
    shadowedSeqs: state.nodes.slice(startIdx, endIdx + 1)
  };
}
function isDeepEqualJson(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => isDeepEqualJson(item, b[i]));
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const aKeys = Object.keys(a);
  const bRecord = b;
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => Object.hasOwn(b, key) && isDeepEqualJson(a[key], bRecord[key]));
}
function assertToolResultRewrite(event, shadowedSeqs, events, baseSeq) {
  if (event.type !== "tool/result") return;
  if (shadowedSeqs.length !== 1) {
    throw new Error("tool/result surface replacement must rewrite exactly one current node");
  }
  for (const originalSeq of shadowedSeqs) {
    const original = events[originalSeq - baseSeq];
    if (original?.type !== "tool/result") {
      throw new Error("tool/result surface replacement must target a current tool/result");
    }
    const originalRest = { ...original.data };
    const replacementRest = { ...event.data };
    originalRest["message"] = {
      ...original.data.message,
      content: null
    };
    replacementRest["message"] = {
      ...event.data.message,
      content: null
    };
    if (!isDeepEqualJson(originalRest, replacementRest)) {
      throw new Error("tool/result surface replacement may change only content");
    }
  }
}
function assertSystemHeadRewrite(event, state, startIdx, shadowedSeqs, events, baseSeq) {
  if (startIdx !== 0) return;
  const head = events[state.nodes[0] - baseSeq];
  if (head?.type !== "system/message") return;
  if (event.type !== "system/message" || shadowedSeqs.length !== 1) {
    throw new Error("surface replace: node 0 holds the system prompt and may be rewritten only by a system/message over exactly that node");
  }
}
function planSurfaceEvent(state, event, expectedSeq, events, baseSeq, projections) {
  if (event.seq !== expectedSeq) {
    throw new Error(`session event seq ${event.seq} is not contiguous; expected ${expectedSeq}`);
  }
  const surfaceOp = validateSurfaceMetadata(event);
  assertDeveloperHeader(event, events, baseSeq);
  const projection = projections.find((item) => item.type === event.type);
  if (projection !== void 0) {
    return { kind: "project", projection, messages: projection.project(event, {
      nodes: state.nodes,
      events,
      baseSeq,
      messages: state.projectedMessages
    }) };
  }
  if (MESSAGE_PROJECTION_EVENT_TYPES.has(event.type)) {
    throw new Error(`session event "${event.type}" requires a message projection; load its owning plugin or supply its projection definition`);
  }
  if (surfaceOp === void 0) return;
  if (surfaceOp === "append") {
    return { kind: "append", seq: event.seq };
  }
  const range = replacementRange(state, surfaceOp);
  assertSourceEventReferences(event, range.shadowedSeqs);
  assertToolResultRewrite(event, range.shadowedSeqs, events, baseSeq);
  assertSystemHeadRewrite(event, state, range.startIdx, range.shadowedSeqs, events, baseSeq);
  return {
    kind: "replace",
    seq: event.seq,
    start: surfaceOp.startSeq,
    end: surfaceOp.endSeq,
    ...range
  };
}
function applySurfaceEvent(state, event, expectedSeq, events, baseSeq, projections) {
  const plan = planSurfaceEvent(state, event, expectedSeq, events, baseSeq, projections);
  return applySurfacePlan(state, plan);
}
function applySurfacePlan(state, plan) {
  if (plan?.kind === "append") {
    state.nodes.push(plan.seq);
  } else if (plan?.kind === "replace") {
    state.nodes.splice(plan.startIdx, plan.endIdx - plan.startIdx + 1, plan.seq);
    state.replaceGeneration += 1;
    state.contentGeneration += 1;
  } else if (plan?.kind === "project") {
    for (const [seq, message] of plan.messages) state.projectedMessages.set(seq, message);
    state.projections.add(plan.projection);
    state.contentGeneration += 1;
  }
  if (plan?.kind !== "replace") return;
  return {
    seq: plan.seq,
    start: plan.start,
    end: plan.end,
    shadowedSeqs: plan.shadowedSeqs
  };
}
var SurfaceManager = class {
  /**
   * @param log - Contiguous complete log or loaded event window.
   * @param baseSeq - Absolute sequence of the window's first event.
   * @param projections - live borrowed definitions; removing a used definition invalidates further reads.
   */
  constructor(log, baseSeq = SessionLogOffset(0), projections = []) {
    this.log = log;
    this.baseSeq = baseSeq;
    this.projections = projections;
    this._lastProcessedSeq = baseSeq === 0 ? -1 : SessionSeq(baseSeq - 1);
  }
  log;
  baseSeq;
  projections;
  /** Shared transition state; replacement history is not retained. */
  _state = createFoldState();
  /** Last processed absolute seq. */
  _lastProcessedSeq;
  /** Candidate already validated by `validateNext`, pending exact log admission. */
  _pendingPlan;
  /**
   * Validate the next candidate without mutating the committed surface.
   * @param event - candidate event that has not entered the log yet.
   */
  validateNext(event) {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    const expectedSeq = SessionSeq(this.baseSeq + this.log.length);
    this._pendingPlan = {
      event,
      expectedSeq,
      plan: planSurfaceEvent(this._state, event, expectedSeq, this.log, this.baseSeq, this.projections)
    };
  }
  /** Monotonic count of folded positional replacements. */
  get replaceGeneration() {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return this._state.replaceGeneration;
  }
  /** Monotonic count of committed changes to existing model-visible content. */
  get contentGeneration() {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return this._state.contentGeneration;
  }
  /**
   * Project one message with every committed message projection applied.
   * @param event - message-producing or log-only event.
   * @returns its immutable projected message, or null when it produces none.
   */
  deriveEventMessage(event) {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return deriveEventMessage(event, this._state.projectedMessages);
  }
  /** Surface event sequences in model-visible order. */
  get nodes() {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return this._state.nodes;
  }
  /** Fold events appended since the previous access. */
  _processDelta() {
    const tailSeq = this.baseSeq + this.log.length - 1;
    for (let seq = this._lastProcessedSeq + 1; seq <= tailSeq; seq++) {
      const index = seq - this.baseSeq;
      const event = this.log[index];
      const pending = this._pendingPlan;
      if (pending?.event === event && pending.expectedSeq === seq) {
        applySurfacePlan(this._state, pending.plan);
      } else {
        applySurfaceEvent(this._state, event, SessionSeq(seq), this.log, this.baseSeq, this.projections);
      }
      if (pending !== void 0 && pending.expectedSeq <= seq) this._pendingPlan = void 0;
      this._lastProcessedSeq = SessionSeq(seq);
    }
  }
  /** Cached messages cannot outlive the definitions that interpreted their log. */
  _assertProjections() {
    const candidate = this._pendingPlan;
    const pending = candidate !== void 0 && this.log[candidate.expectedSeq - this.baseSeq] === candidate.event ? candidate.plan : void 0;
    const required = pending?.kind === "project" ? [...this._state.projections, pending.projection] : this._state.projections;
    for (const projection of required) {
      if (!this.projections.includes(projection)) {
        throw new Error(`session message projection "${projection.type}" was removed or replaced; restore the session with its owning plugin`);
      }
    }
  }
};

// ../../zrepo/deepseek-harness/packages/core/session/src/request-header.ts
function canonicalHeader(header) {
  const adapterDefaults = header.adapterDefaults;
  return {
    config: header.config,
    ...adapterDefaults?.reasoningEffort === true || adapterDefaults?.maxTokens === true ? { adapterDefaults } : {},
    ...header.tools !== void 0 && header.tools.length > 0 ? { tools: header.tools } : {}
  };
}
function foldRequestHeader(events, from2) {
  let state = from2;
  for (const event of events) {
    if (event.type === "request/header") state = canonicalHeader(event.data.header);
  }
  return state;
}

// ../../zrepo/deepseek-harness/packages/core/session/src/tool-history.ts
var ToolHistoryProjection = class {
  /** Historical declarations indexed by the header sequence referenced by additions. */
  headers = /* @__PURE__ */ new Map();
  /** Definitions retained in the current declaration series, including removed tools. */
  declared = /* @__PURE__ */ new Map();
  /** Active definitions from the latest request header. */
  active = [];
  /** Active names reconstructed from the baseline and recorded updates. */
  available = /* @__PURE__ */ new Set();
  /** Header that starts the current declaration series; absent before the first header. */
  baselineSeq;
  /** Immutable request snapshot of the current baseline and resolved updates. */
  history = deepFreeze({ tools: [], updates: [] });
  /**
   * Consume the next committed event in log order.
   * @param event - a session event, including inherited events during restoration.
   */
  apply(event) {
    if (event.type === "request/header") {
      const tools = event.data.header.tools ?? [];
      this.headers.set(event.seq, tools);
      const redeclared = tools.some((tool) => {
        const before = this.declared.get(tool.name);
        return before !== void 0 && JSON.stringify(before) !== JSON.stringify(tool);
      });
      if (this.baselineSeq === void 0 || event.data.reason === "series" || event.data.startsSeries || redeclared) {
        this.baselineSeq = event.seq;
        this.declared = new Map(tools.map((tool) => [tool.name, tool]));
        this.history = deepFreeze({ tools, updates: [] });
        this.available = new Set(tools.map((tool) => tool.name));
      }
      this.active = tools;
    } else if (event.type === "developer/message") {
      const { message, headerSeq } = event.data;
      const definitions = headerSeq === void 0 ? [] : this.headers.get(headerSeq);
      const additions = message.content.flatMap((block) => {
        if (block.type !== "tool-addition") return [];
        const tool = definitions?.find((tool2) => tool2.name === block.toolName);
        if (tool === void 0) throw new Error(`tool history: missing definition for ${block.toolName}`);
        return [tool];
      });
      for (const tool of additions) this.declared.set(tool.name, tool);
      for (const block of message.content) {
        if (block.type === "tool-addition") this.available.add(block.toolName);
        else if (block.type === "tool-removal") this.available.delete(block.toolName);
      }
      this.history = deepFreeze({
        tools: this.history.tools,
        updates: [...this.history.updates, { messageId: message.id, additions }]
      });
    }
  }
  /**
   * Read an immutable snapshot; subsequent events do not mutate it.
   * @returns initial declarations and historically resolved additions for the current series.
   */
  snapshot() {
    if (this.active.length !== this.available.size || this.active.some((tool) => !this.available.has(tool.name))) {
      return deepFreeze({ tools: this.active, updates: [] });
    }
    return this.history;
  }
};

// ../../zrepo/deepseek-harness/packages/core/session/src/index.ts
function validateSessionHeader(id, input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("session header is not a plain JSON record");
  }
  const record = input;
  if (Object.hasOwn(record, "seedLength")) {
    throw new Error('session header has invalid field "seedLength"');
  }
  if (record.version !== SESSION_FORMAT_VERSION) {
    throw new Error(`session header version must be ${SESSION_FORMAT_VERSION}, got ${String(record.version)}`);
  }
  if (record.id !== id) {
    throw new Error(`session header id "${String(record.id)}" does not match session id "${id}"`);
  }
  if (typeof record.createdAt !== "number" || !Number.isSafeInteger(record.createdAt) || record.createdAt < 0) {
    throw new Error("session header createdAt must be a non-negative safe integer");
  }
  if (record.cwd !== void 0) {
    if (typeof record.cwd !== "string") throw new Error("session header cwd must be a string");
    if (!isAbsolute(record.cwd)) {
      throw new Error(`session header cwd must be an absolute path, got "${record.cwd}"`);
    }
  }
  if (record.parentSession !== void 0 && typeof record.parentSession !== "string") {
    throw new Error("session header parentSession must be a string");
  }
  if (typeof record.isSeeded !== "boolean") {
    throw new Error("session header isSeeded must be a boolean");
  }
  if (record.origin !== void 0 && record.origin !== "subagent") {
    throw new Error('session header origin must be "subagent"');
  }
  if (record.delegationDepth !== void 0 && (typeof record.delegationDepth !== "number" || !Number.isSafeInteger(record.delegationDepth) || record.delegationDepth < 0)) {
    throw new Error("session header delegationDepth must be a non-negative safe integer");
  }
  if (record.agentPreset !== void 0 && typeof record.agentPreset !== "string") {
    throw new Error("session header agentPreset must be a string");
  }
  return deepFreeze(record);
}
function validateRestoredSessionHeader(id, input) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const prototype = Reflect.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("session header is not a plain JSON record");
    }
  }
  return validateSessionHeader(id, input);
}
function snapshotSessionHeader(id, source) {
  const input = source === void 0 ? { version: SESSION_FORMAT_VERSION, id, createdAt: Date.now(), isSeeded: false } : source;
  const snapshot2 = snapshotJsonValue(input);
  if (snapshot2 === void 0) throw new Error("session header is not losslessly JSON-serializable");
  return validateSessionHeader(id, snapshot2);
}
function assertSessionEventEnvelope(value, index) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`seed event at index ${index} has an invalid event envelope`);
  }
  const event = value;
  for (const key in event) {
    switch (key) {
      case "type":
      case "seq":
      case "time":
      case "data":
      case "surfaceOp":
      case "sourceEventSeqs":
      case "ignorable":
        break;
      default:
        throw new Error(`seed event at index ${index} has an invalid event envelope`);
    }
  }
  const type = event["type"];
  const seq = event["seq"];
  const time = event["time"];
  if (typeof type !== "string" || typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0 || Object.is(seq, -0) || typeof time !== "number" || !Number.isSafeInteger(time) || event["data"] === void 0 || event["ignorable"] !== void 0 && event["ignorable"] !== true) {
    throw new Error(`seed event at index ${index} has an invalid event envelope`);
  }
  validateSessionEventData(event, `seed ${type} at index ${index}`);
  switch (type) {
    case "request/header":
    case "developer/message":
    case "system/message":
    case "user/message":
    case "assistant/attempt":
    case "assistant/message":
    case "tool/result":
      assertCurrentLlmShape(event, index);
      break;
  }
}
function assertCurrentLlmShape(event, index) {
  const data = event["data"];
  const record = typeof data === "object" && data !== null ? data : void 0;
  if (event["type"] === "request/header") {
    const headerRecord = record?.["header"];
    const config = headerRecord["config"];
    if (!hasProviderModel(config)) throw new Error(`seed request/header at index ${index} lacks provider/model`);
    const configRecord = config;
    const reasoningEffort = configRecord["reasoningEffort"];
    if (reasoningEffort !== void 0 && (typeof reasoningEffort !== "string" || reasoningEffort.length === 0)) {
      throw new Error(`seed request/header at index ${index} has an invalid reasoningEffort`);
    }
    assertAdapterDefaults(headerRecord["adapterDefaults"], configRecord, index);
    const reason = record?.["reason"];
    if (reason !== "initial" && reason !== "resume" && reason !== "change" && reason !== "series") {
      throw new Error(`seed request/header at index ${index} has an invalid reason`);
    }
    if (record?.["startsSeries"] !== void 0 && record["startsSeries"] !== true) {
      throw new Error(`seed request/header at index ${index} has an invalid startsSeries marker`);
    }
  }
  const type = event["type"];
  if (type === "assistant/attempt") {
    assertAssistantSettlementShape(record, type, index);
    return;
  }
  if (!isMessageEventType(type)) return;
  assertMessageEventShape(event, `seed ${type} at index ${index}`);
  if (type === "assistant/message") {
    assertAssistantSettlementShape(record, type, index);
  }
}
function assertAssistantSettlementShape(data, type, index) {
  const turn = data?.["turn"];
  const step = data?.["step"];
  if (typeof turn !== "number" || !Number.isSafeInteger(turn) || turn < 0 || Object.is(turn, -0) || typeof step !== "number" || !Number.isSafeInteger(step) || step < 0 || Object.is(step, -0) || !Array.isArray(data?.["stream"])) {
    throw new Error(`seed ${type} at index ${index} has invalid settlement fields`);
  }
}
var allowedAdapterKeys = /* @__PURE__ */ new Set(["reasoningEffort", "maxTokens"]);
function assertAdapterDefaults(value, config, index) {
  if (value === void 0) return;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`seed request/header at index ${index} has invalid adapterDefaults`);
  }
  const defaults = value;
  if (Object.keys(defaults).some((key) => !allowedAdapterKeys.has(key)) || Object.values(defaults).some((marker) => marker !== true) || defaults["reasoningEffort"] === true && config["reasoningEffort"] === void 0 || defaults["maxTokens"] === true && config["maxTokens"] === void 0) {
    throw new Error(`seed request/header at index ${index} has invalid adapterDefaults`);
  }
}
function isMessageEventType(type) {
  return type === "developer/message" || type === "system/message" || type === "user/message" || type === "assistant/message" || type === "tool/result";
}
var MESSAGE_ROLE_BY_TYPE = {
  "system/message": "system",
  "developer/message": "developer",
  "user/message": "user",
  "assistant/message": "assistant",
  "tool/result": "tool"
};
function assertMessageEventShape(event, subject) {
  const type = event["type"];
  if (!isMessageEventType(type)) return;
  const data = event["data"];
  const record = typeof data === "object" && data !== null ? data : void 0;
  const message = type === "user/message" ? record : record?.["message"];
  if (typeof message !== "object" || message === null || typeof message["id"] !== "string" || message["id"] === "") {
    throw new Error(`${subject} lacks an identified message`);
  }
  const messageRecord = message;
  const expectedRole = MESSAGE_ROLE_BY_TYPE[type];
  if (messageRecord["role"] !== expectedRole) {
    throw new Error(`${subject} message must have role "${expectedRole}"`);
  }
  const source = messageRecord["source"];
  if (typeof source !== "object" || source === null || typeof source["kind"] !== "string" || source["kind"] === "") {
    throw new Error(`${subject} message has invalid source`);
  }
  if (!Array.isArray(messageRecord["content"])) {
    throw new Error(`${subject} message has invalid content`);
  }
  const sourceRecord = source;
  if (type === "system/message") {
    if (sourceRecord["kind"] !== "system-prompt") {
      throw new Error(`${subject} message must have system-prompt source`);
    }
    return;
  }
  if (type === "assistant/message") {
    if (sourceRecord["kind"] !== "model" || !hasProviderModel(sourceRecord)) {
      throw new Error(`${subject} message must have model source`);
    }
    return;
  }
  if (type !== "tool/result") return;
  if (sourceRecord["kind"] !== "tool" || typeof sourceRecord["callId"] !== "string" || sourceRecord["callId"] === "") {
    throw new Error(`${subject} message must have tool source`);
  }
  if (messageRecord["toolCallId"] !== sourceRecord["callId"]) {
    throw new Error(`${subject} message has mismatched tool call ids`);
  }
}
function hasProviderModel(value) {
  if (typeof value !== "object" || value === null) return false;
  const pair = value;
  return typeof pair["provider"] === "string" && pair["provider"].length > 0 && typeof pair["model"] === "string" && pair["model"].length > 0;
}
function collectSessionCallbacks(ctx, args) {
  return [...ctx.events.dispatch("emit", args)];
}
function invokeContainedSessionObservers(ctx, name, id, args, callbacks) {
  for (const callback of callbacks) {
    try {
      const returned = callback(...args);
      void Promise.resolve(returned).catch((error) => {
        ctx.logger.warn(`session "${id}": ${name} listener rejected: ${String(error)}`);
      });
    } catch (error) {
      ctx.logger.warn(`session "${id}": ${name} listener threw: ${String(error)}`);
    }
  }
}
var attachments = /* @__PURE__ */ new WeakMap();
var PLUGIN_RECORD_TYPE = /^plugin:[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/u;
function isPluginRecordType(type) {
  return PLUGIN_RECORD_TYPE.test(type);
}
function assertPluginRecordEvent(value) {
  const { type } = value;
  if (!isPluginRecordType(type)) {
    throw new Error(`plugin record type "${type}" must be "plugin:" followed by lowercase slash-separated segments`);
  }
}
var commitPluginRecord;
var Session = class _Session {
  log = [];
  /** Single incremental owner of surface acceptance and projection state. */
  surfaceManager;
  /** The ordered surface over this session's event log. */
  get surface() {
    return this.surfaceManager;
  }
  /**
   * Detached, deep-frozen creation metadata (format version, cwd, lineage,
   * and whether fork history exists). Supplied by the store via `ctx.sessions.create()`. When a
   * `Session` is created without a store-owned header, a minimal header is
   * synthesized (stamped with the current {@link SESSION_FORMAT_VERSION}) so
   * `session.header` is always present. Kept out of the event log — it is a
   * storage concern, not replayable conversation state.
   */
  header;
  /** Number of leading events inherited from this Session's fork parent. */
  inheritedEventCount;
  /** The session identity, derived from its durable header's single copy. */
  get id() {
    return this.header.id;
  }
  /**
   * The constructor seed length (0 without one), before any marker appended
   * during construction. Seed events never publish on `session/event`. A
   * marker appended before the store attaches occupies this seq without
   * publishing either; otherwise this seq is available for the next append.
   *
   * This in-process offset is not persisted. A fork seed can already contain
   * the child's inherited marker and synthetic closers, so its child-owned
   * history starts at {@link inheritedEventCount}, before this offset. A
   * resumed Session's seed contains its full stored log, while its inherited
   * count keeps the durable fork cut. Consumers needing complete canonical
   * history start at seq 0.
   */
  firstLiveSeq;
  /**
   * First event produced for this object lifecycle. A new fork includes its
   * child-owned seed marker and closers; a restored Session starts after its
   * complete stored prefix. This in-process capture offset is not persisted.
   */
  firstLifecycleSeq;
  /**
   * Create a detached session by validating and snapshotting borrowed seed
   * events and storage metadata.
   * @param id - session identity.
   * @param seed - optional borrowed replay or fork events.
   * @param header - optional borrowed storage metadata.
   * @param inheritedEventCount - exact fork-inherited prefix length for a seeded header.
   * @param projections - pure interpreters for plugin-owned message changes.
   * @returns a detached session.
   * @throws when a seed event requires a missing message interpreter or fails validation.
   */
  static create(id, seed, header, inheritedEventCount, projections) {
    return new _Session(id, seed, header, "snapshot", inheritedEventCount, projections);
  }
  /**
   * Restore a detached session by adopting an independently owned or deeply frozen seed.
   * Runtime-required event fields, event envelopes, sequence continuity, surface
   * transitions, and header fields are validated without copying or freezing events.
   * Embedded Assistant streams remain opaque until a stream consumer or storage
   * verifier reads them.
   * @param id - restored session identity.
   * @param seed - independently owned or deeply frozen events.
   * @param header - independently owned storage metadata.
   * @param inheritedEventCount - exact fork-inherited prefix length decoded from storage.
   * @param eventState - aliasing state carried from the operation that produced the seed.
   * @param projections - pure interpreters for plugin-owned message changes.
   * @returns a restored detached session.
   * @throws when a seed event requires a missing message interpreter or fails validation.
   */
  static fromRestore(id, seed, header, inheritedEventCount, eventState, projections) {
    return new _Session(
      id,
      seed,
      header,
      eventState,
      inheritedEventCount,
      projections
    );
  }
  constructor(id, seed, header, mode = "snapshot", suppliedInheritedEventCount, projections = []) {
    this.surfaceManager = new SurfaceManager(this.log, SessionLogOffset(0), projections);
    const restoredHeader = mode === "snapshot" ? void 0 : validateRestoredSessionHeader(id, header);
    if (seed !== void 0) {
      for (const [index, source] of seed.entries()) {
        const snapshot2 = mode === "snapshot" ? snapshotJsonValue(source) : source;
        if (snapshot2 === void 0) {
          throw new Error(`seed event at index ${index} is not losslessly JSON-serializable`);
        }
        assertSessionEventEnvelope(snapshot2, index);
        if (snapshot2.seq !== index) {
          throw new Error(`seed event at index ${index} has seq ${snapshot2.seq} (expected ${index}); seed must be contiguous from 0`);
        }
        try {
          this.surfaceManager.validateNext(snapshot2);
        } catch (error) {
          throw new Error(`invalid seed event at index ${index}: ${error instanceof Error ? error.message : "invalid surface metadata"}`);
        }
        this.log.push(mode === "snapshot" ? deepFreeze(snapshot2) : snapshot2);
      }
    }
    this.firstLiveSeq = SessionLogOffset(this.log.length);
    this.header = restoredHeader ?? snapshotSessionHeader(id, header);
    if (this.header.isSeeded && seed === void 0) {
      throw new Error("seeded session requires an explicit constructor seed");
    }
    if (this.header.isSeeded && suppliedInheritedEventCount === void 0) {
      throw new Error("seeded session requires an inherited event count");
    }
    const inheritedEventCount = SessionLogOffset(suppliedInheritedEventCount ?? 0);
    if (!this.header.isSeeded && inheritedEventCount !== 0) {
      throw new Error("unseeded session inherited event count must be 0");
    }
    if (inheritedEventCount > this.log.length) {
      throw new Error("session inherited event count exceeds its event log");
    }
    const seedMarker = this.log[inheritedEventCount];
    const markedSeed = seedMarker?.type === "session/end-seed" && seedMarker.data.inherited === true;
    if (mode === "snapshot" && this.header.isSeeded && inheritedEventCount !== this.log.length && !markedSeed) {
      throw new Error("seeded session constructor seed must equal its inherited prefix or mark its inherited cut");
    }
    if (markedSeed && this.log.slice(inheritedEventCount + 1).some((event) => event.type === "session/end-seed" && event.data.inherited === true)) {
      throw new Error("session inherited event count must identify the final inherited marker");
    }
    this.inheritedEventCount = inheritedEventCount;
    this.firstLifecycleSeq = mode === "snapshot" && this.header.isSeeded ? inheritedEventCount : this.firstLiveSeq;
    if (seed !== void 0 && mode === "snapshot" && this.header.isSeeded && !markedSeed) {
      this.append("session/end-seed", { inherited: true });
    } else if (seed !== void 0 && !(mode === "snapshot" && this.header.isSeeded) && this.log.at(-1)?.type !== "session/end-seed") {
      this.append("session/end-seed", {});
    }
  }
  /** Cached immutable full snapshot of the private append-only log. */
  eventsSnapshot;
  /**
   * Return the immutable event stored at one exact sequence number.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @param seq - event sequence number.
   * @returns the accepted event, or undefined when the log does not contain it.
   */
  eventAt(seq) {
    return this.log[seq];
  }
  /**
   * Materialize an immutable snapshot of a half-open event sequence range.
   * A full current snapshot is reused until the next append; every previously
   * returned snapshot remains stable after later appends.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @param fromSeq - non-negative inclusive sequence number; defaults to the log start.
   * @param toSeqExclusive - non-negative exclusive sequence number; defaults to the current end.
   * @returns a frozen array of the selected deeply frozen events.
   */
  snapshotEvents(fromSeq = SessionLogOffset(0), toSeqExclusive = this.seq) {
    if (fromSeq === 0 && toSeqExclusive === this.log.length) {
      this.eventsSnapshot ??= Object.freeze([...this.log]);
      return this.eventsSnapshot;
    }
    return Object.freeze(this.log.slice(fromSeq, toSeqExclusive));
  }
  /**
   * Return this Session's events after its fork-inherited prefix.
   * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
   * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
   * @returns a fresh array containing child-owned events in log order.
   */
  ownEvents() {
    return this.snapshotEvents(this.inheritedEventCount);
  }
  /**
   * Whether one existing event position is outside the fork-inherited prefix.
   * @param seq - event position in this Session.
   * @returns true when the event belongs to this Session rather than its parent.
   */
  isOwnSeq(seq) {
    return seq >= this.inheritedEventCount && seq < this.seq;
  }
  /** The next event's sequence number — always the log length (the `seq = log.length` contiguity contract). */
  get seq() {
    return SessionLogOffset(this.log.length);
  }
  /**
   * Append one typed event to the log and synchronously notify observers via
   * the store-owned, module-private publication hooks. The hot path never blocks
   * on I/O — persistence plugins buffer asynchronously. Once the event enters
   * the log, the append is committed: observer failures are logged and
   * contained per listener, so they do not change the return value or prevent
   * later listeners from observing the same accepted event.
   * Independent Sessions append without notifying store observers. Once a store
   * prepares or enters the instance, writes require a completed creation
   * announcement and remain disabled after removal.
   *
   * @param type - The event type (key of {@link SessionEventMap}).
   * @param data - The event payload; must be JSON-serializable.
   * @param opts - Surface metadata: `surfaceOp` controls how the event enters
   *   the ordered surface; `sourceEventSeqs` lists the seq numbers of earlier
   *   events this one derives from. REQUIRED for
   *   {@link SurfaceEventType} events (every message-producing event must
   *   declare how it joins the surface, the sole source of derived model
   *   history) and
   *   rejected by the compiler for non-surface types like `turn/start` or
   *   `assistant/attempt`. Assistant messages embed their exact provider
   *   stream and cannot cite top-level source events.
   * @returns the logged event — its assigned `seq`/`time` plus the SNAPSHOT of
   *   `data` that entered the log, so reading `event.data` back sees the logged
   *   value, never the caller's still-mutable input.
   * @throws if a store-owned Session is unentered or its creation announcement
   *   has not completed, or if `data` or surface
   *   metadata is not losslessly JSON-serializable
   *   (BigInt, function, symbol, undefined, negative zero, non-finite number,
   *   circular reference, sparse array, or an exotic object such as
   *   Map/Set/Date/class instance), or when the candidate violates the
   *   request-header empty-field or tool-error consistency rules, or the
   *   canonical surface contract (marker shape and eligibility, unique
   *   earlier source-event references, positional replacement validity, and complete
   *   shadowed-node coverage). One iterative pass reads, validates, and
   *   copies each nested value once, so a stateful getter cannot supply one value
   *   to validation and another to storage. The event log is the durable source
   *   of truth, so a bad event fails at the append site rather than later during
   *   a backend flush. A synchronous internal dispatch validation failure or an
   *   append reentered while this acceptance/publication boundary is open also
   *   rejects before the log changes.
   */
  append(type, data, ...opts) {
    this.publicationEntry();
    const surfaceOpts = opts[0];
    const surfaceMetadata = {
      ...surfaceOpts?.sourceEventSeqs === void 0 ? {} : { sourceEventSeqs: surfaceOpts.sourceEventSeqs },
      ...surfaceOpts?.surfaceOp === void 0 ? {} : { surfaceOp: surfaceOpts.surfaceOp }
    };
    const dataSnapshot = snapshotJsonValue(data);
    if (dataSnapshot === void 0) {
      throw new Error(`session event "${type}" carries non-JSON-serializable data`);
    }
    const surfaceMetadataSnapshot = snapshotJsonValue(surfaceMetadata);
    if (surfaceMetadataSnapshot === void 0) {
      throw new Error(`session event "${type}" carries non-JSON-serializable surface metadata`);
    }
    const entry = this.publicationEntry();
    const event = deepFreeze({
      type,
      seq: SessionSeq(this.log.length),
      time: Date.now(),
      data: dataSnapshot,
      ...surfaceMetadataSnapshot
    });
    validateSessionEventData(event, `session event "${type}" at seq ${event.seq}`);
    this.commit(event, entry);
    return event;
  }
  static {
    commitPluginRecord = (session, type, data) => session.#appendRecord(type, data);
  }
  /**
   * Commit one plugin record; {@link appendPluginRecord} is the only caller.
   * @param type - record type, checked against the plugin record grammar.
   * @param data - JSON payload, snapshotted before it enters the log.
   * @returns the record's sequence number.
   */
  #appendRecord(type, data) {
    this.publicationEntry();
    const dataSnapshot = snapshotJsonValue(data);
    if (dataSnapshot === void 0) {
      throw new Error(`plugin record "${type}" carries non-JSON-serializable data`);
    }
    const entry = this.publicationEntry();
    const record = deepFreeze({
      type,
      seq: SessionSeq(this.log.length),
      time: Date.now(),
      data: dataSnapshot,
      ignorable: true
    });
    assertPluginRecordEvent(record);
    this.commit(record, entry);
    return record.seq;
  }
  /**
   * Require announced membership for store-owned Sessions and refuse reentrant publication.
   * @returns the current store attachment, or undefined for an independent Session.
   */
  publicationEntry() {
    const entry = attachments.get(this);
    if (entry === null) {
      throw new Error(`session "${this.id}" cannot append outside a SessionStore`);
    }
    if (entry !== void 0 && entry.announcement !== "complete") {
      throw new Error(`session "${this.id}" cannot append before session/created completes`);
    }
    if (entry?.appending) {
      throw new Error("session append cannot reenter while another append is being published");
    }
    return entry;
  }
  /**
   * Accept one frozen candidate at the next sequence number, enter it into the
   * log, and notify `session/event` observers with per-listener containment.
   * @param event - the candidate built at the current log length.
   * @param entry - the attachment read before the candidate was built.
   */
  commit(event, entry) {
    this.surfaceManager.validateNext(event);
    if (entry !== void 0) entry.appending = true;
    try {
      const callbackArgs = [this, event];
      const callbacks = entry === void 0 ? void 0 : collectSessionCallbacks(entry.emitCtx, [entry.carrier, "session/event", ...callbackArgs]);
      this.log.push(event);
      this.eventsSnapshot = void 0;
      if (entry !== void 0 && callbacks !== void 0) {
        invokeContainedSessionObservers(entry.emitCtx, "session/event", entry.id, callbackArgs, callbacks);
      }
    } finally {
      if (entry !== void 0) {
        entry.appending = false;
        if (entry.detachRequested && entry.announcement !== "dispatching") entry.detach();
      }
    }
  }
  /** Cached fold of the request-header events — see {@link requestHeader}. */
  headerFold;
  /** Log position (events consumed) the header fold has reached. */
  headerFoldSeq = 0;
  /**
   * The {@link EpochHeader} in force after the log's last header event — the
   * header the NEXT request will be compared against — or undefined before
   * the first `request/header` snapshot. The live, incrementally-maintained
   * form of `foldRequestHeader(session.snapshotEvents())`: each header event is folded
   * once, when first seen, so a per-step read costs O(new events).
   * @returns the folded header, or undefined when no header event exists yet.
   */
  requestHeader() {
    if (this.headerFoldSeq < this.log.length) {
      this.headerFold = deepFreeze(foldRequestHeader(this.log.slice(this.headerFoldSeq), this.headerFold));
      this.headerFoldSeq = this.log.length;
    }
    return this.headerFold;
  }
  /** Cached fold of `request/context` events. */
  contextFold;
  contextFoldSeq = 0;
  /**
   * Return the latest resolved route metadata, or `undefined` before the first
   * `request/context` event. Each event is folded once.
   * @returns the latest immutable route metadata.
   */
  requestContext() {
    if (this.contextFoldSeq < this.log.length) {
      for (const event of this.log.slice(this.contextFoldSeq)) {
        if (event.type === "request/context") this.contextFold = deepFreeze({ ...event.data });
      }
      this.contextFoldSeq = this.log.length;
    }
    return this.contextFold;
  }
  /** Cached historical tool definitions and updates for request projection. */
  toolHistoryProjection = new ToolHistoryProjection();
  /** Index of the next committed event not yet consumed by the tool-history fold. */
  toolHistorySeq = 0;
  /**
   * Fold unseen committed events into capability-independent tool history.
   * Initial access reconstructs inherited history; later reads consume only new events.
   * @returns an immutable snapshot for LLM request projection, including historical addition definitions.
   */
  toolHistory() {
    for (const event of this.log.slice(this.toolHistorySeq)) this.toolHistoryProjection.apply(event);
    this.toolHistorySeq = this.log.length;
    return this.toolHistoryProjection.snapshot();
  }
  /** The derived-message cache: frozen projections, extended per unseen node. */
  derived = [];
  /** Surface position (nodes projected) the cache has reached. */
  derivedNodes = 0;
  /** {@link SurfaceManager.contentGeneration} the cache was built under. */
  derivedGeneration = 0;
  /**
   * Derive the LLM message history by walking the ordered sequences of
   * message-producing events maintained by `surfaceOp` markers. The
   * surface is the single source of derived history: every message-producing
   * append records its `surfaceOp`, so a raw event with no marker (a chunk, a
   * turn boundary) is correctly absent, and a compaction `replace` deletes the
   * shadowed nodes from the derivation. The projection rules are
   * {@link deriveEventMessage}, with logged message projections applied
   * without changing node membership or message identity.
   *
   * CACHED: pure tail growth costs O(new nodes); a replacement or message projection
   * ({@link SessionSurface.contentGeneration}) rebuilds. The returned array is
   * a fresh snapshot per call (later appends never grow an array a caller
   * already holds); the `Message` objects in it are SHARED and **deep-frozen**.
   * Unchanged content reuses frozen event data; projected blocks are frozen
   * derived copies. Consumers cannot mutate the log through either form.
   * @returns a fresh array of the shared, frozen derived history.
   */
  deriveMessages() {
    const surface = this.surface;
    const nodes = surface.nodes;
    const generation = surface.contentGeneration;
    if (generation !== this.derivedGeneration) {
      this.derived = [];
      this.derivedNodes = 0;
      this.derivedGeneration = generation;
    }
    for (const seq of nodes.slice(this.derivedNodes)) {
      const msg = this.deriveEventMessage(this.log[seq]);
      if (msg) this.derived.push(msg);
    }
    this.derivedNodes = nodes.length;
    return [...this.derived];
  }
  /**
   * Project one event with all committed message projections applied.
   * The original durable event remains unchanged.
   * @param event - the event to project.
   * @returns the derived message, or null when the event produces none.
   */
  deriveEventMessage(event) {
    return this.surfaceManager.deriveEventMessage(event);
  }
};

// ../../zrepo/deepseek-harness/packages/compaction/compaction-basic/lib/index.js
var DEFAULT_THRESHOLD_RATIO = 0.8;
var DEFAULT_RETAIN_RATIO = 0.16;
var POLICY_CONFIG_KEYS = [
  "thresholdRatio",
  "headroomTokens",
  "retainRatio",
  "retainTokens",
  "summarizationProvider",
  "summarizationModel",
  "maxTokens",
  "compactionRetries",
  "maxOverflowRetries"
];
var BASIC_COMPACT_CONFIG_KEYS = /* @__PURE__ */ new Set([
  ...POLICY_CONFIG_KEYS,
  "modelPolicies",
  "auto"
]);
var MODEL_POLICY_KEYS = /* @__PURE__ */ new Set([
  "provider",
  "model",
  ...POLICY_CONFIG_KEYS
]);
var TargetPressureConfigError = class extends Error {
  targetKey;
  /**
  * @param targetKey - exact provider/model route used as the warning key.
  * @param message - actionable configuration failure detail.
  */
  constructor(targetKey, message) {
    super(message);
    this.targetKey = targetKey;
  }
};
function resolveConfig3(config = {}) {
  validateKeys2(config, BASIC_COMPACT_CONFIG_KEYS, "BasicCompactionConfig");
  validatePolicy(config, "BasicCompactionConfig");
  if (config.auto !== void 0 && typeof config.auto !== "boolean") throw new Error("BasicCompactionConfig: auto must be a boolean");
  const headroomTokens = config.headroomTokens ?? 65536;
  const maxTokens = config.maxTokens ?? headroomTokens;
  assertPositiveInteger("BasicCompactionConfig.maxTokens (explicit or from headroomTokens)", maxTokens);
  const thresholdRatio = config.thresholdRatio ?? DEFAULT_THRESHOLD_RATIO;
  const retention = resolveRetention(config, { retainRatio: DEFAULT_RETAIN_RATIO });
  validateRatioRetention(thresholdRatio, retention, "BasicCompactionConfig");
  const modelPolicies = resolveModelPolicies(config.modelPolicies);
  for (const [index, policy] of modelPolicies.entries()) {
    if (policy.maxTokens === void 0 && config.maxTokens === void 0 && policy.headroomTokens !== void 0) policy.maxTokens = policy.headroomTokens;
    assertPositiveInteger(`BasicCompactionConfig: modelPolicies[${index}].maxTokens (explicit or from headroomTokens)`, policy.maxTokens ?? maxTokens);
    validateRatioRetention(policy.thresholdRatio ?? thresholdRatio, resolveRetention(policy, retention), `BasicCompactionConfig: modelPolicies[${index}]`);
  }
  return deepFreeze({
    thresholdRatio,
    headroomTokens,
    ...retention,
    summarizationProvider: config.summarizationProvider ?? "",
    summarizationModel: config.summarizationModel ?? "",
    maxTokens,
    compactionRetries: config.compactionRetries ?? 1,
    maxOverflowRetries: config.maxOverflowRetries ?? 1,
    modelPolicies,
    auto: config.auto ?? true
  });
}
function resolveTargetPolicy(config, target) {
  const override = config.modelPolicies.find((policy) => policy.provider === target.provider && policy.model === target.model);
  const inheritedRetention = config.retainTokens === void 0 ? { retainRatio: config.retainRatio } : { retainTokens: config.retainTokens };
  return deepFreeze({
    target: {
      provider: target.provider,
      model: target.model
    },
    thresholdRatio: override?.thresholdRatio ?? config.thresholdRatio,
    headroomTokens: override?.headroomTokens ?? config.headroomTokens,
    ...resolveRetention(override ?? {}, inheritedRetention),
    summarizationProvider: override?.summarizationProvider ?? config.summarizationProvider,
    summarizationModel: override?.summarizationModel ?? config.summarizationModel,
    maxTokens: override?.maxTokens ?? config.maxTokens,
    compactionRetries: override?.compactionRetries ?? config.compactionRetries,
    maxOverflowRetries: override?.maxOverflowRetries ?? config.maxOverflowRetries
  });
}
function resolveCompactSpec(policy, contextWindow, reservedCompletionTokens2) {
  const targetKey = `${policy.target.provider}/${policy.target.model}`;
  if (!Number.isInteger(contextWindow) || contextWindow <= 0) throw new TargetPressureConfigError(targetKey, `BasicCompactionConfig: contextWindow (${contextWindow}) must be a positive integer`);
  if (!Number.isInteger(reservedCompletionTokens2) || reservedCompletionTokens2 < 0) throw new TargetPressureConfigError(targetKey, `BasicCompactionConfig: reservedCompletionTokens (${reservedCompletionTokens2}) must be a non-negative integer`);
  const messageBudgetTokens = contextWindow - reservedCompletionTokens2;
  if (messageBudgetTokens <= 0) throw new TargetPressureConfigError(targetKey, `compaction-basic: ${targetKey} reserves ${reservedCompletionTokens2} completion tokens of its ${contextWindow}-token context window, leaving no message budget; configure the adapter model's contextWindow above the effective request maxTokens`);
  const pressureBudgetTokens = messageBudgetTokens - policy.headroomTokens;
  if (pressureBudgetTokens <= 0) throw new TargetPressureConfigError(targetKey, `compaction-basic: ${targetKey} reserves ${reservedCompletionTokens2} completion tokens and ${policy.headroomTokens} headroom tokens of its ${contextWindow}-token context window, leaving no pressure budget; reduce the effective request maxTokens or compaction headroomTokens, or configure a larger adapter model contextWindow`);
  const thresholdTokens = Math.floor(Math.min(contextWindow * policy.thresholdRatio, pressureBudgetTokens));
  const retainTokens = policy.retainTokens === void 0 ? Math.floor(messageBudgetTokens * policy.retainRatio) : policy.retainTokens;
  if (retainTokens >= thresholdTokens) throw new TargetPressureConfigError(targetKey, `BasicCompactionConfig: ${policy.target.provider}/${policy.target.model} retainTokens (${retainTokens}) must be less than threshold tokens ${thresholdTokens}`);
  return deepFreeze({
    target: { ...policy.target },
    contextWindow,
    thresholdRatio: policy.thresholdRatio,
    thresholdTokens,
    retainTokens,
    summarizationProvider: policy.summarizationProvider,
    summarizationModel: policy.summarizationModel,
    maxTokens: policy.maxTokens,
    compactionRetries: policy.compactionRetries,
    maxOverflowRetries: policy.maxOverflowRetries
  });
}
function resolveRetention(config, fallback) {
  if (config.retainTokens !== void 0) return { retainTokens: config.retainTokens };
  if (config.retainRatio !== void 0) return { retainRatio: config.retainRatio };
  return fallback;
}
function validateRatioRetention(thresholdRatio, retention, name) {
  if (retention.retainRatio !== void 0 && retention.retainRatio >= thresholdRatio) throw new Error(`${name}: retainRatio (${retention.retainRatio}) must be less than the resolved thresholdRatio (${thresholdRatio})`);
}
function resolveModelPolicies(configured) {
  if (configured === void 0) return [];
  if (!Array.isArray(configured)) throw new Error("BasicCompactionConfig: modelPolicies must be an array");
  const seen = /* @__PURE__ */ new Set();
  return configured.map((source, index) => {
    assertModelPolicy(source, `BasicCompactionConfig: modelPolicies[${index}]`);
    const key = `${source.provider}\0${source.model}`;
    if (seen.has(key)) throw new Error(`BasicCompactionConfig: duplicate model policy for ${source.provider}/${source.model}`);
    seen.add(key);
    return { ...source };
  });
}
function assertModelPolicy(source, name) {
  if (!isUnknownRecord(source)) throw new Error(`${name} must be an object`);
  validateKeys2(source, MODEL_POLICY_KEYS, name);
  assertNonEmptyString(`${name}.provider`, source.provider);
  assertNonEmptyString(`${name}.model`, source.model);
  validatePolicy(source, name);
}
function validatePolicy(config, name) {
  const thresholdRatio = config.thresholdRatio;
  const headroomTokens = config.headroomTokens;
  const retainRatio = config.retainRatio;
  const retainTokens = config.retainTokens;
  const maxTokens = config.maxTokens;
  const compactionRetries = config.compactionRetries;
  const maxOverflowRetries = config.maxOverflowRetries;
  if (thresholdRatio !== void 0) assertRatio(`${name}.thresholdRatio`, thresholdRatio);
  if (headroomTokens !== void 0) assertNonNegativeInteger(`${name}.headroomTokens`, headroomTokens);
  if (retainRatio !== void 0) assertRatio(`${name}.retainRatio`, retainRatio);
  if (retainTokens !== void 0) assertNonNegativeInteger(`${name}.retainTokens`, retainTokens);
  if (retainRatio !== void 0 && retainTokens !== void 0) throw new Error(`${name}: retainRatio and retainTokens are mutually exclusive`);
  if (maxTokens !== void 0) assertPositiveInteger(`${name}.maxTokens`, maxTokens);
  if (compactionRetries !== void 0) assertNonNegativeInteger(`${name}.compactionRetries`, compactionRetries);
  if (maxOverflowRetries !== void 0) assertNonNegativeInteger(`${name}.maxOverflowRetries`, maxOverflowRetries);
  validateSummarizationPair(config, name);
}
function validateSummarizationPair(config, name) {
  const provider = config.summarizationProvider;
  const model = config.summarizationModel;
  if (provider !== void 0 && typeof provider !== "string") throw new Error(`${name}.summarizationProvider must be a string`);
  if (model !== void 0 && typeof model !== "string") throw new Error(`${name}.summarizationModel must be a string`);
  if (provider === void 0 && model === void 0) return;
  if (provider === void 0 || model === void 0 || provider.length === 0 !== (model.length === 0)) throw new Error(`${name}: summarizationProvider and summarizationModel must be set together as an empty or non-empty pair`);
}
function validateKeys2(config, keys, name) {
  for (const key of Object.keys(config)) if (!keys.has(key)) throw new Error(`${name}: unknown key "${key}"`);
}
function isUnknownRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertNonEmptyString(name, value) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} must be a non-empty string`);
}
function assertPositiveInteger(name, value) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new Error(`${name} (${String(value)}) must be a positive integer`);
}
function assertNonNegativeInteger(name, value) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error(`${name} (${String(value)}) must be a non-negative integer`);
}
function assertRatio(name, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) throw new Error(`${name} (${String(value)}) must be a number in (0, 1]`);
}
var SUMMARY_OPEN_TAG = "<compacted-summary>";
var SUMMARY_CLOSE_TAG = "</compacted-summary>";
var COMPACTION_INSTRUCTION = [
  "You are now acting as a compaction engine for this AI coding assistant. Condense the conversation ABOVE into a structured checkpoint that lets another model resume the work with no loss of essential context.",
  "",
  'Output EXACTLY the Markdown structure below: keep every section, in order. Use terse bullets, not prose paragraphs. Write "(none)" for an empty section \u2014 never drop a section.',
  "",
  "## Primary Request and Intent",
  "- [the user's original and evolving goals; quote verbatim where the exact wording matters]",
  "",
  "## Key Technical Concepts",
  "- [technologies, frameworks, patterns, and conventions in play]",
  "",
  "## Files and Code",
  "- [exact path: why it matters, key changes or snippets]",
  "",
  "## Errors and Fixes",
  "- [error: how it was resolved, plus any related user feedback]",
  "",
  "## Pending Jobs",
  "- [explicitly requested work not yet completed]",
  "",
  "## Current Work",
  "- [precisely what was in progress at this checkpoint]",
  "",
  "## Next Step",
  '- [the single next action, directly in line with the most recent request, or "(none)"]',
  "",
  "## Critical Context",
  "- [decisions and their rationale, constraints, user preferences, open questions, data needed to continue]",
  "",
  "Rules:",
  "- Write concise English engineering prose. Preserve exact file paths, commands, error strings, identifiers, numeric values, function signatures, and syntax fragments.",
  "- Capture user feedback and explicit instructions faithfully, especially corrections.",
  "- Do NOT mention this summarization request or that the context was compacted.",
  "- Output only the checkpoint text: do not call any tool or take any other action.",
  `- If the conversation already contains a ${SUMMARY_OPEN_TAG} block, it is a PRIOR checkpoint. Do not copy it forward verbatim: preserve still-true facts, drop stale ones, and merge newer information into a single consolidated summary under the same structure.`
].join("\n");
var CHECKPOINT_PREAMBLE = "This is an automatically generated checkpoint condensing an earlier span of the conversation to free up context. Treat the captured context as established background and build on it without restating it. Continue the task directly from the messages that follow, without acknowledging this checkpoint.";
async function summarizeWithLlm(ctx, config, input, agent, signal) {
  const latest = agent.session.requestHeader()?.config;
  const configured = config.summarizationProvider.length === 0 ? void 0 : {
    provider: config.summarizationProvider,
    model: config.summarizationModel
  };
  const agentTarget = agent.options.provider !== void 0 && agent.options.provider.length > 0 && agent.options.model !== void 0 && agent.options.model.length > 0 ? {
    provider: agent.options.provider,
    model: agent.options.model
  } : void 0;
  const target = configured ?? latest ?? agentTarget;
  if (target === void 0) throw new Error("no provider/model available for summarization: set both BasicCompactionConfig summarization fields, route one request, or set both AgentOptions fields");
  const assembler = new BlockAssembler();
  const messages = [...input.messages, deepFreeze({
    role: "user",
    content: [{
      type: "text",
      text: COMPACTION_INSTRUCTION
    }]
  })];
  const options = {
    provider: target.provider,
    model: target.model,
    messages,
    toolHistory: agent.session.toolHistory(),
    ...input.tools === void 0 ? {} : { tools: [...input.tools] },
    maxTokens: config.maxTokens,
    sessionId: agent.session.id,
    purpose: "compaction",
    ...signal === void 0 ? {} : { signal }
  };
  for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk);
  const error = finishError(assembler.finish);
  if (error !== void 0) throw error;
  const rawOutput = assembler.blocks();
  const summary = summaryText(rawOutput);
  if (!summary.some((block) => block.text.trim().length > 0)) throw new Error("summarization produced no text summary content");
  return {
    summary,
    rawOutput,
    llmStreamCall: true,
    provider: options.provider,
    model: options.model,
    maxTokens: config.maxTokens,
    ...assembler.usage === void 0 ? {} : { usage: assembler.usage }
  };
}
function frameSummary(summary) {
  return [
    {
      type: "text",
      text: `${CHECKPOINT_PREAMBLE}

${SUMMARY_OPEN_TAG}`
    },
    ...summary,
    {
      type: "text",
      text: SUMMARY_CLOSE_TAG
    }
  ];
}
function finishError(finish) {
  switch (finish.kind) {
    case "error":
    case "aborted":
      return new LlmError(finish.failure.message, finish.failure.code, finish.failure);
    case "max-tokens": {
      const error = /* @__PURE__ */ new Error("summarization truncated at the token cap (incomplete checkpoint)");
      error.code = "MAX_TOKENS";
      return error;
    }
    default:
      return;
  }
}
function summaryText(blocks) {
  if (contentHasImage(blocks)) throw new LlmError("compaction summary cannot contain image output", "UNSUPPORTED_CONTENT");
  return blocks.filter((block) => block.type === "text");
}
var SurfaceChangedError = class extends Error {
};
function systemHead(session, headSeq) {
  const head = session.eventAt(headSeq);
  return head.type === "system/message" ? head : void 0;
}
function selectCompactableRange(session, measurement, retainTokens) {
  const pricedNodes = measurement.nodes;
  if (pricedNodes.length === 0) return null;
  const surfaceNodes = session.surface.nodes;
  if (surfaceNodes.length !== pricedNodes.length || surfaceNodes.some((seq, index) => seq !== pricedNodes[index]?.seq)) throw new Error("compaction: token-meter surface does not match the current session surface");
  const firstIdx = systemHead(session, surfaceNodes[0]) === void 0 ? 0 : 1;
  let accumulated = 0;
  let keepFromIdx = pricedNodes.length;
  for (let index = pricedNodes.length - 1; index >= 0; index -= 1) {
    accumulated += pricedNodes[index].tokens;
    keepFromIdx = index;
    if (accumulated >= retainTokens) break;
  }
  if (keepFromIdx <= firstIdx) return null;
  while (keepFromIdx > firstIdx) {
    if (toolPairingBalancedBefore(session, surfaceNodes[keepFromIdx])) break;
    keepFromIdx -= 1;
  }
  if (keepFromIdx <= firstIdx) return null;
  return {
    start: surfaceNodes[firstIdx],
    end: surfaceNodes[keepFromIdx - 1]
  };
}
async function compactSurfaceRegion(dependencies, session, start, end, agent, options, signal) {
  if (options.owner === null) signal?.throwIfAborted();
  const selection = validateSurfaceRegion(session, start, end);
  const entryState = inspectCompactionEntryState(session);
  assertCompactionInactive(entryState.unmatchedCompactionStart, entryState.latestEndSeedSeq, "compaction");
  let owner;
  if (options.owner === null) {
    if (entryState.openTurn !== null) throw new ManualCompactionError("busy", "manual compaction: the session already has an open turn");
    owner = null;
  } else {
    if (entryState.openTurn === null) throw new Error("compactRegion: no open turn \u2014 automatic compaction events must be enclosed in a turn");
    owner = entryState.openTurn;
  }
  const compactionId = CompactionId(randomUUID2());
  const lifecycle = {
    compactionId,
    ...options.sourceCommandId === void 0 ? {} : { sourceCommandId: options.sourceCommandId },
    turn: owner
  };
  const startEvent = session.append("compaction/start", lifecycle);
  const assertStable = options.stability === "whole-surface" ? assertWholeSurfaceUnchanged : assertSelectedSpanStable;
  let failure;
  let flushFailure;
  let result;
  let closed = false;
  let closing = false;
  let stage = "summary";
  try {
    const summarized = await summarizeCompaction(dependencies, prepareCompaction(dependencies, session, selection), agent, compactionId, options.sourceCommandId, assertStable, signal);
    if (options.owner === null) signal?.throwIfAborted();
    assertStable(dependencies, session, summarized);
    stage = "commit";
    const pending = commitCompactionBody(session, startEvent, summarized);
    closing = true;
    const endEvent = session.append("compaction/end", lifecycle);
    closed = true;
    result = completeCompaction(pending, endEvent);
  } catch (error) {
    failure = {
      error,
      stage: closing ? "commit" : stage
    };
    if (!closing) {
      closing = true;
      try {
        session.append("compaction/end", {
          ...lifecycle,
          error: errorChain(error)
        });
        closed = true;
      } catch (closeError) {
        failure = {
          error: closeError,
          stage: "commit"
        };
      }
    }
  }
  if (closed && options.flush !== void 0) try {
    await options.flush();
  } catch (error) {
    flushFailure = error;
  }
  if (options.owner === null) signal?.throwIfAborted();
  if (failure !== void 0) {
    if (options.owner === null) throwManualFailure(failure);
    throw failure.error;
  }
  if (flushFailure !== void 0) throw new ManualCompactionError("persistence", "manual compaction durability checkpoint failed", { cause: flushFailure });
  if (result === void 0) throw new Error("compaction committed without a result");
  return result;
}
function throwManualFailure(failure) {
  if (failure.stage === "commit") throw new ManualCompactionError("commit", "manual compaction did not commit cleanly", { cause: failure.error });
  if (failure.error instanceof SurfaceChangedError) throw new ManualCompactionError("changed", "the compacted history changed during manual compaction", { cause: failure.error });
  throw new ManualCompactionError("summary", "manual compaction could not produce a smaller summary", { cause: failure.error });
}
function assertCompactionInactive(unmatchedCompactionStart, latestEndSeedSeq, stage) {
  if (unmatchedCompactionStart === void 0 || latestEndSeedSeq !== void 0 && latestEndSeedSeq > unmatchedCompactionStart.seq) return;
  throw new ManualCompactionError("busy", `${stage}: compaction already in progress; the session compaction lock is already active`);
}
function assertNoActiveCompaction(session, stage) {
  const entryState = inspectCompactionEntryState(session);
  assertCompactionInactive(entryState.unmatchedCompactionStart, entryState.latestEndSeedSeq, stage);
}
function validateSurfaceRegion(session, start, end) {
  const nodes = session.surface.nodes;
  const startIdx = nodes.indexOf(start);
  const endIdx = nodes.indexOf(end);
  if (startIdx === -1) throw new Error(`compactRegion: start seq ${start} not found in surface`);
  if (endIdx === -1) throw new Error(`compactRegion: end seq ${end} not found in surface`);
  if (startIdx > endIdx) throw new Error(`compactRegion: start seq ${start} (position ${startIdx}) is after end seq ${end} (position ${endIdx}) on the surface`);
  if (!toolPairingBalancedBefore(session, nodes[startIdx])) throw new Error(`compactRegion: start seq ${start} is not a balanced boundary (would split a step's tool-call/result pair)`);
  if (!toolPairingBalancedAfter(session, nodes[endIdx])) throw new Error(`compactRegion: end seq ${end} is not a balanced boundary (would split a step, or the step is still open)`);
  return {
    start,
    end,
    startIdx,
    endIdx,
    shadowedSeqs: nodes.slice(startIdx, endIdx + 1)
  };
}
function prepareCompaction(dependencies, session, selection) {
  const measurement = dependencies.meter.measure(session);
  const selectedNodes = measurement.nodes.slice(selection.startIdx, selection.endIdx + 1);
  if (selectedNodes.length !== selection.shadowedSeqs.length || selectedNodes.some((node, index) => node.seq !== selection.shadowedSeqs[index])) throw new SurfaceChangedError("compaction: selected surface changed before summarization began");
  return {
    ...selection,
    measurement,
    selectedNodes,
    shadowedTokenCount: selectedNodes.reduce((total, node) => total + node.heuristicTokens, 0),
    shadowedRouteTokenCount: selectedNodes.reduce((total, node) => total + node.tokens, 0),
    input: buildSummarizationInput(session, selection.shadowedSeqs)
  };
}
async function summarizeCompaction(dependencies, prepared, agent, compactionId, sourceCommandId, assertStable, signal) {
  let summaryResult;
  for (; ; ) {
    signal?.throwIfAborted();
    try {
      summaryResult = await dependencies.summarize(prepared.input, agent, signal);
      break;
    } catch (error) {
      if (signal?.aborted === true) throw error;
      assertStable(dependencies, agent.session, prepared);
      if (!dependencies.recover(error, agent, prepared.shadowedSeqs, signal)) throw error;
      prepared = prepareCompaction(dependencies, agent.session, validateSurfaceRegion(agent.session, prepared.start, prepared.end));
    }
  }
  const checkpointMessage = createUserMessage({
    content: frameSummary(summaryResult.summary),
    source: compactCheckpointSource(compactionId, sourceCommandId)
  });
  const framedSummaryTokenCount = dependencies.meter.estimateMessage(checkpointMessage);
  if (framedSummaryTokenCount >= prepared.shadowedRouteTokenCount) throw new Error(`summary is not smaller than the shadowed content (${framedSummaryTokenCount} estimated framed tokens >= ${prepared.shadowedRouteTokenCount})`);
  return {
    ...prepared,
    ...summaryResult,
    checkpointMessage
  };
}
function assertWholeSurfaceUnchanged(dependencies, session, prepared) {
  if (!isDeepStrictEqual(dependencies.meter.measure(session).nodes, prepared.measurement.nodes)) throw new SurfaceChangedError("compaction: session surface changed during summarization");
}
function assertSelectedSpanStable(dependencies, session, prepared) {
  let current;
  try {
    current = validateSurfaceRegion(session, prepared.start, prepared.end);
  } catch (error) {
    throw new SurfaceChangedError("compaction: the selected span is no longer a valid replacement target", { cause: error });
  }
  if (!isDeepStrictEqual([...current.shadowedSeqs], [...prepared.shadowedSeqs])) throw new SurfaceChangedError("compaction: the selected span changed during summarization");
  if (!isDeepStrictEqual(dependencies.meter.measure(session).nodes.slice(current.startIdx, current.endIdx + 1), prepared.selectedNodes)) throw new SurfaceChangedError("compaction: the selected span was rewritten during summarization");
}
function commitCompactionBody(session, startEvent, summarized) {
  const { start, end, shadowedSeqs, shadowedTokenCount, summary, provider, model, maxTokens, usage, checkpointMessage } = summarized;
  const callRecord = summarized.llmStreamCall === true ? {
    rawOutput: summarized.rawOutput,
    llmStreamCall: true
  } : summarized.rawOutput === void 0 ? {} : { rawOutput: summarized.rawOutput };
  const summaryEvent = session.append("compaction/summary", {
    compactionId: startEvent.data.compactionId,
    ...startEvent.data.sourceCommandId === void 0 ? {} : { sourceCommandId: startEvent.data.sourceCommandId },
    summary,
    ...callRecord,
    shadowedRange: {
      start,
      end
    },
    shadowedSeqs: [...shadowedSeqs],
    shadowedTokenCount,
    provider,
    model,
    ...maxTokens === void 0 ? {} : { maxTokens },
    ...usage === void 0 ? {} : { usage }
  });
  session.append("user/message", checkpointMessage, {
    surfaceOp: {
      op: "replace",
      startSeq: start,
      endSeq: end
    },
    sourceEventSeqs: [
      startEvent.seq,
      summaryEvent.seq,
      ...shadowedSeqs
    ]
  });
  return {
    compactionId: startEvent.data.compactionId,
    ...startEvent.data.sourceCommandId === void 0 ? {} : { sourceCommandId: startEvent.data.sourceCommandId },
    startSeq: startEvent.seq,
    summarySeq: summaryEvent.seq,
    summary,
    shadowedRange: {
      start,
      end
    },
    shadowedSeqs: [...shadowedSeqs],
    shadowedTokenCount
  };
}
function completeCompaction(pending, endEvent) {
  return {
    ...pending,
    endSeq: endEvent.seq
  };
}
function buildSummarizationInput(session, shadowedSeqs) {
  const header = session.requestHeader();
  const head = systemHead(session, session.surface.nodes[0]);
  const system = head === void 0 ? null : session.deriveEventMessage(head);
  const regionMessages = shadowedSeqs.map((seq) => session.deriveEventMessage(session.eventAt(seq))).filter((message) => message !== null);
  return {
    ...header?.tools === void 0 ? {} : { tools: header.tools },
    messages: system === null ? regionMessages : [system, ...regionMessages]
  };
}
function inspectCompactionEntryState(session) {
  let openTurn = null;
  let openTurnStateKnown = false;
  let unmatchedCompactionStart;
  let compactionEntryStateKnown = false;
  let latestEndSeedSeq;
  for (let seq = session.seq - 1; seq >= 0; seq -= 1) {
    const event = session.eventAt(SessionSeq(seq));
    if (latestEndSeedSeq === void 0 && event.type === "session/end-seed") latestEndSeedSeq = event.seq;
    if (!compactionEntryStateKnown) {
      if (event.type === "compaction/start") {
        unmatchedCompactionStart = event;
        compactionEntryStateKnown = true;
      } else if (event.type === "compaction/end") compactionEntryStateKnown = true;
    }
    if (!openTurnStateKnown) {
      if (event.type === "turn/start") {
        openTurn = event.data.turn;
        openTurnStateKnown = true;
      } else if (event.type === "turn/end") openTurnStateKnown = true;
    }
    if (openTurnStateKnown && compactionEntryStateKnown && latestEndSeedSeq !== void 0) break;
  }
  return {
    openTurn,
    unmatchedCompactionStart,
    latestEndSeedSeq
  };
}
function routedTarget(session) {
  const config = session.requestHeader()?.config;
  if (config === void 0 || config.provider.length === 0 || config.model.length === 0) return;
  return {
    provider: config.provider,
    model: config.model
  };
}
function reservedCompletionTokens(header, defaultMaxTokens) {
  return header.config.maxTokens ?? defaultMaxTokens ?? 0;
}
function conversationTarget(agent) {
  const routed = routedTarget(agent.session);
  if (routed !== void 0) return routed;
  if (agent.options.provider === void 0 || agent.options.provider.length === 0 || agent.options.model === void 0 || agent.options.model.length === 0) return void 0;
  return {
    provider: agent.options.provider,
    model: agent.options.model
  };
}
var thresholdRatioSchema = src_default.number();
var headroomTokensSchema = src_default.number().step(1).min(0);
var retainRatioSchema = src_default.number();
var retainTokensSchema = src_default.number().step(1).min(0);
var summarizationProviderSchema = src_default.string();
var summarizationModelSchema = src_default.string();
var maxTokensSchema = src_default.number().step(1).min(1);
var compactionRetriesSchema = src_default.number().step(1).min(0);
var maxOverflowRetriesSchema = src_default.number().step(1).min(0);
var modelPolicy = src_default.object({
  provider: src_default.string().required(),
  model: src_default.string().required(),
  thresholdRatio: thresholdRatioSchema,
  headroomTokens: headroomTokensSchema,
  retainRatio: retainRatioSchema,
  retainTokens: retainTokensSchema,
  summarizationProvider: summarizationProviderSchema,
  summarizationModel: summarizationModelSchema,
  maxTokens: maxTokensSchema,
  compactionRetries: compactionRetriesSchema,
  maxOverflowRetries: maxOverflowRetriesSchema
});
var BasicCompactionEngine = class extends CompactionEngine {
  static inject = [
    "llm",
    "tokenMeter",
    "sessions"
  ];
  static Config = src_default.object({
    thresholdRatio: thresholdRatioSchema,
    headroomTokens: headroomTokensSchema,
    retainRatio: retainRatioSchema,
    retainTokens: retainTokensSchema,
    summarizationProvider: summarizationProviderSchema,
    summarizationModel: summarizationModelSchema,
    maxTokens: maxTokensSchema,
    compactionRetries: compactionRetriesSchema,
    maxOverflowRetries: maxOverflowRetriesSchema,
    modelPolicies: src_default.array(modelPolicy),
    auto: src_default.boolean()
  });
  /** Resolved and validated compaction configuration. */
  config;
  warnedPressureConfigTargets = /* @__PURE__ */ new Set();
  overflowRetries = /* @__PURE__ */ new WeakMap();
  overflowAgents = /* @__PURE__ */ new WeakMap();
  constructor(ctx, config = {}) {
    super(ctx);
    this.config = resolveConfig3(config);
    if (this.config.auto) this._registerAutomaticCompaction();
  }
  /**
  * Register between-step pressure, model-switch pressure, and request-overflow
  * recovery. Pre-step and overflow listeners dispatch through `compactIfNeeded`;
  * model switches price the proposed header directly. All summaries use `summarize`.
  */
  _registerAutomaticCompaction() {
    const { ctx } = this;
    const logResult = (result, trigger) => {
      ctx.logger.info(`compaction (${trigger}): shadowed ${result.shadowedSeqs.length} surface nodes (seqs ${result.shadowedRange.start}-${result.shadowedRange.end}, ~${result.shadowedTokenCount} tokens)`);
    };
    ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
      if (!signal.aborted) try {
        const result = await this.compactIfNeeded(agent, "pressure", signal);
        if (result !== null) logResult(result, "step pressure");
      } catch (error) {
        if (error instanceof TargetPressureConfigError) {
          if (this.warnedPressureConfigTargets.has(error.targetKey)) return next();
          this.warnedPressureConfigTargets.add(error.targetKey);
        }
        const message = error instanceof Error ? error.message : String(error);
        ctx.logger.warn(`step compaction failed: ${message}; continuing the turn`);
      }
      return next();
    });
    ctx.on("agent/status", ({ agent, status }) => {
      if (status === "idle") this.overflowRetries.delete(agent);
    });
    ctx.on("agent/request", async ({ agent, signal }, next) => {
      const config = await next();
      const previous = agent.session.requestHeader();
      if (signal.aborted || previous === void 0 || config.provider === "" || config.model === "" || previous.config.provider === config.provider && previous.config.model === config.model) return config;
      try {
        const header = {
          ...previous,
          config
        };
        const result = await this.compactPressure(agent, header, signal, true);
        if (result !== null) logResult(result, "model switch");
      } catch (error) {
        signal.throwIfAborted();
        const message = error instanceof Error ? error.message : String(error);
        throw new LlmError(`Cannot switch to ${config.provider}/${config.model}: context compaction failed: ${message}. The previous request model is preserved; retry or select a model with a larger context window.`, "MODEL_SWITCH_COMPACTION_FAILED", { cause: error });
      }
      return config;
    }, { prepend: true });
    ctx.on("session/event", (session, event) => {
      if (event.type !== "assistant/message") return;
      const agent = this.overflowAgents.get(session);
      if (agent !== void 0) this.overflowRetries.delete(agent);
    });
    ctx.on("agent/request-error", async ({ agent, failure, signal }, next) => {
      if (failure.code !== CONTEXT_WINDOW_EXCEEDED_CODE || signal.aborted) return next();
      this.overflowAgents.set(agent.session, agent);
      const target = routedTarget(agent.session);
      if (target === void 0) return next();
      const policy = resolveTargetPolicy(this.config, target);
      const retries = this.overflowRetries.get(agent) ?? 0;
      if (retries >= policy.maxOverflowRetries) return next();
      const generation = agent.session.surface.replaceGeneration;
      let result;
      try {
        result = await this.compactIfNeeded(agent, "context-overflow", signal);
      } catch (recoveryError) {
        const message = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
        if (!signal.aborted && agent.session.surface.replaceGeneration > generation) {
          ctx.logger.warn(`context-overflow compaction failed after durable surface progress: ${message}; retrying from the replacement surface`);
          this.overflowRetries.set(agent, retries + 1);
          return { kind: "retry" };
        }
        ctx.logger.warn(`context-overflow compaction failed: ${message}; ${signal.aborted ? "cancellation prevents retry" : "preserving the original request error"}`);
        return next();
      }
      if (signal.aborted || agent.session.surface.replaceGeneration <= generation) return next();
      if (result !== null) logResult(result, "context overflow recovery");
      this.overflowRetries.set(agent, retries + 1);
      return { kind: "retry" };
    });
  }
  /**
  * Summarize the replayed conversation region through a direct one-shot
  * `ctx.llm.stream()` call whose prefix reuses the conversation's own system
  * prompt, tools, and messages so the provider's KV cache is not invalidated.
  * Override this sole hook for a template or remote summarizer.
  * @param input - replayed conversation prefix (system, tools, and leading messages) to condense.
  * @param agent - supplies routed-model history, fallback model, and session id.
  * @param signal - optional cancellation forwarded to the adapter.
  * @returns safe text summary blocks and the exact auxiliary call envelope and output.
  */
  async summarize(input, agent, signal) {
    const target = conversationTarget(agent);
    const config = target === void 0 ? this.config : resolveTargetPolicy(this.config, target);
    return summarizeWithLlm(this.ctx, config, input, agent, signal);
  }
  /**
  * Compact for replayed step-boundary pressure or one provider-confirmed context
  * overflow. Both triggers price the latest durable routed request envelope;
  * overflow bypasses the normal threshold and retained-tail policy so it can
  * force one useful balanced reduction.
  * @param agent - agent whose latest durable routed request is measured.
  * @param trigger - normal step-boundary pressure or context-overflow recovery.
  * @param signal - live turn cancellation signal forwarded to summarization.
  * @returns the latest summary compaction result, or `null` when no summary ran.
  */
  async compactIfNeeded(agent, trigger, signal) {
    const header = agent.session.requestHeader();
    if (header === void 0 || routedTarget(agent.session) === void 0) return null;
    switch (trigger) {
      case "pressure":
        return this.compactPressure(agent, header, signal, false);
      case "context-overflow": {
        this.ctx.get("toolResultPruner")?.pruneSession(agent.session);
        const measurement = this.ctx.tokenMeter.measure(agent.session);
        const range = selectCompactableRange(agent.session, measurement, 0);
        if (range === null) return null;
        return this.compactRegion(range.start, range.end, agent, signal);
      }
      /* v8 ignore next -- closed-union exhaustiveness guard */
      default:
        assertNever(trigger, "compaction trigger");
    }
  }
  /** Price the proposed header; switch checks require history below its threshold. */
  async compactPressure(agent, header, signal, requireBelowThreshold) {
    const target = header.config;
    const policy = resolveTargetPolicy(this.config, target);
    const meter2 = this.ctx.tokenMeter;
    let measurement = meter2.measure(agent.session, header);
    const prune = this.ctx.get("toolResultPruner");
    const info = await this.ctx.llm.resolveModelInfo(target.provider, target.model, signal);
    assertNoActiveCompaction(agent.session, "automatic pressure compaction");
    const targetKey = `${target.provider}/${target.model}`;
    if (info.context === void 0) throw new TargetPressureConfigError(targetKey, `compaction-basic: no context capacity for ${targetKey}; configure contextWindow on that adapter model`);
    const spec = resolveCompactSpec(policy, info.context.contextWindow, reservedCompletionTokens(header, info.defaultMaxTokens));
    if (measurement.totalTokens < spec.thresholdTokens) return null;
    if (prune !== void 0) {
      prune.pruneSession(agent.session);
      measurement = meter2.measure(agent.session, header);
    }
    if (measurement.totalTokens < spec.thresholdTokens) return null;
    let result = null;
    for (let attempt = 0; attempt <= spec.compactionRetries; attempt += 1) {
      const range = selectCompactableRange(agent.session, measurement, spec.retainTokens);
      if (range === null) {
        if (result === null && !requireBelowThreshold) return null;
        throw new Error(`no safe compaction range can reduce context below threshold (${measurement.totalTokens} estimated tokens >= threshold ${spec.thresholdTokens})`);
      }
      result = await this.compactRegion(range.start, range.end, agent, signal);
      measurement = meter2.measure(agent.session, header);
      if (measurement.totalTokens < spec.thresholdTokens) return result;
    }
    throw new Error(`compaction still above threshold after ${spec.compactionRetries + 1} compaction attempts (${measurement.totalTokens} estimated tokens >= threshold ${spec.thresholdTokens})`);
  }
  /**
  * Compact one inclusive positional range from the agent-owned surface using
  * the effective token meter for all retention and shrink pricing.
  * @param start - inclusive first surface-node seq.
  * @param end - inclusive last surface-node seq.
  * @param agent - owner of the target session, used by the summarizer.
  * @param signal - optional summarization cancellation signal.
  * @returns the successful durable compaction result.
  */
  async compactRegion(start, end, agent, signal) {
    return compactSurfaceRegion(this.regionDependencies(), agent.session, start, end, agent, {
      owner: "current-turn",
      stability: "whole-surface"
    }, signal);
  }
  /**
  * Force one useful idle-session compaction below the pressure threshold, and
  * resolve only after its standalone marker pair is durably checkpointed.
  * @param agent - idle agent whose next-turn admission this call reserves.
  * @param signal - cancellation scoped to this compaction request.
  * @param sourceCommandId - initiating command identity for presentation correlation.
  * @returns the committed result, or `null` when no safe useful range exists.
  */
  compactNow(agent, signal, sourceCommandId) {
    signal.throwIfAborted();
    try {
      return agent.runMaintenance(async (agentSignal) => {
        const operationSignal = AbortSignal.any([agentSignal, signal]);
        try {
          operationSignal.throwIfAborted();
          const range = selectCompactableRange(agent.session, this.ctx.tokenMeter.measure(agent.session), 0);
          if (range === null) return null;
          return await compactSurfaceRegion(this.regionDependencies(), agent.session, range.start, range.end, agent, {
            owner: null,
            stability: "selected-span",
            ...sourceCommandId === void 0 ? {} : { sourceCommandId },
            flush: async () => {
              await this.ctx.sessions.flush(agent.session);
            }
          }, operationSignal);
        } catch (error) {
          if (agentSignal.aborted && operationSignal.reason === agentSignal.reason) throw new ManualCompactionError("cancelled", "manual compaction was cancelled", { cause: error });
          operationSignal.throwIfAborted();
          throw error;
        }
      });
    } catch (error) {
      throw new ManualCompactionError("busy", "manual compaction requires an idle agent with no waking queued work", { cause: error });
    }
  }
  /** Bind the effective token meter and dynamically dispatched summarizer hook. */
  regionDependencies() {
    return {
      meter: this.ctx.tokenMeter,
      summarize: (input, owner, abort) => this.summarize(input, owner, abort),
      recover: (error, agent, sourceEventSeqs, signal) => this.ctx.waterfall("compaction/summary-error", {
        session: agent.session,
        sourceEventSeqs,
        error,
        ...signal === void 0 ? {} : { signal }
      }, () => false)
    };
  }
};

// ../../zrepo/deepseek-harness/packages/compaction/compaction-tool-result-pruner/lib/index.js
var PRUNE_MARKER = "\n\n[... tool result middle pruned ...]\n\n";
var DEFAULTS = deepFreeze({
  thresholdChars: 8192,
  headChars: 4096,
  tailChars: 1024
});
var CONFIG_KEYS = /* @__PURE__ */ new Set([
  "thresholdChars",
  "headChars",
  "tailChars"
]);
function codePointLength(text) {
  return Array.from(text).length;
}
function resolveConfig4(config = {}) {
  for (const key of Object.keys(config)) if (!CONFIG_KEYS.has(key)) throw new Error(`ToolResultPruneConfig: unknown key "${key}" (allowed: thresholdChars, headChars, tailChars)`);
  const resolved = {
    thresholdChars: config.thresholdChars ?? DEFAULTS.thresholdChars,
    headChars: config.headChars ?? DEFAULTS.headChars,
    tailChars: config.tailChars ?? DEFAULTS.tailChars
  };
  assertPositiveInteger2("thresholdChars", resolved.thresholdChars);
  assertNonNegativeInteger2("headChars", resolved.headChars);
  assertNonNegativeInteger2("tailChars", resolved.tailChars);
  const emittedChars = resolved.headChars + codePointLength(PRUNE_MARKER) + resolved.tailChars;
  if (emittedChars > resolved.thresholdChars) throw new Error(`ToolResultPruneConfig: headChars + marker + tailChars (${emittedChars}) must be at most thresholdChars (${resolved.thresholdChars})`);
  return deepFreeze(structuredClone(resolved));
}
function assertPositiveInteger2(name, value) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`ToolResultPruneConfig: ${name} (${value}) must be a positive integer`);
}
function assertNonNegativeInteger2(name, value) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`ToolResultPruneConfig: ${name} (${value}) must be a non-negative integer`);
}
var ToolResultPruner = class extends Service3 {
  static inject = ["tokenMeter"];
  static Config = src_default.object({
    thresholdChars: src_default.number().step(1).min(1).default(DEFAULTS.thresholdChars),
    headChars: src_default.number().step(1).min(0).default(DEFAULTS.headChars),
    tailChars: src_default.number().step(1).min(0).default(DEFAULTS.tailChars)
  });
  /** Resolved and immutable character budgets. */
  config;
  constructor(ctx, config = {}) {
    super(ctx, "toolResultPruner");
    this.config = resolveConfig4(config);
  }
  /**
  * Measure text content in Unicode code points; non-text blocks cost zero.
  * @param blocks - tool-result content to measure.
  * @returns total Unicode code points across text blocks.
  */
  measureContent(blocks) {
    let chars = 0;
    for (const block of blocks) if (block.type === "text") chars += codePointLength(block.text);
    return chars;
  }
  /**
  * Replace an over-budget text middle while retaining rich-block order.
  * Text slicing is by Unicode code point, not UTF-16 code unit, so a retained
  * boundary cannot split a surrogate pair. Grapheme clusters may still split.
  * @param blocks - original tool-result content.
  * @returns pruned content, or `null` when the text is within budget.
  */
  pruneContent(blocks) {
    const totalChars = this.measureContent(blocks);
    if (totalChars <= this.config.thresholdChars) return null;
    const removedStart = this.config.headChars;
    const removedEnd = totalChars - this.config.tailChars;
    const pruned = [];
    let consumed = 0;
    let markerInserted = false;
    for (const block of blocks) {
      if (block.type !== "text") {
        pruned.push(block);
        continue;
      }
      const points = Array.from(block.text);
      const blockStart = consumed;
      const blockEnd = blockStart + points.length;
      const headEnd = Math.min(points.length, Math.max(0, removedStart - blockStart));
      const tailStart = Math.min(points.length, Math.max(0, removedEnd - blockStart));
      const marker = blockStart < removedEnd && blockEnd > removedStart && !markerInserted ? PRUNE_MARKER : "";
      if (marker.length > 0) markerInserted = true;
      const text = points.slice(0, headEnd).join("") + marker + points.slice(tailStart).join("");
      if (text.length > 0) pruned.push({
        ...block,
        text
      });
      consumed = blockEnd;
    }
    if (!markerInserted) throw new Error("tool-result prune: failed to locate the removed text span");
    const charsAfter = this.measureContent(pruned);
    if (charsAfter > this.config.thresholdChars || charsAfter >= totalChars) throw new Error("tool-result prune: replacement must be smaller and within threshold");
    return pruned;
  }
  /**
  * Prune every over-budget tool result from one stable current-surface snapshot.
  * Each replacement preserves the complete event data except for `content`,
  * cites the shadowed node so replay can recover the replacement input, and is
  * immediately preceded by a `compaction/prune` shadow-price event pricing the
  * shadowed node through the injected token meter, so pure consumers can
  * subtract it without per-node state.
  * @param session - session whose current surface is rewritten.
  * @returns landed replacements and aggregate Unicode-code-point savings.
  * @throws when the session rejects a replacement; replacements committed
  * earlier in the pass remain durable.
  */
  pruneSession(session) {
    const candidates = [];
    for (const seq of [...session.surface.nodes]) {
      const event = session.eventAt(seq);
      if (event?.type === "tool/result") candidates.push({
        seq,
        event
      });
    }
    const pruned = [];
    let charsRemoved = 0;
    for (const { seq, event } of candidates) {
      const original = session.deriveEventMessage(event);
      const content = this.pruneContent(original.content);
      if (content === null) continue;
      const charsBefore = this.measureContent(original.content);
      const charsAfter = this.measureContent(content);
      const message = freezeMessage({
        ...original,
        content
      });
      session.append("compaction/prune", {
        shadowedRange: {
          start: seq,
          end: seq
        },
        shadowedSeqs: [seq],
        shadowedTokenCount: this.ctx.tokenMeter.estimateMessage(original)
      });
      const replacement = session.append("tool/result", {
        ...event.data,
        message
      }, {
        surfaceOp: {
          op: "replace",
          startSeq: seq,
          endSeq: seq
        },
        sourceEventSeqs: [seq]
      });
      pruned.push({
        originalSeq: seq,
        replacementSeq: replacement.seq,
        callId: event.data.message.source.callId,
        charsBefore,
        charsAfter
      });
      charsRemoved += charsBefore - charsAfter;
    }
    return {
      pruned,
      charsRemoved
    };
  }
};

// src/dsh/llm.ts
function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((block) => block?.type === "text").map((block) => String(block.text ?? "")).join("\n");
}
function dshToPiBlock(block) {
  switch (block.type) {
    case "text":
      return { type: "text", text: String(block.text ?? "") };
    case "reasoning":
      return { type: "thinking", thinking: String(block.text ?? "") };
    case "tool-call":
      return {
        type: "toolCall",
        id: String(block.id ?? ""),
        name: String(block.name ?? ""),
        arguments: safeJson(block.arguments)
      };
    case "image":
      return { type: "image", data: block.data, mimeType: block.mimeType };
    default:
      return void 0;
  }
}
function safeJson(value) {
  if (typeof value !== "string") return value ?? {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
function dshMessageToPi(message) {
  switch (message.role) {
    case "user":
      return { role: "user", content: (message.content ?? []).map(dshToPiBlock).filter(Boolean) };
    case "assistant":
      return { role: "assistant", content: (message.content ?? []).map(dshToPiBlock).filter(Boolean) };
    case "tool": {
      const text = textOf(message.content);
      return {
        role: "toolResult",
        toolCallId: String(message.toolCallId ?? message.source?.callId ?? ""),
        toolName: "",
        content: text ? [{ type: "text", text }] : [],
        isError: message.isError === true
      };
    }
    default:
      return void 0;
  }
}
function usageToDsh(usage) {
  if (!usage) return void 0;
  return {
    inputTokens: Number(usage.input ?? usage.inputTokens ?? 0),
    outputTokens: Number(usage.output ?? usage.outputTokens ?? 0),
    cacheReadTokens: Number(usage.cacheRead ?? usage.cacheReadTokens ?? 0),
    cacheWriteTokens: Number(usage.cacheWrite ?? usage.cacheWriteTokens ?? 0),
    reasoningTokens: Number(usage.reasoning ?? 0),
    totalTokens: Number(usage.totalTokens ?? 0)
  };
}
function createLlm(host) {
  return {
    async *stream(options) {
      const model = host.findModel(options.provider, options.model) ?? host.model();
      if (!model) throw new Error("dsh-pi: no pi model available for summarization");
      const messages = [];
      let systemPrompt = "";
      for (const message of options.messages ?? []) {
        if (message.role === "system") {
          systemPrompt += `${textOf(message.content)}
`;
          continue;
        }
        const mapped = dshMessageToPi(message);
        if (mapped) messages.push(mapped);
      }
      const tools = Array.isArray(options.tools) ? options.tools.map((tool) => ({ name: tool.name, description: tool.description, parameters: tool.parameters })) : void 0;
      let response;
      try {
        response = await host.complete(
          model,
          {
            systemPrompt: systemPrompt.trim() || host.systemPrompt(),
            messages,
            ...tools && tools.length > 0 ? { tools } : {}
          },
          {
            maxTokens: options.maxTokens,
            signal: options.signal,
            sessionId: options.sessionId,
            cacheRetention: "short"
          }
        );
      } catch (error) {
        throw error;
      }
      if (response?.stopReason === "error" || response?.stopReason === "aborted") {
        throw new Error(response.errorMessage ?? `dsh-pi: summarization stopped: ${response.stopReason}`);
      }
      const text = Array.isArray(response?.content) ? response.content.filter((block) => block?.type === "text").map((block) => String(block.text ?? "")).join("") : "";
      if (!text.trim()) throw new Error("dsh-pi: summarization produced no text");
      yield { type: "block-start", index: 0, blockType: "text" };
      yield { type: "text-delta", index: 0, text };
      yield { type: "block-end", index: 0, block: { type: "text", text } };
      const usage = usageToDsh(response?.usage);
      if (usage) yield { type: "usage", usage };
      yield {
        type: "finish",
        reason: response?.stopReason === "length" ? { kind: "max-tokens" } : { kind: "stop" }
      };
    },
    async resolveModelInfo(provider, modelId) {
      const model = host.findModel(provider, modelId) ?? host.model();
      return {
        context: model?.contextWindow ? { contextWindow: model.contextWindow } : void 0,
        defaultMaxTokens: model?.maxTokens
      };
    }
  };
}

// src/dsh/meter.ts
function estimateMessage(message) {
  if (!message) return 0;
  const text = JSON.stringify(message);
  return Math.max(1, Math.ceil(text.length / 4));
}
function measure(session) {
  const nodes = session.surface.nodes.map((seq) => {
    const event = session.eventAt(seq);
    const message = event ? session.deriveEventMessage(event) : void 0;
    const tokens = estimateMessage(message);
    return { seq, tokens, heuristicTokens: tokens };
  });
  return {
    nodes,
    totalTokens: nodes.reduce((sum, node) => sum + node.tokens, 0)
  };
}
var meter = { measure, estimateMessage };

// ../../zrepo/deepseek-harness/packages/compaction/compaction/lib/index.js
var balanceCacheBySession2 = /* @__PURE__ */ new WeakMap();
function eventDelta2(event) {
  switch (event.type) {
    case "assistant/message":
      return event.data.message.content.filter((block) => block.type === "tool-call").length;
    case "tool/result":
      return -1;
    default:
      return 0;
  }
}
function extendCache2(session, cache, seqs) {
  const processed = cache.cutBalanced.length - 1;
  const tail = seqs.slice(processed);
  const pendingCuts = [];
  let inProgressToolCalls = cache.inProgressToolCalls;
  for (const seq of tail) {
    const event = session.eventAt(seq);
    if (event === void 0 || event.seq !== seq) throw new Error(`tool-pairing balance: surface seq ${seq} has no matching session event (corrupt surface)`);
    inProgressToolCalls += eventDelta2(event);
    if (inProgressToolCalls < 0) throw new Error(`tool-pairing balance: tool/result at surface seq ${seq} has no matching tool-call (corrupt surface)`);
    pendingCuts.push(inProgressToolCalls === 0);
  }
  tail.forEach((seq, offset) => cache.indexBySeq.set(seq, processed + offset));
  cache.cutBalanced = cache.cutBalanced.concat(pendingCuts);
  cache.inProgressToolCalls = inProgressToolCalls;
  return cache;
}
function balanceCache2(session) {
  const surface = session.surface;
  const seqs = surface.nodes;
  const generation = surface.replaceGeneration;
  const cached = balanceCacheBySession2.get(session);
  if (cached === void 0 || cached.generation !== generation || cached.cutBalanced.length - 1 > seqs.length) {
    const rebuilt = extendCache2(session, {
      generation,
      cutBalanced: [true],
      indexBySeq: /* @__PURE__ */ new Map(),
      inProgressToolCalls: 0
    }, seqs);
    balanceCacheBySession2.set(session, rebuilt);
    return rebuilt;
  }
  if (cached.cutBalanced.length - 1 < seqs.length) return extendCache2(session, cached, seqs);
  return cached;
}
function cutBalance2(cache, seq, offset) {
  const index = cache.indexBySeq.get(seq);
  const balanced = index === void 0 ? void 0 : cache.cutBalanced[index + offset];
  if (balanced === void 0) throw new Error(`tool-pairing balance: surface seq ${seq} not found`);
  return balanced;
}
function toolPairingBalancedBefore2(session, seq) {
  return cutBalance2(balanceCache2(session), seq, 0);
}
var COMPACT_CHECKPOINT_MARKER2 = Object.freeze({ kind: "compact-checkpoint" });

// src/dsh/range.ts
function isSystemHead(session, seq) {
  return session.eventAt(seq)?.type === "system/message";
}
function selectCompactableRange2(session, measurement, retainTokens) {
  const priced = measurement.nodes;
  if (priced.length === 0) return void 0;
  const surface = session.surface.nodes;
  if (surface.length !== priced.length || surface.some((seq, i) => seq !== priced[i]?.seq)) {
    throw new Error("dsh-pi: token measurement does not match the current surface");
  }
  const firstIdx = isSystemHead(session, surface[0]) ? 1 : 0;
  let accumulated = 0;
  let keepFromIdx = priced.length;
  for (let index = priced.length - 1; index >= 0; index -= 1) {
    accumulated += priced[index].tokens;
    keepFromIdx = index;
    if (accumulated >= retainTokens) break;
  }
  if (keepFromIdx <= firstIdx) return void 0;
  while (keepFromIdx > firstIdx) {
    if (toolPairingBalancedBefore2(session, surface[keepFromIdx])) break;
    keepFromIdx -= 1;
  }
  if (keepFromIdx <= firstIdx) return void 0;
  return { start: surface[firstIdx], end: surface[keepFromIdx - 1] };
}

// src/dsh/engine.ts
function createEngine(host) {
  const ctx = new Context();
  ctx.provide("llm", createLlm(host));
  ctx.provide("tokenMeter", meter);
  ctx.provide("sessions", { flush: async () => {
  } });
  const pruner = new ToolResultPruner(ctx);
  const modelMax = Number(host.model()?.maxTokens ?? 8192);
  const maxTokens = Math.max(1024, Math.min(65536, Number.isFinite(modelMax) && modelMax > 0 ? modelMax : 8192));
  const engine = new BasicCompactionEngine(ctx, {
    auto: false,
    thresholdRatio: 0.8,
    headroomTokens: 65536,
    retainRatio: 0.16,
    maxTokens,
    compactionRetries: 1,
    maxOverflowRetries: 1
  });
  return { ctx, engine, pruner };
}
function budget(host) {
  const model = host.model();
  const contextWindow = Number(model?.contextWindow ?? 0);
  if (!contextWindow) return void 0;
  const output = Number(model?.maxTokens ?? 8192);
  const headroom = 65536;
  const byRatio = Math.floor(contextWindow * 0.8);
  const byHeadroom = contextWindow - output - headroom;
  const threshold = byHeadroom > 0 ? Math.min(byRatio, byHeadroom) : byRatio;
  const retain = Math.max(0, Math.floor(0.16 * (contextWindow - output)));
  return { contextWindow, threshold, retain };
}
async function compactIfNeeded(engine, session, host, signal, force = false, pruner) {
  const limits = budget(host);
  if (!limits) return void 0;
  let before = meter.measure(session).totalTokens;
  const emergency = limits.contextWindow > 0 && before > Math.floor(limits.contextWindow * 0.95);
  if (!force && !emergency && before < limits.threshold) return void 0;
  if (pruner && (force || emergency || before >= limits.threshold)) {
    pruner.pruneSession(session);
    before = meter.measure(session).totalTokens;
    if (!force && !emergency && before < limits.threshold) return void 0;
  }
  const range = selectCompactableRange2(session, meter.measure(session), force || emergency ? 0 : limits.retain);
  if (!range) return void 0;
  const model = host.model();
  const agent = {
    session,
    options: { provider: model?.provider, model: model?.id },
    runMaintenance: async (task) => task(new AbortController().signal)
  };
  const result = await engine.compactRegion(range.start, range.end, agent, signal);
  return { result, before, after: meter.measure(session).totalTokens };
}

// src/dsh/messages.ts
function piContentToDsh(content) {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (!Array.isArray(content)) return [{ type: "text", text: String(content ?? "") }];
  const out = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    switch (block.type) {
      case "text":
        out.push({ type: "text", text: block.text });
        break;
      case "thinking":
        out.push({ type: "reasoning", text: block.thinking });
        break;
      case "toolCall":
        out.push({
          type: "tool-call",
          id: block.id,
          name: block.name,
          arguments: typeof block.arguments === "string" ? block.arguments : JSON.stringify(block.arguments ?? {})
        });
        break;
      case "image":
        out.push({ type: "image", data: block.data, mimeType: block.mimeType });
        break;
      default:
        break;
    }
  }
  return out;
}
function dshContentToPi(content) {
  const out = [];
  for (const block of content ?? []) {
    if (!block || typeof block !== "object") continue;
    switch (block.type) {
      case "text":
        out.push({ type: "text", text: String(block.text ?? "") });
        break;
      case "reasoning":
        out.push({ type: "thinking", thinking: String(block.text ?? "") });
        break;
      case "tool-call": {
        let args = {};
        try {
          args = JSON.parse(String(block.arguments ?? "{}"));
        } catch {
          args = {};
        }
        out.push({ type: "toolCall", id: String(block.id ?? ""), name: String(block.name ?? ""), arguments: args });
        break;
      }
      case "image":
        if (typeof block.data === "string" && typeof block.mimeType === "string") {
          out.push({ type: "image", data: block.data, mimeType: block.mimeType });
        }
        break;
      default:
        break;
    }
  }
  return out;
}
function dshMessageToPi2(message, time, toolNames) {
  switch (message.role) {
    case "system":
      return void 0;
    // pi replays its own prompt/tools
    case "user":
      return { role: "user", content: dshContentToPi(message.content), timestamp: time };
    case "assistant":
      return {
        role: "assistant",
        content: dshContentToPi(message.content),
        // pi's getContextUsage() calls calculateContextTokens(message.usage)
        // for every non-aborted/error assistant; a missing usage would crash it.
        api: "dsh",
        provider: String(message.source?.provider ?? "dsh"),
        model: String(message.source?.model ?? "dsh"),
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
        },
        stopReason: "stop",
        timestamp: time
      };
    case "tool": {
      const text = (message.content ?? []).filter((b) => b.type === "text").map((b) => String(b.text ?? "")).join("\n");
      return {
        role: "toolResult",
        toolCallId: String(message.toolCallId ?? message.source?.callId ?? ""),
        toolName: toolNames?.get(String(message.toolCallId ?? message.source?.callId ?? "")) ?? "",
        content: text ? [{ type: "text", text }] : [],
        isError: message.isError === true,
        timestamp: time
      };
    }
    default:
      return void 0;
  }
}

// src/dsh/projection.ts
function projectSurface(session) {
  const toolNames = /* @__PURE__ */ new Map();
  for (const seq of session.surface.nodes) {
    const event = session.eventAt(seq);
    const message = event ? session.deriveEventMessage(event) : void 0;
    if (message?.role !== "assistant") continue;
    for (const block of message.content ?? []) {
      if (block?.type === "tool-call" && block.id) toolNames.set(String(block.id), String(block.name ?? ""));
    }
  }
  const out = [];
  for (const seq of session.surface.nodes) {
    const event = session.eventAt(seq);
    if (!event) continue;
    const message = session.deriveEventMessage(event);
    if (!message) continue;
    const mapped = dshMessageToPi2(message, event.time, toolNames);
    if (mapped) out.push(mapped);
  }
  return out;
}

// src/dsh/sync.ts
function createSyncState() {
  return {
    turn: 1,
    step: 0,
    turnStarted: false,
    systemSeq: void 0,
    stepOpen: false,
    seen: /* @__PURE__ */ new Set(),
    toolCalls: /* @__PURE__ */ new Map(),
    appended: 0
  };
}
function append(session, type, data, options) {
  return session.append(type, data, options);
}
function ensureTurn(session, state) {
  if (state.turnStarted) return;
  append(session, "turn/start", { turn: state.turn });
  state.turnStarted = true;
}
function appendSystem(session, state, entry, message, systemPrompt) {
  if (state.systemSeq !== void 0) return;
  ensureTurn(session, state);
  let content = piContentToDsh(
    systemPrompt && systemPrompt.trim().length > 0 ? systemPrompt : typeof message.content === "string" ? message.content : []
  );
  if (!content.some((block) => block.type === "text" && String(block.text ?? "").trim().length > 0)) {
    const sections = message.sections;
    if (sections && typeof sections === "object") {
      const text = Object.values(sections).filter((value) => typeof value === "string" && value.trim()).join("\n\n");
      if (text) content = [{ type: "text", text }];
    }
  }
  const event = append(
    session,
    "system/message",
    {
      turn: state.turn,
      step: Math.max(state.step, 1),
      message: {
        role: "system",
        id: entry.id,
        source: { kind: "system-prompt" },
        content
      }
    },
    { surfaceOp: "append" }
  );
  state.systemSeq = event.seq;
}
function appendUser(session, state, entry, message) {
  ensureTurn(session, state);
  if (state.stepOpen) {
    append(session, "step/end", { turn: state.turn, step: state.step });
    state.stepOpen = false;
  }
  append(
    session,
    "user/message",
    {
      role: "user",
      id: entry.id,
      source: { kind: "user" },
      content: piContentToDsh(message.content)
    },
    { surfaceOp: "append" }
  );
}
function appendAssistant(session, state, entry, message) {
  ensureTurn(session, state);
  if (state.stepOpen) {
    append(session, "step/end", { turn: state.turn, step: state.step });
    state.stepOpen = false;
  }
  state.step += 1;
  append(session, "step/start", { turn: state.turn, step: state.step });
  state.stepOpen = true;
  const content = piContentToDsh(message.content);
  append(
    session,
    "assistant/message",
    {
      turn: state.turn,
      step: state.step,
      message: {
        role: "assistant",
        id: entry.id,
        source: {
          kind: "model",
          provider: String(message.provider ?? "pi"),
          model: String(message.model ?? "pi")
        },
        content
      },
      stream: []
    },
    { surfaceOp: "append" }
  );
  for (const block of content) {
    if (block.type !== "tool-call") continue;
    const callId = String(block.id ?? "");
    if (!callId) continue;
    const call = append(session, "tool/call", {
      turn: state.turn,
      step: state.step,
      callId,
      name: String(block.name ?? ""),
      arguments: String(block.arguments ?? "{}")
    });
    state.toolCalls.set(callId, call.seq);
  }
}
function appendToolResult(session, state, entry, message) {
  ensureTurn(session, state);
  const toolCallId = String(message.toolCallId ?? "");
  let callSeq = state.toolCalls.get(toolCallId);
  if (callSeq === void 0) {
    const call = append(session, "tool/call", {
      turn: state.turn,
      step: Math.max(state.step, 1),
      callId: toolCallId,
      name: String(message.toolName ?? ""),
      arguments: "{}"
    });
    callSeq = call.seq;
    state.toolCalls.set(toolCallId, callSeq);
  }
  const content = piContentToDsh(message.content ?? []);
  append(
    session,
    "tool/result",
    {
      turn: state.turn,
      step: Math.max(state.step, 1),
      message: {
        role: "tool",
        id: entry.id,
        source: { kind: "tool", callId: toolCallId },
        toolCallId,
        content,
        isError: message.isError === true
      }
    },
    { surfaceOp: "append", sourceEventSeqs: [callSeq] }
  );
}
function syncPiEntries(session, entries, state, options = {}) {
  let count = 0;
  for (const entry of entries) {
    if (entry?.type !== "message" || !entry.message) continue;
    const id = String(entry.id ?? "");
    if (id && state.seen.has(id)) continue;
    const message = entry.message;
    switch (message.role) {
      case "system":
        appendSystem(session, state, entry, message, options.systemPrompt);
        break;
      case "user":
        appendUser(session, state, entry, message);
        break;
      case "assistant":
        appendAssistant(session, state, entry, message);
        break;
      case "toolResult":
        appendToolResult(session, state, entry, message);
        break;
      default:
        break;
    }
    if (id) state.seen.add(id);
    count += 1;
    state.appended += 1;
  }
  return count;
}
function closeTurn(session, state) {
  if (state.stepOpen) {
    append(session, "step/end", { turn: state.turn, step: state.step });
    state.stepOpen = false;
  }
  if (state.turnStarted) {
    append(session, "turn/end", { turn: state.turn, reason: { kind: "completed" } });
    state.turnStarted = false;
    state.turn += 1;
  }
}
function nextTurn(session) {
  let max = 0;
  for (const event of session.snapshotEvents()) {
    if (event.type === "turn/start") max = Math.max(max, Number(event.data?.turn ?? 0));
  }
  return max + 1;
}

// src/dsh/store.ts
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";

// ../../zrepo/deepseek-harness/packages/core/session/lib/index.js
import { isAbsolute as isAbsolute2 } from "node:path";
function SessionSeq2(value) {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new TypeError(`SessionSeq must be a non-negative safe integer, got ${String(value)}`);
  return brandNumber(value);
}
function SessionLogOffset2(value) {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new TypeError(`SessionLogOffset must be a non-negative safe integer, got ${String(value)}`);
  return brandNumber(value);
}
var KNOWN_SESSION_EVENT_TYPES2 = /* @__PURE__ */ new Set([
  "agent-preset/selected",
  "agent/inbox/spliced",
  "approval/asked",
  "approval/decided",
  "approval/policy",
  "assistant/attempt",
  "assistant/message",
  "command/done",
  "command/run",
  "compaction/end",
  "compaction/prune",
  "compaction/start",
  "compaction/summary",
  "deliverables/presented",
  "developer/message",
  "feedback/message-delete",
  "feedback/message-put",
  "feedback/record",
  "goal/change",
  "hook/invoked",
  "hook/result",
  "image/offload",
  "job/registered",
  "job/settled",
  "llm/retry",
  "llm/retry-started",
  "model/selection",
  "permission/preset",
  "plan/mode",
  "request/context",
  "request/header",
  "sandbox/mode",
  "schedule/change",
  "session-log-deepseek/delivery-accepted",
  "session/end-seed",
  "session/title",
  "session/title-llm-request",
  "step/end",
  "step/start",
  "subagent/catalog",
  "subagent/descriptor",
  "subagent/model-selection-policy",
  "system/message",
  "team/member",
  "team/message/delivered",
  "team/message/queued",
  "team/mode",
  "team/task",
  "todo/write",
  "tool-workflow/agent-end",
  "tool-workflow/agent-start",
  "tool-workflow/run-end",
  "tool-workflow/run-start",
  "tool/call",
  "tool/ptc-dispatch",
  "tool/ptc-dispatch-start",
  "tool/result",
  "turn/end",
  "turn/start",
  "user/message",
  "web/deepseek-search-llm-request",
  "working-directory/change",
  "workspace/changes"
]);
var MESSAGE_PROJECTION_EVENT_TYPES2 = /* @__PURE__ */ new Set(["image/offload"]);
var SURFACE_EVENT_TYPES2 = /* @__PURE__ */ new Set([
  "system/message",
  "developer/message",
  "user/message",
  "assistant/message",
  "tool/result"
]);
function isSurfaceEligibleType2(type) {
  return SURFACE_EVENT_TYPES2.has(type);
}
function deriveEventMessage2(event, projectedMessages) {
  const projected = projectedMessages?.get(event.seq);
  if (projected !== void 0) return projected;
  switch (event.type) {
    case "user/message":
      return event.data;
    case "system/message":
    case "developer/message":
    case "assistant/message":
      if (event.data.message.content.length === 0) return null;
      return event.data.message;
    case "tool/result":
      return event.data.message;
    default:
      return null;
  }
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateSessionEventData2(event, subject) {
  const data = event.data;
  if (SURFACE_EVENT_TYPES2.has(event.type) && isRecord2(data)) {
    const message = event.type === "user/message" ? data : data["message"];
    if (isRecord2(message)) {
      if (event.type === "developer/message" !== (message["role"] === "developer")) throw new Error(`${subject} developer/message and developer role must occur together`);
      if (message["role"] !== "developer" && Array.isArray(message["content"]) && message["content"].some((block) => isRecord2(block) && (block["type"] === "tool-addition" || block["type"] === "tool-removal"))) throw new Error(`${subject} tool-change blocks require developer role`);
      if (event.type === "developer/message" && Array.isArray(message["content"])) {
        let hasAdditions = false;
        for (const block of message["content"]) {
          if (!isRecord2(block) || block["type"] !== "tool-addition" && block["type"] !== "tool-removal") continue;
          if (typeof block["toolName"] !== "string" || block["toolName"].length === 0) throw new Error(`${subject} ${block["type"]} requires a nonempty toolName`);
          if (block["type"] === "tool-addition") {
            hasAdditions = true;
            if (Object.hasOwn(block, "tool")) throw new Error(`${subject} tool-addition must omit inline tool definitions`);
          }
        }
        if (hasAdditions ? !isEventSeq2(data["headerSeq"]) : Object.hasOwn(data, "headerSeq")) throw new Error(`${subject} requires headerSeq exactly when tool additions are present`);
      }
    }
  }
  if (event.type === "request/header") {
    if (!isRecord2(data)) throw new Error(`${subject} data must be an object`);
    const header = data["header"];
    if (!isRecord2(header)) throw new Error(`${subject} header must be an object`);
    if (Object.hasOwn(header, "system")) throw new Error(`${subject} must omit header.system; use system/message`);
    if (Array.isArray(header["tools"]) && header["tools"].length === 0) throw new Error(`${subject} must omit empty tools`);
    const defaults = header["adapterDefaults"];
    if (isRecord2(defaults) && Object.keys(defaults).length === 0) throw new Error(`${subject} must omit empty adapterDefaults`);
  } else if (event.type === "tool/result") {
    if (!isRecord2(data)) throw new Error(`${subject} data must be an object`);
    if (data["error"] === void 0) return;
    const message = data["message"];
    if (!isRecord2(message) || message["isError"] !== true) throw new Error(`${subject} error requires message.isError === true`);
  }
}
function createFoldState2() {
  return {
    nodes: [],
    replaceGeneration: 0,
    contentGeneration: 0,
    projectedMessages: /* @__PURE__ */ new Map(),
    projections: /* @__PURE__ */ new Set()
  };
}
function isEventSeq2(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
}
function isReplaceOp2(value) {
  const op = value;
  return Object.keys(op).length === 3 && Object.hasOwn(op, "op") && Object.hasOwn(op, "startSeq") && Object.hasOwn(op, "endSeq") && op["op"] === "replace" && isEventSeq2(op["startSeq"]) && isEventSeq2(op["endSeq"]);
}
function surfaceOpOf2(event) {
  const raw = event;
  if (!isSurfaceEligibleType2(event.type)) {
    if (!KNOWN_SESSION_EVENT_TYPES2.has(event.type) && event.ignorable === true) return;
    if (raw.surfaceOp !== void 0) throw new Error(`session event "${event.type}" is not surface-eligible and cannot carry surfaceOp`);
    if (raw.sourceEventSeqs !== void 0) throw new Error(`session event "${event.type}" is not surface-eligible and cannot carry sourceEventSeqs`);
    return;
  }
  const op = raw.surfaceOp;
  if (op === void 0) throw new Error(`session event "${event.type}" is surface-eligible and requires a surfaceOp marker`);
  if (op === "append") return op;
  if (op === null || typeof op !== "object" || Array.isArray(op)) throw new Error(`session event "${event.type}" carries an invalid surfaceOp`);
  if (!isReplaceOp2(op)) throw new Error(`session event "${event.type}" carries an invalid replace surfaceOp`);
  return op;
}
function assertSourceEventReferences2(event, shadowedSeqs) {
  const raw = event.sourceEventSeqs;
  if (event.type === "assistant/message" && raw !== void 0) throw new Error("assistant/message embeds its source stream and cannot carry sourceEventSeqs");
  const sources = /* @__PURE__ */ new Set();
  if (raw !== void 0) {
    if (!Array.isArray(raw)) throw new Error(`sourceEventSeqs on event at seq ${event.seq} must be an array when present`);
    if (raw.length === 0) throw new Error("sourceEventSeqs must not be empty");
    let nonEarlierSource;
    for (const source of raw) {
      if (!isEventSeq2(source)) throw new Error(`session event "${event.type}" sourceEventSeqs must densely contain non-negative safe integers`);
      sources.add(source);
      if (nonEarlierSource === void 0 && source >= event.seq) nonEarlierSource = source;
    }
    if (sources.size !== raw.length) throw new Error("sourceEventSeqs must not contain duplicates");
    if (nonEarlierSource !== void 0) throw new Error(`sourceEventSeqs must reference earlier events: ${nonEarlierSource} >= current seq ${event.seq}`);
  }
  const missing = shadowedSeqs.filter((seq) => !sources.has(seq));
  if (missing.length > 0) throw new Error(`surface replace: sourceEventSeqs must include every shadowed surface node; missing ${missing.join(", ")}`);
}
function assertDeveloperHeader2(event, events, baseSeq) {
  if (event.type !== "developer/message") return;
  validateSessionEventData2(event, `developer/message at seq ${event.seq}`);
  if (event.data.headerSeq === void 0) return;
  const headerSeq = event.data.headerSeq;
  const headerEvent = events[headerSeq - baseSeq];
  if (headerSeq >= event.seq || headerEvent?.type !== "request/header") throw new Error("developer/message headerSeq must reference an earlier request/header");
  for (const block of event.data.message.content) {
    if (block.type !== "tool-addition") continue;
    const definitions = headerEvent.data.header.tools?.filter((tool) => tool.name === block.toolName) ?? [];
    if (definitions.length !== 1) throw new Error(`developer/message tool-addition "${block.toolName}" must name exactly one tool in headerSeq ${headerSeq}`);
    const definition = definitions[0];
    if (typeof definition.description !== "string" || !isRecord2(definition.parameters)) throw new Error(`developer/message tool-addition "${block.toolName}" requires a complete tool definition in headerSeq ${headerSeq}`);
    if (Object.hasOwn(definition, "deferLoading") && definition.deferLoading !== true) throw new Error("developer/message referenced tool deferLoading must be true when present");
  }
}
function validateSurfaceMetadata2(event) {
  const op = surfaceOpOf2(event);
  if (op !== void 0 && op !== "append" && (op.startSeq >= event.seq || op.endSeq >= event.seq)) throw new Error(`surface replace at seq ${event.seq}: startSeq and endSeq must reference earlier events`);
  if (op !== void 0) assertSourceEventReferences2(event, []);
  return op;
}
function replacementRange2(state, op) {
  const startIdx = state.nodes.indexOf(op.startSeq);
  if (startIdx === -1) throw new Error(`surface replace: start seq ${op.startSeq} not found in surface`);
  const endIdx = state.nodes.indexOf(op.endSeq);
  if (endIdx === -1) throw new Error(`surface replace: end seq ${op.endSeq} not found in surface`);
  if (startIdx > endIdx) throw new Error(`surface replace: start seq ${op.startSeq} (index ${startIdx}) is after end seq ${op.endSeq} (index ${endIdx})`);
  return {
    startIdx,
    endIdx,
    shadowedSeqs: state.nodes.slice(startIdx, endIdx + 1)
  };
}
function isDeepEqualJson2(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => isDeepEqualJson2(item, b[i]));
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const aKeys = Object.keys(a);
  const bRecord = b;
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => Object.hasOwn(b, key) && isDeepEqualJson2(a[key], bRecord[key]));
}
function assertToolResultRewrite2(event, shadowedSeqs, events, baseSeq) {
  if (event.type !== "tool/result") return;
  if (shadowedSeqs.length !== 1) throw new Error("tool/result surface replacement must rewrite exactly one current node");
  for (const originalSeq of shadowedSeqs) {
    const original = events[originalSeq - baseSeq];
    if (original?.type !== "tool/result") throw new Error("tool/result surface replacement must target a current tool/result");
    const originalRest = { ...original.data };
    const replacementRest = { ...event.data };
    originalRest["message"] = {
      ...original.data.message,
      content: null
    };
    replacementRest["message"] = {
      ...event.data.message,
      content: null
    };
    if (!isDeepEqualJson2(originalRest, replacementRest)) throw new Error("tool/result surface replacement may change only content");
  }
}
function assertSystemHeadRewrite2(event, state, startIdx, shadowedSeqs, events, baseSeq) {
  if (startIdx !== 0) return;
  if (events[state.nodes[0] - baseSeq]?.type !== "system/message") return;
  if (event.type !== "system/message" || shadowedSeqs.length !== 1) throw new Error("surface replace: node 0 holds the system prompt and may be rewritten only by a system/message over exactly that node");
}
function planSurfaceEvent2(state, event, expectedSeq, events, baseSeq, projections) {
  if (event.seq !== expectedSeq) throw new Error(`session event seq ${event.seq} is not contiguous; expected ${expectedSeq}`);
  const surfaceOp = validateSurfaceMetadata2(event);
  assertDeveloperHeader2(event, events, baseSeq);
  const projection = projections.find((item) => item.type === event.type);
  if (projection !== void 0) return {
    kind: "project",
    projection,
    messages: projection.project(event, {
      nodes: state.nodes,
      events,
      baseSeq,
      messages: state.projectedMessages
    })
  };
  if (MESSAGE_PROJECTION_EVENT_TYPES2.has(event.type)) throw new Error(`session event "${event.type}" requires a message projection; load its owning plugin or supply its projection definition`);
  if (surfaceOp === void 0) return;
  if (surfaceOp === "append") return {
    kind: "append",
    seq: event.seq
  };
  const range = replacementRange2(state, surfaceOp);
  assertSourceEventReferences2(event, range.shadowedSeqs);
  assertToolResultRewrite2(event, range.shadowedSeqs, events, baseSeq);
  assertSystemHeadRewrite2(event, state, range.startIdx, range.shadowedSeqs, events, baseSeq);
  return {
    kind: "replace",
    seq: event.seq,
    start: surfaceOp.startSeq,
    end: surfaceOp.endSeq,
    ...range
  };
}
function applySurfaceEvent2(state, event, expectedSeq, events, baseSeq, projections) {
  return applySurfacePlan2(state, planSurfaceEvent2(state, event, expectedSeq, events, baseSeq, projections));
}
function applySurfacePlan2(state, plan) {
  if (plan?.kind === "append") state.nodes.push(plan.seq);
  else if (plan?.kind === "replace") {
    state.nodes.splice(plan.startIdx, plan.endIdx - plan.startIdx + 1, plan.seq);
    state.replaceGeneration += 1;
    state.contentGeneration += 1;
  } else if (plan?.kind === "project") {
    for (const [seq, message] of plan.messages) state.projectedMessages.set(seq, message);
    state.projections.add(plan.projection);
    state.contentGeneration += 1;
  }
  if (plan?.kind !== "replace") return;
  return {
    seq: plan.seq,
    start: plan.start,
    end: plan.end,
    shadowedSeqs: plan.shadowedSeqs
  };
}
var SurfaceManager2 = class {
  log;
  baseSeq;
  projections;
  /** Shared transition state; replacement history is not retained. */
  _state = createFoldState2();
  /** Last processed absolute seq. */
  _lastProcessedSeq;
  /** Candidate already validated by `validateNext`, pending exact log admission. */
  _pendingPlan;
  /**
  * @param log - Contiguous complete log or loaded event window.
  * @param baseSeq - Absolute sequence of the window's first event.
  * @param projections - live borrowed definitions; removing a used definition invalidates further reads.
  */
  constructor(log, baseSeq = SessionLogOffset2(0), projections = []) {
    this.log = log;
    this.baseSeq = baseSeq;
    this.projections = projections;
    this._lastProcessedSeq = baseSeq === 0 ? -1 : SessionSeq2(baseSeq - 1);
  }
  /**
  * Validate the next candidate without mutating the committed surface.
  * @param event - candidate event that has not entered the log yet.
  */
  validateNext(event) {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    const expectedSeq = SessionSeq2(this.baseSeq + this.log.length);
    this._pendingPlan = {
      event,
      expectedSeq,
      plan: planSurfaceEvent2(this._state, event, expectedSeq, this.log, this.baseSeq, this.projections)
    };
  }
  /** Monotonic count of folded positional replacements. */
  get replaceGeneration() {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return this._state.replaceGeneration;
  }
  /** Monotonic count of committed changes to existing model-visible content. */
  get contentGeneration() {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return this._state.contentGeneration;
  }
  /**
  * Project one message with every committed message projection applied.
  * @param event - message-producing or log-only event.
  * @returns its immutable projected message, or null when it produces none.
  */
  deriveEventMessage(event) {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return deriveEventMessage2(event, this._state.projectedMessages);
  }
  /** Surface event sequences in model-visible order. */
  get nodes() {
    this._assertProjections();
    if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
    return this._state.nodes;
  }
  /** Fold events appended since the previous access. */
  _processDelta() {
    const tailSeq = this.baseSeq + this.log.length - 1;
    for (let seq = this._lastProcessedSeq + 1; seq <= tailSeq; seq++) {
      const index = seq - this.baseSeq;
      const event = this.log[index];
      const pending = this._pendingPlan;
      if (pending?.event === event && pending.expectedSeq === seq) applySurfacePlan2(this._state, pending.plan);
      else applySurfaceEvent2(this._state, event, SessionSeq2(seq), this.log, this.baseSeq, this.projections);
      if (pending !== void 0 && pending.expectedSeq <= seq) this._pendingPlan = void 0;
      this._lastProcessedSeq = SessionSeq2(seq);
    }
  }
  /** Cached messages cannot outlive the definitions that interpreted their log. */
  _assertProjections() {
    const candidate = this._pendingPlan;
    const pending = candidate !== void 0 && this.log[candidate.expectedSeq - this.baseSeq] === candidate.event ? candidate.plan : void 0;
    const required = pending?.kind === "project" ? [...this._state.projections, pending.projection] : this._state.projections;
    for (const projection of required) if (!this.projections.includes(projection)) throw new Error(`session message projection "${projection.type}" was removed or replaced; restore the session with its owning plugin`);
  }
};
function canonicalHeader2(header) {
  const adapterDefaults = header.adapterDefaults;
  return {
    config: header.config,
    ...adapterDefaults?.reasoningEffort === true || adapterDefaults?.maxTokens === true ? { adapterDefaults } : {},
    ...header.tools !== void 0 && header.tools.length > 0 ? { tools: header.tools } : {}
  };
}
function foldRequestHeader2(events, from2) {
  let state = from2;
  for (const event of events) if (event.type === "request/header") state = canonicalHeader2(event.data.header);
  return state;
}
var ToolHistoryProjection2 = class {
  /** Historical declarations indexed by the header sequence referenced by additions. */
  headers = /* @__PURE__ */ new Map();
  /** Definitions retained in the current declaration series, including removed tools. */
  declared = /* @__PURE__ */ new Map();
  /** Active definitions from the latest request header. */
  active = [];
  /** Active names reconstructed from the baseline and recorded updates. */
  available = /* @__PURE__ */ new Set();
  /** Header that starts the current declaration series; absent before the first header. */
  baselineSeq;
  /** Immutable request snapshot of the current baseline and resolved updates. */
  history = deepFreeze({
    tools: [],
    updates: []
  });
  /**
  * Consume the next committed event in log order.
  * @param event - a session event, including inherited events during restoration.
  */
  apply(event) {
    if (event.type === "request/header") {
      const tools = event.data.header.tools ?? [];
      this.headers.set(event.seq, tools);
      const redeclared = tools.some((tool) => {
        const before = this.declared.get(tool.name);
        return before !== void 0 && JSON.stringify(before) !== JSON.stringify(tool);
      });
      if (this.baselineSeq === void 0 || event.data.reason === "series" || event.data.startsSeries || redeclared) {
        this.baselineSeq = event.seq;
        this.declared = new Map(tools.map((tool) => [tool.name, tool]));
        this.history = deepFreeze({
          tools,
          updates: []
        });
        this.available = new Set(tools.map((tool) => tool.name));
      }
      this.active = tools;
    } else if (event.type === "developer/message") {
      const { message, headerSeq } = event.data;
      const definitions = headerSeq === void 0 ? [] : this.headers.get(headerSeq);
      const additions = message.content.flatMap((block) => {
        if (block.type !== "tool-addition") return [];
        const tool = definitions?.find((tool2) => tool2.name === block.toolName);
        if (tool === void 0) throw new Error(`tool history: missing definition for ${block.toolName}`);
        return [tool];
      });
      for (const tool of additions) this.declared.set(tool.name, tool);
      for (const block of message.content) if (block.type === "tool-addition") this.available.add(block.toolName);
      else if (block.type === "tool-removal") this.available.delete(block.toolName);
      this.history = deepFreeze({
        tools: this.history.tools,
        updates: [...this.history.updates, {
          messageId: message.id,
          additions
        }]
      });
    }
  }
  /**
  * Read an immutable snapshot; subsequent events do not mutate it.
  * @returns initial declarations and historically resolved additions for the current series.
  */
  snapshot() {
    if (this.active.length !== this.available.size || this.active.some((tool) => !this.available.has(tool.name))) return deepFreeze({
      tools: this.active,
      updates: []
    });
    return this.history;
  }
};
function validateSessionHeader2(id, input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error("session header is not a plain JSON record");
  const record = input;
  if (Object.hasOwn(record, "seedLength")) throw new Error('session header has invalid field "seedLength"');
  if (record.version !== 4) throw new Error(`session header version must be 4, got ${String(record.version)}`);
  if (record.id !== id) throw new Error(`session header id "${String(record.id)}" does not match session id "${id}"`);
  if (typeof record.createdAt !== "number" || !Number.isSafeInteger(record.createdAt) || record.createdAt < 0) throw new Error("session header createdAt must be a non-negative safe integer");
  if (record.cwd !== void 0) {
    if (typeof record.cwd !== "string") throw new Error("session header cwd must be a string");
    if (!isAbsolute2(record.cwd)) throw new Error(`session header cwd must be an absolute path, got "${record.cwd}"`);
  }
  if (record.parentSession !== void 0 && typeof record.parentSession !== "string") throw new Error("session header parentSession must be a string");
  if (typeof record.isSeeded !== "boolean") throw new Error("session header isSeeded must be a boolean");
  if (record.origin !== void 0 && record.origin !== "subagent") throw new Error('session header origin must be "subagent"');
  if (record.delegationDepth !== void 0 && (typeof record.delegationDepth !== "number" || !Number.isSafeInteger(record.delegationDepth) || record.delegationDepth < 0)) throw new Error("session header delegationDepth must be a non-negative safe integer");
  if (record.agentPreset !== void 0 && typeof record.agentPreset !== "string") throw new Error("session header agentPreset must be a string");
  return deepFreeze(record);
}
function validateRestoredSessionHeader2(id, input) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const prototype = Reflect.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) throw new Error("session header is not a plain JSON record");
  }
  return validateSessionHeader2(id, input);
}
function snapshotSessionHeader2(id, source) {
  const snapshot2 = snapshotJsonValue(source === void 0 ? {
    version: 4,
    id,
    createdAt: Date.now(),
    isSeeded: false
  } : source);
  if (snapshot2 === void 0) throw new Error("session header is not losslessly JSON-serializable");
  return validateSessionHeader2(id, snapshot2);
}
function assertSessionEventEnvelope2(value, index) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`seed event at index ${index} has an invalid event envelope`);
  const event = value;
  for (const key in event) switch (key) {
    case "type":
    case "seq":
    case "time":
    case "data":
    case "surfaceOp":
    case "sourceEventSeqs":
    case "ignorable":
      break;
    default:
      throw new Error(`seed event at index ${index} has an invalid event envelope`);
  }
  const type = event["type"];
  const seq = event["seq"];
  const time = event["time"];
  if (typeof type !== "string" || typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0 || Object.is(seq, -0) || typeof time !== "number" || !Number.isSafeInteger(time) || event["data"] === void 0 || event["ignorable"] !== void 0 && event["ignorable"] !== true) throw new Error(`seed event at index ${index} has an invalid event envelope`);
  validateSessionEventData2(event, `seed ${type} at index ${index}`);
  switch (type) {
    case "request/header":
    case "developer/message":
    case "system/message":
    case "user/message":
    case "assistant/attempt":
    case "assistant/message":
    case "tool/result":
      assertCurrentLlmShape2(event, index);
      break;
  }
}
function assertCurrentLlmShape2(event, index) {
  const data = event["data"];
  const record = typeof data === "object" && data !== null ? data : void 0;
  if (event["type"] === "request/header") {
    const headerRecord = record?.["header"];
    const config = headerRecord["config"];
    if (!hasProviderModel2(config)) throw new Error(`seed request/header at index ${index} lacks provider/model`);
    const configRecord = config;
    const reasoningEffort = configRecord["reasoningEffort"];
    if (reasoningEffort !== void 0 && (typeof reasoningEffort !== "string" || reasoningEffort.length === 0)) throw new Error(`seed request/header at index ${index} has an invalid reasoningEffort`);
    assertAdapterDefaults2(headerRecord["adapterDefaults"], configRecord, index);
    const reason = record?.["reason"];
    if (reason !== "initial" && reason !== "resume" && reason !== "change" && reason !== "series") throw new Error(`seed request/header at index ${index} has an invalid reason`);
    if (record?.["startsSeries"] !== void 0 && record["startsSeries"] !== true) throw new Error(`seed request/header at index ${index} has an invalid startsSeries marker`);
  }
  const type = event["type"];
  if (type === "assistant/attempt") {
    assertAssistantSettlementShape2(record, type, index);
    return;
  }
  if (!isMessageEventType2(type)) return;
  assertMessageEventShape2(event, `seed ${type} at index ${index}`);
  if (type === "assistant/message") assertAssistantSettlementShape2(record, type, index);
}
function assertAssistantSettlementShape2(data, type, index) {
  const turn = data?.["turn"];
  const step = data?.["step"];
  if (typeof turn !== "number" || !Number.isSafeInteger(turn) || turn < 0 || Object.is(turn, -0) || typeof step !== "number" || !Number.isSafeInteger(step) || step < 0 || Object.is(step, -0) || !Array.isArray(data?.["stream"])) throw new Error(`seed ${type} at index ${index} has invalid settlement fields`);
}
var allowedAdapterKeys2 = /* @__PURE__ */ new Set(["reasoningEffort", "maxTokens"]);
function assertAdapterDefaults2(value, config, index) {
  if (value === void 0) return;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`seed request/header at index ${index} has invalid adapterDefaults`);
  const defaults = value;
  if (Object.keys(defaults).some((key) => !allowedAdapterKeys2.has(key)) || Object.values(defaults).some((marker) => marker !== true) || defaults["reasoningEffort"] === true && config["reasoningEffort"] === void 0 || defaults["maxTokens"] === true && config["maxTokens"] === void 0) throw new Error(`seed request/header at index ${index} has invalid adapterDefaults`);
}
function isMessageEventType2(type) {
  return type === "developer/message" || type === "system/message" || type === "user/message" || type === "assistant/message" || type === "tool/result";
}
var MESSAGE_ROLE_BY_TYPE2 = {
  "system/message": "system",
  "developer/message": "developer",
  "user/message": "user",
  "assistant/message": "assistant",
  "tool/result": "tool"
};
function assertMessageEventShape2(event, subject) {
  const type = event["type"];
  if (!isMessageEventType2(type)) return;
  const data = event["data"];
  const record = typeof data === "object" && data !== null ? data : void 0;
  const message = type === "user/message" ? record : record?.["message"];
  if (typeof message !== "object" || message === null || typeof message["id"] !== "string" || message["id"] === "") throw new Error(`${subject} lacks an identified message`);
  const messageRecord = message;
  const expectedRole = MESSAGE_ROLE_BY_TYPE2[type];
  if (messageRecord["role"] !== expectedRole) throw new Error(`${subject} message must have role "${expectedRole}"`);
  const source = messageRecord["source"];
  if (typeof source !== "object" || source === null || typeof source["kind"] !== "string" || source["kind"] === "") throw new Error(`${subject} message has invalid source`);
  if (!Array.isArray(messageRecord["content"])) throw new Error(`${subject} message has invalid content`);
  const sourceRecord = source;
  if (type === "system/message") {
    if (sourceRecord["kind"] !== "system-prompt") throw new Error(`${subject} message must have system-prompt source`);
    return;
  }
  if (type === "assistant/message") {
    if (sourceRecord["kind"] !== "model" || !hasProviderModel2(sourceRecord)) throw new Error(`${subject} message must have model source`);
    return;
  }
  if (type !== "tool/result") return;
  if (sourceRecord["kind"] !== "tool" || typeof sourceRecord["callId"] !== "string" || sourceRecord["callId"] === "") throw new Error(`${subject} message must have tool source`);
  if (messageRecord["toolCallId"] !== sourceRecord["callId"]) throw new Error(`${subject} message has mismatched tool call ids`);
}
function hasProviderModel2(value) {
  if (typeof value !== "object" || value === null) return false;
  const pair = value;
  return typeof pair["provider"] === "string" && pair["provider"].length > 0 && typeof pair["model"] === "string" && pair["model"].length > 0;
}
function collectSessionCallbacks2(ctx, args) {
  return [...ctx.events.dispatch("emit", args)];
}
function invokeContainedSessionObservers2(ctx, name, id, args, callbacks) {
  for (const callback of callbacks) try {
    const returned = callback(...args);
    Promise.resolve(returned).catch((error) => {
      ctx.logger.warn(`session "${id}": ${name} listener rejected: ${String(error)}`);
    });
  } catch (error) {
    ctx.logger.warn(`session "${id}": ${name} listener threw: ${String(error)}`);
  }
}
var attachments2 = /* @__PURE__ */ new WeakMap();
var PLUGIN_RECORD_TYPE2 = /^plugin:[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/u;
function isPluginRecordType2(type) {
  return PLUGIN_RECORD_TYPE2.test(type);
}
function assertPluginRecordEvent2(value) {
  const { type } = value;
  if (!isPluginRecordType2(type)) throw new Error(`plugin record type "${type}" must be "plugin:" followed by lowercase slash-separated segments`);
}
var commitPluginRecord2;
var Session2 = class Session3 {
  log = [];
  /** Single incremental owner of surface acceptance and projection state. */
  surfaceManager;
  /** The ordered surface over this session's event log. */
  get surface() {
    return this.surfaceManager;
  }
  /**
  * Detached, deep-frozen creation metadata (format version, cwd, lineage,
  * and whether fork history exists). Supplied by the store via `ctx.sessions.create()`. When a
  * `Session` is created without a store-owned header, a minimal header is
  * synthesized (stamped with the current {@link SESSION_FORMAT_VERSION}) so
  * `session.header` is always present. Kept out of the event log — it is a
  * storage concern, not replayable conversation state.
  */
  header;
  /** Number of leading events inherited from this Session's fork parent. */
  inheritedEventCount;
  /** The session identity, derived from its durable header's single copy. */
  get id() {
    return this.header.id;
  }
  /**
  * The constructor seed length (0 without one), before any marker appended
  * during construction. Seed events never publish on `session/event`. A
  * marker appended before the store attaches occupies this seq without
  * publishing either; otherwise this seq is available for the next append.
  *
  * This in-process offset is not persisted. A fork seed can already contain
  * the child's inherited marker and synthetic closers, so its child-owned
  * history starts at {@link inheritedEventCount}, before this offset. A
  * resumed Session's seed contains its full stored log, while its inherited
  * count keeps the durable fork cut. Consumers needing complete canonical
  * history start at seq 0.
  */
  firstLiveSeq;
  /**
  * First event produced for this object lifecycle. A new fork includes its
  * child-owned seed marker and closers; a restored Session starts after its
  * complete stored prefix. This in-process capture offset is not persisted.
  */
  firstLifecycleSeq;
  /**
  * Create a detached session by validating and snapshotting borrowed seed
  * events and storage metadata.
  * @param id - session identity.
  * @param seed - optional borrowed replay or fork events.
  * @param header - optional borrowed storage metadata.
  * @param inheritedEventCount - exact fork-inherited prefix length for a seeded header.
  * @param projections - pure interpreters for plugin-owned message changes.
  * @returns a detached session.
  * @throws when a seed event requires a missing message interpreter or fails validation.
  */
  static create(id, seed, header, inheritedEventCount, projections) {
    return new Session3(id, seed, header, "snapshot", inheritedEventCount, projections);
  }
  /**
  * Restore a detached session by adopting an independently owned or deeply frozen seed.
  * Runtime-required event fields, event envelopes, sequence continuity, surface
  * transitions, and header fields are validated without copying or freezing events.
  * Embedded Assistant streams remain opaque until a stream consumer or storage
  * verifier reads them.
  * @param id - restored session identity.
  * @param seed - independently owned or deeply frozen events.
  * @param header - independently owned storage metadata.
  * @param inheritedEventCount - exact fork-inherited prefix length decoded from storage.
  * @param eventState - aliasing state carried from the operation that produced the seed.
  * @param projections - pure interpreters for plugin-owned message changes.
  * @returns a restored detached session.
  * @throws when a seed event requires a missing message interpreter or fails validation.
  */
  static fromRestore(id, seed, header, inheritedEventCount, eventState, projections) {
    return new Session3(id, seed, header, eventState, inheritedEventCount, projections);
  }
  constructor(id, seed, header, mode = "snapshot", suppliedInheritedEventCount, projections = []) {
    this.surfaceManager = new SurfaceManager2(this.log, SessionLogOffset2(0), projections);
    const restoredHeader = mode === "snapshot" ? void 0 : validateRestoredSessionHeader2(id, header);
    if (seed !== void 0) for (const [index, source] of seed.entries()) {
      const snapshot2 = mode === "snapshot" ? snapshotJsonValue(source) : source;
      if (snapshot2 === void 0) throw new Error(`seed event at index ${index} is not losslessly JSON-serializable`);
      assertSessionEventEnvelope2(snapshot2, index);
      if (snapshot2.seq !== index) throw new Error(`seed event at index ${index} has seq ${snapshot2.seq} (expected ${index}); seed must be contiguous from 0`);
      try {
        this.surfaceManager.validateNext(snapshot2);
      } catch (error) {
        throw new Error(`invalid seed event at index ${index}: ${error instanceof Error ? error.message : "invalid surface metadata"}`);
      }
      this.log.push(mode === "snapshot" ? deepFreeze(snapshot2) : snapshot2);
    }
    this.firstLiveSeq = SessionLogOffset2(this.log.length);
    this.header = restoredHeader ?? snapshotSessionHeader2(id, header);
    if (this.header.isSeeded && seed === void 0) throw new Error("seeded session requires an explicit constructor seed");
    if (this.header.isSeeded && suppliedInheritedEventCount === void 0) throw new Error("seeded session requires an inherited event count");
    const inheritedEventCount = SessionLogOffset2(suppliedInheritedEventCount ?? 0);
    if (!this.header.isSeeded && inheritedEventCount !== 0) throw new Error("unseeded session inherited event count must be 0");
    if (inheritedEventCount > this.log.length) throw new Error("session inherited event count exceeds its event log");
    const seedMarker = this.log[inheritedEventCount];
    const markedSeed = seedMarker?.type === "session/end-seed" && seedMarker.data.inherited === true;
    if (mode === "snapshot" && this.header.isSeeded && inheritedEventCount !== this.log.length && !markedSeed) throw new Error("seeded session constructor seed must equal its inherited prefix or mark its inherited cut");
    if (markedSeed && this.log.slice(inheritedEventCount + 1).some((event) => event.type === "session/end-seed" && event.data.inherited === true)) throw new Error("session inherited event count must identify the final inherited marker");
    this.inheritedEventCount = inheritedEventCount;
    this.firstLifecycleSeq = mode === "snapshot" && this.header.isSeeded ? inheritedEventCount : this.firstLiveSeq;
    if (seed !== void 0 && mode === "snapshot" && this.header.isSeeded && !markedSeed) this.append("session/end-seed", { inherited: true });
    else if (seed !== void 0 && !(mode === "snapshot" && this.header.isSeeded) && this.log.at(-1)?.type !== "session/end-seed") this.append("session/end-seed", {});
  }
  /** Cached immutable full snapshot of the private append-only log. */
  eventsSnapshot;
  /**
  * Return the immutable event stored at one exact sequence number.
  * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
  * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
  * @param seq - event sequence number.
  * @returns the accepted event, or undefined when the log does not contain it.
  */
  eventAt(seq) {
    return this.log[seq];
  }
  /**
  * Materialize an immutable snapshot of a half-open event sequence range.
  * A full current snapshot is reused until the next append; every previously
  * returned snapshot remains stable after later appends.
  * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
  * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
  * @param fromSeq - non-negative inclusive sequence number; defaults to the log start.
  * @param toSeqExclusive - non-negative exclusive sequence number; defaults to the current end.
  * @returns a frozen array of the selected deeply frozen events.
  */
  snapshotEvents(fromSeq = SessionLogOffset2(0), toSeqExclusive = this.seq) {
    if (fromSeq === 0 && toSeqExclusive === this.log.length) {
      this.eventsSnapshot ??= Object.freeze([...this.log]);
      return this.eventsSnapshot;
    }
    return Object.freeze(this.log.slice(fromSeq, toSeqExclusive));
  }
  /**
  * Return this Session's events after its fork-inherited prefix.
  * @deprecated Existing logic may remain unmigrated for now, but new calls are prohibited.
  * See the [Agent Note](../../../../.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).
  * @returns a fresh array containing child-owned events in log order.
  */
  ownEvents() {
    return this.snapshotEvents(this.inheritedEventCount);
  }
  /**
  * Whether one existing event position is outside the fork-inherited prefix.
  * @param seq - event position in this Session.
  * @returns true when the event belongs to this Session rather than its parent.
  */
  isOwnSeq(seq) {
    return seq >= this.inheritedEventCount && seq < this.seq;
  }
  /** The next event's sequence number — always the log length (the `seq = log.length` contiguity contract). */
  get seq() {
    return SessionLogOffset2(this.log.length);
  }
  /**
  * Append one typed event to the log and synchronously notify observers via
  * the store-owned, module-private publication hooks. The hot path never blocks
  * on I/O — persistence plugins buffer asynchronously. Once the event enters
  * the log, the append is committed: observer failures are logged and
  * contained per listener, so they do not change the return value or prevent
  * later listeners from observing the same accepted event.
  * Independent Sessions append without notifying store observers. Once a store
  * prepares or enters the instance, writes require a completed creation
  * announcement and remain disabled after removal.
  *
  * @param type - The event type (key of {@link SessionEventMap}).
  * @param data - The event payload; must be JSON-serializable.
  * @param opts - Surface metadata: `surfaceOp` controls how the event enters
  *   the ordered surface; `sourceEventSeqs` lists the seq numbers of earlier
  *   events this one derives from. REQUIRED for
  *   {@link SurfaceEventType} events (every message-producing event must
  *   declare how it joins the surface, the sole source of derived model
  *   history) and
  *   rejected by the compiler for non-surface types like `turn/start` or
  *   `assistant/attempt`. Assistant messages embed their exact provider
  *   stream and cannot cite top-level source events.
  * @returns the logged event — its assigned `seq`/`time` plus the SNAPSHOT of
  *   `data` that entered the log, so reading `event.data` back sees the logged
  *   value, never the caller's still-mutable input.
  * @throws if a store-owned Session is unentered or its creation announcement
  *   has not completed, or if `data` or surface
  *   metadata is not losslessly JSON-serializable
  *   (BigInt, function, symbol, undefined, negative zero, non-finite number,
  *   circular reference, sparse array, or an exotic object such as
  *   Map/Set/Date/class instance), or when the candidate violates the
  *   request-header empty-field or tool-error consistency rules, or the
  *   canonical surface contract (marker shape and eligibility, unique
  *   earlier source-event references, positional replacement validity, and complete
  *   shadowed-node coverage). One iterative pass reads, validates, and
  *   copies each nested value once, so a stateful getter cannot supply one value
  *   to validation and another to storage. The event log is the durable source
  *   of truth, so a bad event fails at the append site rather than later during
  *   a backend flush. A synchronous internal dispatch validation failure or an
  *   append reentered while this acceptance/publication boundary is open also
  *   rejects before the log changes.
  */
  append(type, data, ...opts) {
    this.publicationEntry();
    const surfaceOpts = opts[0];
    const surfaceMetadata = {
      ...surfaceOpts?.sourceEventSeqs === void 0 ? {} : { sourceEventSeqs: surfaceOpts.sourceEventSeqs },
      ...surfaceOpts?.surfaceOp === void 0 ? {} : { surfaceOp: surfaceOpts.surfaceOp }
    };
    const dataSnapshot = snapshotJsonValue(data);
    if (dataSnapshot === void 0) throw new Error(`session event "${type}" carries non-JSON-serializable data`);
    const surfaceMetadataSnapshot = snapshotJsonValue(surfaceMetadata);
    if (surfaceMetadataSnapshot === void 0) throw new Error(`session event "${type}" carries non-JSON-serializable surface metadata`);
    const entry = this.publicationEntry();
    const event = deepFreeze({
      type,
      seq: SessionSeq2(this.log.length),
      time: Date.now(),
      data: dataSnapshot,
      ...surfaceMetadataSnapshot
    });
    validateSessionEventData2(event, `session event "${type}" at seq ${event.seq}`);
    this.commit(event, entry);
    return event;
  }
  static {
    commitPluginRecord2 = (session, type, data) => session.#appendRecord(type, data);
  }
  /**
  * Commit one plugin record; {@link appendPluginRecord} is the only caller.
  * @param type - record type, checked against the plugin record grammar.
  * @param data - JSON payload, snapshotted before it enters the log.
  * @returns the record's sequence number.
  */
  #appendRecord(type, data) {
    this.publicationEntry();
    const dataSnapshot = snapshotJsonValue(data);
    if (dataSnapshot === void 0) throw new Error(`plugin record "${type}" carries non-JSON-serializable data`);
    const entry = this.publicationEntry();
    const record = deepFreeze({
      type,
      seq: SessionSeq2(this.log.length),
      time: Date.now(),
      data: dataSnapshot,
      ignorable: true
    });
    assertPluginRecordEvent2(record);
    this.commit(record, entry);
    return record.seq;
  }
  /**
  * Require announced membership for store-owned Sessions and refuse reentrant publication.
  * @returns the current store attachment, or undefined for an independent Session.
  */
  publicationEntry() {
    const entry = attachments2.get(this);
    if (entry === null) throw new Error(`session "${this.id}" cannot append outside a SessionStore`);
    if (entry !== void 0 && entry.announcement !== "complete") throw new Error(`session "${this.id}" cannot append before session/created completes`);
    if (entry?.appending) throw new Error("session append cannot reenter while another append is being published");
    return entry;
  }
  /**
  * Accept one frozen candidate at the next sequence number, enter it into the
  * log, and notify `session/event` observers with per-listener containment.
  * @param event - the candidate built at the current log length.
  * @param entry - the attachment read before the candidate was built.
  */
  commit(event, entry) {
    this.surfaceManager.validateNext(event);
    if (entry !== void 0) entry.appending = true;
    try {
      const callbackArgs = [this, event];
      const callbacks = entry === void 0 ? void 0 : collectSessionCallbacks2(entry.emitCtx, [
        entry.carrier,
        "session/event",
        ...callbackArgs
      ]);
      this.log.push(event);
      this.eventsSnapshot = void 0;
      if (entry !== void 0 && callbacks !== void 0) invokeContainedSessionObservers2(entry.emitCtx, "session/event", entry.id, callbackArgs, callbacks);
    } finally {
      if (entry !== void 0) {
        entry.appending = false;
        if (entry.detachRequested && entry.announcement !== "dispatching") entry.detach();
      }
    }
  }
  /** Cached fold of the request-header events — see {@link requestHeader}. */
  headerFold;
  /** Log position (events consumed) the header fold has reached. */
  headerFoldSeq = 0;
  /**
  * The {@link EpochHeader} in force after the log's last header event — the
  * header the NEXT request will be compared against — or undefined before
  * the first `request/header` snapshot. The live, incrementally-maintained
  * form of `foldRequestHeader(session.snapshotEvents())`: each header event is folded
  * once, when first seen, so a per-step read costs O(new events).
  * @returns the folded header, or undefined when no header event exists yet.
  */
  requestHeader() {
    if (this.headerFoldSeq < this.log.length) {
      this.headerFold = deepFreeze(foldRequestHeader2(this.log.slice(this.headerFoldSeq), this.headerFold));
      this.headerFoldSeq = this.log.length;
    }
    return this.headerFold;
  }
  /** Cached fold of `request/context` events. */
  contextFold;
  contextFoldSeq = 0;
  /**
  * Return the latest resolved route metadata, or `undefined` before the first
  * `request/context` event. Each event is folded once.
  * @returns the latest immutable route metadata.
  */
  requestContext() {
    if (this.contextFoldSeq < this.log.length) {
      for (const event of this.log.slice(this.contextFoldSeq)) if (event.type === "request/context") this.contextFold = deepFreeze({ ...event.data });
      this.contextFoldSeq = this.log.length;
    }
    return this.contextFold;
  }
  /** Cached historical tool definitions and updates for request projection. */
  toolHistoryProjection = new ToolHistoryProjection2();
  /** Index of the next committed event not yet consumed by the tool-history fold. */
  toolHistorySeq = 0;
  /**
  * Fold unseen committed events into capability-independent tool history.
  * Initial access reconstructs inherited history; later reads consume only new events.
  * @returns an immutable snapshot for LLM request projection, including historical addition definitions.
  */
  toolHistory() {
    for (const event of this.log.slice(this.toolHistorySeq)) this.toolHistoryProjection.apply(event);
    this.toolHistorySeq = this.log.length;
    return this.toolHistoryProjection.snapshot();
  }
  /** The derived-message cache: frozen projections, extended per unseen node. */
  derived = [];
  /** Surface position (nodes projected) the cache has reached. */
  derivedNodes = 0;
  /** {@link SurfaceManager.contentGeneration} the cache was built under. */
  derivedGeneration = 0;
  /**
  * Derive the LLM message history by walking the ordered sequences of
  * message-producing events maintained by `surfaceOp` markers. The
  * surface is the single source of derived history: every message-producing
  * append records its `surfaceOp`, so a raw event with no marker (a chunk, a
  * turn boundary) is correctly absent, and a compaction `replace` deletes the
  * shadowed nodes from the derivation. The projection rules are
  * {@link deriveEventMessage}, with logged message projections applied
  * without changing node membership or message identity.
  *
  * CACHED: pure tail growth costs O(new nodes); a replacement or message projection
  * ({@link SessionSurface.contentGeneration}) rebuilds. The returned array is
  * a fresh snapshot per call (later appends never grow an array a caller
  * already holds); the `Message` objects in it are SHARED and **deep-frozen**.
  * Unchanged content reuses frozen event data; projected blocks are frozen
  * derived copies. Consumers cannot mutate the log through either form.
  * @returns a fresh array of the shared, frozen derived history.
  */
  deriveMessages() {
    const surface = this.surface;
    const nodes = surface.nodes;
    const generation = surface.contentGeneration;
    if (generation !== this.derivedGeneration) {
      this.derived = [];
      this.derivedNodes = 0;
      this.derivedGeneration = generation;
    }
    for (const seq of nodes.slice(this.derivedNodes)) {
      const msg = this.deriveEventMessage(this.log[seq]);
      if (msg) this.derived.push(msg);
    }
    this.derivedNodes = nodes.length;
    return [...this.derived];
  }
  /**
  * Project one event with all committed message projections applied.
  * The original durable event remains unchanged.
  * @param event - the event to project.
  * @returns the derived message, or null when the event produces none.
  */
  deriveEventMessage(event) {
    return this.surfaceManager.deriveEventMessage(event);
  }
};

// ../../zrepo/deepseek-harness/packages/core/session/lib/types/types.js
var SESSION_FORMAT_VERSION2 = 4;

// src/dsh/session.ts
var DSH_FORMAT_VERSION = SESSION_FORMAT_VERSION2;
function makeHeader(id, cwd, createdAt = Date.now()) {
  return {
    type: "session",
    version: DSH_FORMAT_VERSION,
    id,
    createdAt,
    ...cwd ? { cwd } : {},
    isSeeded: false,
    delegationDepth: 0
  };
}
function headerForSession(header) {
  return {
    version: header.version,
    id: header.id,
    createdAt: header.createdAt,
    ...header.cwd ? { cwd: header.cwd } : {},
    ...header.parentSession ? { parentSession: header.parentSession } : {},
    isSeeded: header.isSeeded === true,
    delegationDepth: header.delegationDepth ?? 0,
    ...header.agentPreset ? { agentPreset: header.agentPreset } : {}
  };
}
function createSession(id, cwd, createdAt = Date.now()) {
  const header = makeHeader(id, cwd, createdAt);
  const session = Session2.create(id, [], headerForSession(header));
  return { session, header };
}
function restoreSession(header, events) {
  return Session2.create(header.id, events, headerForSession(header), 0);
}

// src/dsh/store.ts
function isDshFileSync(file) {
  if (!file) return false;
  try {
    const first = readFileSync(file, "utf8").split("\n", 1)[0]?.trim();
    if (!first) return false;
    const header = JSON.parse(first);
    return header?.type === "session" && Number(header.version) >= 4;
  } catch {
    return false;
  }
}
function dshFileFor(piSessionFile) {
  if (!piSessionFile) return void 0;
  const dir = path.join(path.dirname(piSessionFile), ".dsh");
  const base = path.basename(piSessionFile).replace(/\.jsonl$/, "");
  return path.join(dir, `${base}.jsonl`);
}
async function readDshFile(file) {
  let text;
  try {
    text = file.endsWith(".zstd") ? execFileSync("zstd", ["-dc", file], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 }) : await fs.readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return void 0;
    throw error;
  }
  const rows = text.split("\n").filter((line) => line.trim().length > 0);
  if (rows.length === 0) return void 0;
  const headerRow = JSON.parse(rows[0]);
  if (headerRow?.type !== "session") throw new Error(`${file}: not a DSH session header`);
  const header = {
    type: "session",
    version: Number(headerRow.version ?? DSH_FORMAT_VERSION),
    id: String(headerRow.id),
    createdAt: Number(headerRow.createdAt ?? Date.now()),
    cwd: headerRow.cwd,
    parentSession: headerRow.parentSession,
    isSeeded: headerRow.isSeeded === true,
    delegationDepth: Number(headerRow.delegationDepth ?? 0),
    agentPreset: headerRow.agentPreset
  };
  const events = rows.slice(1).map((row) => JSON.parse(row));
  return { header, events };
}
async function writeDshFile(file, header, events) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  const body = [JSON.stringify(header), ...events.map((event) => JSON.stringify(event))].join("\n") + "\n";
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.tmp`);
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, file);
}
async function loadOrCreateSession(file, id, cwd) {
  if (file) {
    try {
      const parsed = await readDshFile(file);
      if (parsed) {
        const session2 = restoreSession(parsed.header, parsed.events);
        return { session: session2, header: parsed.header, loaded: true };
      }
    } catch (error) {
      console.warn(`[dsh-pi] could not load ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const { session, header } = createSession(id, cwd);
  return { session, header, loaded: false };
}

// src/bridge.ts
function filesFor(sessionFile) {
  const dsh = dshFileFor(sessionFile);
  return {
    dsh,
    meta: dsh ? `${dsh}.meta.json` : void 0
  };
}
function makeHost(ctx) {
  return {
    model: () => ctx.model,
    findModel: (provider, model) => {
      if (provider && model) return ctx.modelRegistry.find(provider, model);
      return void 0;
    },
    complete: (model, context, options) => ctx.modelRegistry.complete(model, context, options),
    systemPrompt: () => ctx.getSystemPrompt()
  };
}
var DshBridge = class {
  pi;
  ctx;
  files;
  session;
  header;
  syncState = createSyncState();
  engine;
  host;
  lastEventCount = 0;
  errorNotified = false;
  nativeMode = false;
  piFile;
  dshMtime = 0;
  dshSize = 0;
  ready = false;
  loaded = false;
  overflowPending = false;
  constructor(pi, ctx) {
    this.pi = pi;
    this.ctx = ctx;
    const piFile = ctx.sessionManager.getSessionFile?.();
    this.piFile = piFile;
    this.nativeMode = isDshFileSync(piFile);
    this.files = this.nativeMode ? { dsh: piFile, meta: void 0 } : filesFor(piFile);
  }
  async init() {
    const sessionId = this.ctx.sessionManager.getSessionId?.() ?? `pi-${Date.now()}`;
    const cwd = this.ctx.cwd ?? this.ctx.sessionManager.getCwd?.();
    const loaded = await loadOrCreateSession(this.files.dsh, sessionId, cwd);
    this.session = loaded.session;
    this.header = loaded.header;
    this.loaded = loaded.loaded;
    this.host = makeHost(this.ctx);
    this.engine = createEngine(this.host);
    this.syncState.turn = nextTurn(this.session);
    this.lastEventCount = this.session.snapshotEvents().length;
    if (!loaded.loaded) {
    } else {
      if (this.nativeMode) {
        for (const entry of this.entries()) {
          if (entry?.type === "message" && entry.id) this.syncState.seen.add(entry.id);
        }
      } else {
        const meta = await this.readMeta();
        const entries = this.entries();
        if (meta?.syncedEntryIds?.length) {
          this.syncState.seen = new Set(meta.syncedEntryIds);
        } else {
          for (const entry of entries) {
            if (entry?.type === "message" && entry.id) this.syncState.seen.add(entry.id);
          }
        }
      }
      this.lastEventCount = this.session.snapshotEvents().length;
    }
    await this.refreshNativeStamp();
    this.ready = true;
  }
  entries() {
    try {
      return this.ctx.sessionManager.buildContextEntries?.() ?? this.ctx.sessionManager.getEntries?.() ?? [];
    } catch {
      return [];
    }
  }
  async sync() {
    if (!this.ready) return 0;
    await this.maybeSwitchToNative();
    if (this.nativeMode) {
      await this.reloadIfChanged();
      return 0;
    }
    const count = syncPiEntries(this.session, this.entries(), this.syncState, { systemPrompt: this.ctx.getSystemPrompt?.() });
    if (count > 0) await this.persist();
    return count;
  }
  /**
   * pi creates the session file on the first persisted message, i.e. after
   * session_start. Detect the core codec's DSH file lazily and switch from the
   * plugin's sidecar to the single native log.
   */
  async maybeSwitchToNative() {
    if (this.nativeMode) return;
    const file = this.ctx.sessionManager.getSessionFile?.() ?? this.piFile;
    if (!file || !isDshFileSync(file)) return;
    this.nativeMode = true;
    this.piFile = file;
    this.files = { dsh: file, meta: void 0 };
    const parsed = await readDshFile(file);
    if (parsed) {
      this.session = restoreSession(parsed.header, parsed.events);
      this.header = parsed.header;
      this.loaded = true;
      this.syncState = createSyncState();
      this.syncState.turn = nextTurn(this.session);
      for (const entry of this.entries()) {
        if (entry?.type === "message" && entry.id) this.syncState.seen.add(entry.id);
      }
      for (const seq of this.session.surface.nodes) {
        if (this.session.eventAt(seq)?.type === "system/message") {
          this.syncState.systemSeq = Number(seq);
          break;
        }
      }
      this.lastEventCount = this.session.snapshotEvents().length;
    }
    await this.refreshNativeStamp();
  }
  async refreshNativeStamp() {
    if (!this.nativeMode || !this.files.dsh) return;
    try {
      const stat = await fs2.stat(this.files.dsh);
      this.dshMtime = stat.mtimeMs;
      this.dshSize = stat.size;
    } catch {
    }
  }
  async reloadIfChanged() {
    if (!this.nativeMode || !this.files.dsh) return;
    let stat;
    try {
      stat = await fs2.stat(this.files.dsh);
    } catch {
      return;
    }
    if (stat.mtimeMs === this.dshMtime && stat.size === this.dshSize) return;
    const parsed = await readDshFile(this.files.dsh);
    if (!parsed) return;
    this.session = restoreSession(parsed.header, parsed.events);
    this.header = parsed.header;
    this.syncState = createSyncState();
    this.syncState.turn = nextTurn(this.session);
    for (const entry of this.entries()) {
      if (entry?.type === "message" && entry.id) this.syncState.seen.add(entry.id);
    }
    for (const seq of this.session.surface.nodes) {
      if (this.session.eventAt(seq)?.type === "system/message") {
        this.syncState.systemSeq = Number(seq);
        break;
      }
    }
    this.dshMtime = stat.mtimeMs;
    this.dshSize = stat.size;
    this.lastEventCount = this.session.snapshotEvents().length;
  }
  /** Watch the failed run for a provider-confirmed context overflow. */
  noteAgentEnd(event) {
    const messages = Array.isArray(event?.messages) ? event.messages : [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message?.role !== "assistant") continue;
      const text = String(message.errorMessage ?? "");
      if (message.stopReason === "length" || /context (window|length)|too many tokens|maximum context|token limit|overflow|length limit/i.test(text)) {
        this.overflowPending = true;
      }
      return;
    }
  }
  /** One compact-and-continue attempt after a detected overflow. */
  async recoverOverflow(signal) {
    if (!this.overflowPending) return false;
    this.overflowPending = false;
    const outcome = await this.compact(signal, true);
    return Boolean(outcome && !outcome.error);
  }
  async compact(signal, force = false) {
    if (!this.ready || !this.engine || !this.host) return void 0;
    try {
      const outcome = await compactIfNeeded(this.engine.engine, this.session, this.host, signal, force, this.engine.pruner);
      if (outcome) {
        await this.persist();
        return outcome;
      }
      return void 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!this.errorNotified) {
        this.errorNotified = true;
        try {
          this.ctx.ui?.notify?.(`[dsh-pi] compaction failed: ${message}`, "warning");
        } catch {
        }
      }
      return { error: message };
    }
  }
  messages() {
    if (!this.ready) return [];
    return projectSurface(this.session);
  }
  async close() {
    if (!this.ready) return;
    await this.sync();
    closeTurn(this.session, this.syncState);
    await this.persist();
  }
  async persist() {
    await this.maybeSwitchToNative();
    if (!this.files.dsh || !this.header) return;
    const events = this.session.snapshotEvents();
    await writeDshFile(this.files.dsh, this.header, events);
    this.lastEventCount = events.length;
    await this.refreshNativeStamp();
    if (this.files.meta) {
      const meta = {
        version: 1,
        piSessionId: this.ctx.sessionManager.getSessionId?.(),
        syncedEntryIds: [...this.syncState.seen],
        eventCount: events.length,
        updatedAt: Date.now()
      };
      await fs2.writeFile(this.files.meta, JSON.stringify(meta), "utf8");
    }
  }
  async readMeta() {
    if (!this.files.meta) return void 0;
    try {
      return JSON.parse(await fs2.readFile(this.files.meta, "utf8"));
    } catch {
      return void 0;
    }
  }
  status() {
    if (!this.ready) return "dsh-pi: not ready";
    const events = this.session.snapshotEvents().length;
    const measurement = meter.measure(this.session);
    const limits = this.host ? budget(this.host) : void 0;
    return [
      `dsh-pi: ${this.loaded ? "loaded" : "new"} DSH session${this.nativeMode ? " (native pi codec)" : ""}`,
      `events=${events} surface=${this.session.surface.nodes.length} tokens~${measurement.totalTokens}`,
      limits ? `window=${limits.contextWindow} threshold=${limits.threshold} retain=${limits.retain}` : "no model budget",
      this.files.dsh ? `file=${this.files.dsh}` : "no persistent session file"
    ].join("\n");
  }
};

// src/index.ts
function dshCompaction(pi) {
  let bridge;
  pi.on("session_start", async (_event, ctx) => {
    const next = new DshBridge(pi, ctx);
    try {
      await next.init();
      bridge = next;
    } catch (error) {
      bridge = void 0;
      const message = error instanceof Error ? error.message : String(error);
      try {
        ctx.ui?.notify?.(`[dsh-pi] init failed: ${message}`, "error");
      } catch {
      }
    }
  });
  pi.on("session_before_compact", () => {
    return bridge?.ready ? { cancel: true } : void 0;
  });
  pi.on("agent_end", (event) => {
    bridge?.noteAgentEnd(event);
  });
  pi.on("agent_before_settle", async (_event, ctx) => {
    if (!bridge?.overflowPending) return;
    const recovered = await bridge.recoverOverflow();
    if (recovered) return { continue: true };
    return;
  });
  pi.on("context", async (event, ctx) => {
    if (!bridge?.ready) return;
    try {
      await bridge.sync();
      await bridge.compact(event.signal);
      const messages = bridge.messages();
      if (messages.length === 0) return;
      return { messages };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        ctx.ui?.notify?.(`[dsh-pi] context failed: ${message}`, "warning");
      } catch {
      }
      return;
    }
  });
  pi.on("session_shutdown", async () => {
    try {
      await bridge?.close();
    } catch {
    }
  });
  pi.registerCommand("dsh-status", {
    description: "Show the DSH compaction session state",
    handler: async (_args, ctx) => {
      ctx.ui?.notify?.(bridge?.status() ?? "dsh-pi: not ready", "info");
    }
  });
  pi.registerCommand("dsh-compact", {
    description: "Force a DSH compaction now",
    handler: async (_args, ctx) => {
      if (!bridge?.ready) {
        ctx.ui?.notify?.("dsh-pi: not ready", "warning");
        return;
      }
      const outcome = await bridge.compact(void 0, true);
      if (outcome?.error) {
        ctx.ui?.notify?.(`dsh-pi: ${outcome.error}`, "error");
        return;
      }
      ctx.ui?.notify?.(
        outcome ? `dsh-pi: compacted ${outcome.before} -> ${outcome.after} tokens` : "dsh-pi: nothing to compact",
        "info"
      );
    }
  });
}
export {
  dshCompaction as default
};
