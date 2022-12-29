(function () {
  'use strict';

  /**
   * Fuse.js v6.6.2 - Lightweight fuzzy-search (http://fusejs.io)
   *
   * Copyright (c) 2022 Kiro Risk (http://kiro.me)
   * All Rights Reserved. Apache Software License 2.0
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   */

  function isArray$2(value) {
    return !Array.isArray
      ? getTag(value) === '[object Array]'
      : Array.isArray(value)
  }

  // Adapted from: https://github.com/lodash/lodash/blob/master/.internal/baseToString.js
  const INFINITY = 1 / 0;
  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == 'string') {
      return value
    }
    let result = value + '';
    return result == '0' && 1 / value == -INFINITY ? '-0' : result
  }

  function toString$b(value) {
    return value == null ? '' : baseToString(value)
  }

  function isString(value) {
    return typeof value === 'string'
  }

  function isNumber(value) {
    return typeof value === 'number'
  }

  // Adapted from: https://github.com/lodash/lodash/blob/master/isBoolean.js
  function isBoolean(value) {
    return (
      value === true ||
      value === false ||
      (isObjectLike$2(value) && getTag(value) == '[object Boolean]')
    )
  }

  function isObject$h(value) {
    return typeof value === 'object'
  }

  // Checks if `value` is object-like.
  function isObjectLike$2(value) {
    return isObject$h(value) && value !== null
  }

  function isDefined(value) {
    return value !== undefined && value !== null
  }

  function isBlank(value) {
    return !value.trim().length
  }

  // Gets the `toStringTag` of `value`.
  // Adapted from: https://github.com/lodash/lodash/blob/master/.internal/getTag.js
  function getTag(value) {
    return value == null
      ? value === undefined
        ? '[object Undefined]'
        : '[object Null]'
      : Object.prototype.toString.call(value)
  }

  const EXTENDED_SEARCH_UNAVAILABLE = 'Extended search is not available';

  const INCORRECT_INDEX_TYPE = "Incorrect 'index' type";

  const LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) =>
    `Invalid value for key ${key}`;

  const PATTERN_LENGTH_TOO_LARGE = (max) =>
    `Pattern length exceeds max of ${max}.`;

  const MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;

  const INVALID_KEY_WEIGHT_VALUE = (key) =>
    `Property 'weight' in key '${key}' must be a positive integer`;

  const hasOwn$b = Object.prototype.hasOwnProperty;

  class KeyStore {
    constructor(keys) {
      this._keys = [];
      this._keyMap = {};

      let totalWeight = 0;

      keys.forEach((key) => {
        let obj = createKey(key);

        totalWeight += obj.weight;

        this._keys.push(obj);
        this._keyMap[obj.id] = obj;

        totalWeight += obj.weight;
      });

      // Normalize weights so that their sum is equal to 1
      this._keys.forEach((key) => {
        key.weight /= totalWeight;
      });
    }
    get(keyId) {
      return this._keyMap[keyId]
    }
    keys() {
      return this._keys
    }
    toJSON() {
      return JSON.stringify(this._keys)
    }
  }

  function createKey(key) {
    let path = null;
    let id = null;
    let src = null;
    let weight = 1;
    let getFn = null;

    if (isString(key) || isArray$2(key)) {
      src = key;
      path = createKeyPath(key);
      id = createKeyId(key);
    } else {
      if (!hasOwn$b.call(key, 'name')) {
        throw new Error(MISSING_KEY_PROPERTY('name'))
      }

      const name = key.name;
      src = name;

      if (hasOwn$b.call(key, 'weight')) {
        weight = key.weight;

        if (weight <= 0) {
          throw new Error(INVALID_KEY_WEIGHT_VALUE(name))
        }
      }

      path = createKeyPath(name);
      id = createKeyId(name);
      getFn = key.getFn;
    }

    return { path, id, weight, src, getFn }
  }

  function createKeyPath(key) {
    return isArray$2(key) ? key : key.split('.')
  }

  function createKeyId(key) {
    return isArray$2(key) ? key.join('.') : key
  }

  function get$1(obj, path) {
    let list = [];
    let arr = false;

    const deepGet = (obj, path, index) => {
      if (!isDefined(obj)) {
        return
      }
      if (!path[index]) {
        // If there's no path left, we've arrived at the object we care about.
        list.push(obj);
      } else {
        let key = path[index];

        const value = obj[key];

        if (!isDefined(value)) {
          return
        }

        // If we're at the last value in the path, and if it's a string/number/bool,
        // add it to the list
        if (
          index === path.length - 1 &&
          (isString(value) || isNumber(value) || isBoolean(value))
        ) {
          list.push(toString$b(value));
        } else if (isArray$2(value)) {
          arr = true;
          // Search each item in the array.
          for (let i = 0, len = value.length; i < len; i += 1) {
            deepGet(value[i], path, index + 1);
          }
        } else if (path.length) {
          // An object. Recurse further.
          deepGet(value, path, index + 1);
        }
      }
    };

    // Backwards compatibility (since path used to be a string)
    deepGet(obj, isString(path) ? path.split('.') : path, 0);

    return arr ? list : list[0]
  }

  const MatchOptions = {
    // Whether the matches should be included in the result set. When `true`, each record in the result
    // set will include the indices of the matched characters.
    // These can consequently be used for highlighting purposes.
    includeMatches: false,
    // When `true`, the matching function will continue to the end of a search pattern even if
    // a perfect match has already been located in the string.
    findAllMatches: false,
    // Minimum number of characters that must be matched before a result is considered a match
    minMatchCharLength: 1
  };

  const BasicOptions = {
    // When `true`, the algorithm continues searching to the end of the input even if a perfect
    // match is found before the end of the same input.
    isCaseSensitive: false,
    // When true, the matching function will continue to the end of a search pattern even if
    includeScore: false,
    // List of properties that will be searched. This also supports nested properties.
    keys: [],
    // Whether to sort the result list, by score
    shouldSort: true,
    // Default sort function: sort by ascending score, ascending index
    sortFn: (a, b) =>
      a.score === b.score ? (a.idx < b.idx ? -1 : 1) : a.score < b.score ? -1 : 1
  };

  const FuzzyOptions = {
    // Approximately where in the text is the pattern expected to be found?
    location: 0,
    // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
    // (of both letters and location), a threshold of '1.0' would match anything.
    threshold: 0.6,
    // Determines how close the match must be to the fuzzy location (specified above).
    // An exact letter match which is 'distance' characters away from the fuzzy location
    // would score as a complete mismatch. A distance of '0' requires the match be at
    // the exact location specified, a threshold of '1000' would require a perfect match
    // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
    distance: 100
  };

  const AdvancedOptions = {
    // When `true`, it enables the use of unix-like search commands
    useExtendedSearch: false,
    // The get function to use when fetching an object's properties.
    // The default will search nested paths *ie foo.bar.baz*
    getFn: get$1,
    // When `true`, search will ignore `location` and `distance`, so it won't matter
    // where in the string the pattern appears.
    // More info: https://fusejs.io/concepts/scoring-theory.html#fuzziness-score
    ignoreLocation: false,
    // When `true`, the calculation for the relevance score (used for sorting) will
    // ignore the field-length norm.
    // More info: https://fusejs.io/concepts/scoring-theory.html#field-length-norm
    ignoreFieldNorm: false,
    // The weight to determine how much field length norm effects scoring.
    fieldNormWeight: 1
  };

  var Config = {
    ...BasicOptions,
    ...MatchOptions,
    ...FuzzyOptions,
    ...AdvancedOptions
  };

  const SPACE = /[^ ]+/g;

  // Field-length norm: the shorter the field, the higher the weight.
  // Set to 3 decimals to reduce index size.
  function norm(weight = 1, mantissa = 3) {
    const cache = new Map();
    const m = Math.pow(10, mantissa);

    return {
      get(value) {
        const numTokens = value.match(SPACE).length;

        if (cache.has(numTokens)) {
          return cache.get(numTokens)
        }

        // Default function is 1/sqrt(x), weight makes that variable
        const norm = 1 / Math.pow(numTokens, 0.5 * weight);

        // In place of `toFixed(mantissa)`, for faster computation
        const n = parseFloat(Math.round(norm * m) / m);

        cache.set(numTokens, n);

        return n
      },
      clear() {
        cache.clear();
      }
    }
  }

  class FuseIndex {
    constructor({
      getFn = Config.getFn,
      fieldNormWeight = Config.fieldNormWeight
    } = {}) {
      this.norm = norm(fieldNormWeight, 3);
      this.getFn = getFn;
      this.isCreated = false;

      this.setIndexRecords();
    }
    setSources(docs = []) {
      this.docs = docs;
    }
    setIndexRecords(records = []) {
      this.records = records;
    }
    setKeys(keys = []) {
      this.keys = keys;
      this._keysMap = {};
      keys.forEach((key, idx) => {
        this._keysMap[key.id] = idx;
      });
    }
    create() {
      if (this.isCreated || !this.docs.length) {
        return
      }

      this.isCreated = true;

      // List is Array<String>
      if (isString(this.docs[0])) {
        this.docs.forEach((doc, docIndex) => {
          this._addString(doc, docIndex);
        });
      } else {
        // List is Array<Object>
        this.docs.forEach((doc, docIndex) => {
          this._addObject(doc, docIndex);
        });
      }

      this.norm.clear();
    }
    // Adds a doc to the end of the index
    add(doc) {
      const idx = this.size();

      if (isString(doc)) {
        this._addString(doc, idx);
      } else {
        this._addObject(doc, idx);
      }
    }
    // Removes the doc at the specified index of the index
    removeAt(idx) {
      this.records.splice(idx, 1);

      // Change ref index of every subsquent doc
      for (let i = idx, len = this.size(); i < len; i += 1) {
        this.records[i].i -= 1;
      }
    }
    getValueForItemAtKeyId(item, keyId) {
      return item[this._keysMap[keyId]]
    }
    size() {
      return this.records.length
    }
    _addString(doc, docIndex) {
      if (!isDefined(doc) || isBlank(doc)) {
        return
      }

      let record = {
        v: doc,
        i: docIndex,
        n: this.norm.get(doc)
      };

      this.records.push(record);
    }
    _addObject(doc, docIndex) {
      let record = { i: docIndex, $: {} };

      // Iterate over every key (i.e, path), and fetch the value at that key
      this.keys.forEach((key, keyIndex) => {
        let value = key.getFn ? key.getFn(doc) : this.getFn(doc, key.path);

        if (!isDefined(value)) {
          return
        }

        if (isArray$2(value)) {
          let subRecords = [];
          const stack = [{ nestedArrIndex: -1, value }];

          while (stack.length) {
            const { nestedArrIndex, value } = stack.pop();

            if (!isDefined(value)) {
              continue
            }

            if (isString(value) && !isBlank(value)) {
              let subRecord = {
                v: value,
                i: nestedArrIndex,
                n: this.norm.get(value)
              };

              subRecords.push(subRecord);
            } else if (isArray$2(value)) {
              value.forEach((item, k) => {
                stack.push({
                  nestedArrIndex: k,
                  value: item
                });
              });
            } else ;
          }
          record.$[keyIndex] = subRecords;
        } else if (isString(value) && !isBlank(value)) {
          let subRecord = {
            v: value,
            n: this.norm.get(value)
          };

          record.$[keyIndex] = subRecord;
        }
      });

      this.records.push(record);
    }
    toJSON() {
      return {
        keys: this.keys,
        records: this.records
      }
    }
  }

  function createIndex(
    keys,
    docs,
    { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}
  ) {
    const myIndex = new FuseIndex({ getFn, fieldNormWeight });
    myIndex.setKeys(keys.map(createKey));
    myIndex.setSources(docs);
    myIndex.create();
    return myIndex
  }

  function parseIndex(
    data,
    { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}
  ) {
    const { keys, records } = data;
    const myIndex = new FuseIndex({ getFn, fieldNormWeight });
    myIndex.setKeys(keys);
    myIndex.setIndexRecords(records);
    return myIndex
  }

  function computeScore$1(
    pattern,
    {
      errors = 0,
      currentLocation = 0,
      expectedLocation = 0,
      distance = Config.distance,
      ignoreLocation = Config.ignoreLocation
    } = {}
  ) {
    const accuracy = errors / pattern.length;

    if (ignoreLocation) {
      return accuracy
    }

    const proximity = Math.abs(expectedLocation - currentLocation);

    if (!distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy
    }

    return accuracy + proximity / distance
  }

  function convertMaskToIndices(
    matchmask = [],
    minMatchCharLength = Config.minMatchCharLength
  ) {
    let indices = [];
    let start = -1;
    let end = -1;
    let i = 0;

    for (let len = matchmask.length; i < len; i += 1) {
      let match = matchmask[i];
      if (match && start === -1) {
        start = i;
      } else if (!match && start !== -1) {
        end = i - 1;
        if (end - start + 1 >= minMatchCharLength) {
          indices.push([start, end]);
        }
        start = -1;
      }
    }

    // (i-1 - start) + 1 => i - start
    if (matchmask[i - 1] && i - start >= minMatchCharLength) {
      indices.push([start, i - 1]);
    }

    return indices
  }

  // Machine word size
  const MAX_BITS = 32;

  function search(
    text,
    pattern,
    patternAlphabet,
    {
      location = Config.location,
      distance = Config.distance,
      threshold = Config.threshold,
      findAllMatches = Config.findAllMatches,
      minMatchCharLength = Config.minMatchCharLength,
      includeMatches = Config.includeMatches,
      ignoreLocation = Config.ignoreLocation
    } = {}
  ) {
    if (pattern.length > MAX_BITS) {
      throw new Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS))
    }

    const patternLen = pattern.length;
    // Set starting location at beginning text and initialize the alphabet.
    const textLen = text.length;
    // Handle the case when location > text.length
    const expectedLocation = Math.max(0, Math.min(location, textLen));
    // Highest score beyond which we give up.
    let currentThreshold = threshold;
    // Is there a nearby exact match? (speedup)
    let bestLocation = expectedLocation;

    // Performance: only computer matches when the minMatchCharLength > 1
    // OR if `includeMatches` is true.
    const computeMatches = minMatchCharLength > 1 || includeMatches;
    // A mask of the matches, used for building the indices
    const matchMask = computeMatches ? Array(textLen) : [];

    let index;

    // Get all exact matches, here for speed up
    while ((index = text.indexOf(pattern, bestLocation)) > -1) {
      let score = computeScore$1(pattern, {
        currentLocation: index,
        expectedLocation,
        distance,
        ignoreLocation
      });

      currentThreshold = Math.min(score, currentThreshold);
      bestLocation = index + patternLen;

      if (computeMatches) {
        let i = 0;
        while (i < patternLen) {
          matchMask[index + i] = 1;
          i += 1;
        }
      }
    }

    // Reset the best location
    bestLocation = -1;

    let lastBitArr = [];
    let finalScore = 1;
    let binMax = patternLen + textLen;

    const mask = 1 << (patternLen - 1);

    for (let i = 0; i < patternLen; i += 1) {
      // Scan for the best match; each iteration allows for one more error.
      // Run a binary search to determine how far from the match location we can stray
      // at this error level.
      let binMin = 0;
      let binMid = binMax;

      while (binMin < binMid) {
        const score = computeScore$1(pattern, {
          errors: i,
          currentLocation: expectedLocation + binMid,
          expectedLocation,
          distance,
          ignoreLocation
        });

        if (score <= currentThreshold) {
          binMin = binMid;
        } else {
          binMax = binMid;
        }

        binMid = Math.floor((binMax - binMin) / 2 + binMin);
      }

      // Use the result from this iteration as the maximum for the next.
      binMax = binMid;

      let start = Math.max(1, expectedLocation - binMid + 1);
      let finish = findAllMatches
        ? textLen
        : Math.min(expectedLocation + binMid, textLen) + patternLen;

      // Initialize the bit array
      let bitArr = Array(finish + 2);

      bitArr[finish + 1] = (1 << i) - 1;

      for (let j = finish; j >= start; j -= 1) {
        let currentLocation = j - 1;
        let charMatch = patternAlphabet[text.charAt(currentLocation)];

        if (computeMatches) {
          // Speed up: quick bool to int conversion (i.e, `charMatch ? 1 : 0`)
          matchMask[currentLocation] = +!!charMatch;
        }

        // First pass: exact match
        bitArr[j] = ((bitArr[j + 1] << 1) | 1) & charMatch;

        // Subsequent passes: fuzzy match
        if (i) {
          bitArr[j] |=
            ((lastBitArr[j + 1] | lastBitArr[j]) << 1) | 1 | lastBitArr[j + 1];
        }

        if (bitArr[j] & mask) {
          finalScore = computeScore$1(pattern, {
            errors: i,
            currentLocation,
            expectedLocation,
            distance,
            ignoreLocation
          });

          // This match will almost certainly be better than any existing match.
          // But check anyway.
          if (finalScore <= currentThreshold) {
            // Indeed it is
            currentThreshold = finalScore;
            bestLocation = currentLocation;

            // Already passed `loc`, downhill from here on in.
            if (bestLocation <= expectedLocation) {
              break
            }

            // When passing `bestLocation`, don't exceed our current distance from `expectedLocation`.
            start = Math.max(1, 2 * expectedLocation - bestLocation);
          }
        }
      }

      // No hope for a (better) match at greater error levels.
      const score = computeScore$1(pattern, {
        errors: i + 1,
        currentLocation: expectedLocation,
        expectedLocation,
        distance,
        ignoreLocation
      });

      if (score > currentThreshold) {
        break
      }

      lastBitArr = bitArr;
    }

    const result = {
      isMatch: bestLocation >= 0,
      // Count exact matches (those with a score of 0) to be "almost" exact
      score: Math.max(0.001, finalScore)
    };

    if (computeMatches) {
      const indices = convertMaskToIndices(matchMask, minMatchCharLength);
      if (!indices.length) {
        result.isMatch = false;
      } else if (includeMatches) {
        result.indices = indices;
      }
    }

    return result
  }

  function createPatternAlphabet(pattern) {
    let mask = {};

    for (let i = 0, len = pattern.length; i < len; i += 1) {
      const char = pattern.charAt(i);
      mask[char] = (mask[char] || 0) | (1 << (len - i - 1));
    }

    return mask
  }

  class BitapSearch {
    constructor(
      pattern,
      {
        location = Config.location,
        threshold = Config.threshold,
        distance = Config.distance,
        includeMatches = Config.includeMatches,
        findAllMatches = Config.findAllMatches,
        minMatchCharLength = Config.minMatchCharLength,
        isCaseSensitive = Config.isCaseSensitive,
        ignoreLocation = Config.ignoreLocation
      } = {}
    ) {
      this.options = {
        location,
        threshold,
        distance,
        includeMatches,
        findAllMatches,
        minMatchCharLength,
        isCaseSensitive,
        ignoreLocation
      };

      this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();

      this.chunks = [];

      if (!this.pattern.length) {
        return
      }

      const addChunk = (pattern, startIndex) => {
        this.chunks.push({
          pattern,
          alphabet: createPatternAlphabet(pattern),
          startIndex
        });
      };

      const len = this.pattern.length;

      if (len > MAX_BITS) {
        let i = 0;
        const remainder = len % MAX_BITS;
        const end = len - remainder;

        while (i < end) {
          addChunk(this.pattern.substr(i, MAX_BITS), i);
          i += MAX_BITS;
        }

        if (remainder) {
          const startIndex = len - MAX_BITS;
          addChunk(this.pattern.substr(startIndex), startIndex);
        }
      } else {
        addChunk(this.pattern, 0);
      }
    }

    searchIn(text) {
      const { isCaseSensitive, includeMatches } = this.options;

      if (!isCaseSensitive) {
        text = text.toLowerCase();
      }

      // Exact match
      if (this.pattern === text) {
        let result = {
          isMatch: true,
          score: 0
        };

        if (includeMatches) {
          result.indices = [[0, text.length - 1]];
        }

        return result
      }

      // Otherwise, use Bitap algorithm
      const {
        location,
        distance,
        threshold,
        findAllMatches,
        minMatchCharLength,
        ignoreLocation
      } = this.options;

      let allIndices = [];
      let totalScore = 0;
      let hasMatches = false;

      this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
        const { isMatch, score, indices } = search(text, pattern, alphabet, {
          location: location + startIndex,
          distance,
          threshold,
          findAllMatches,
          minMatchCharLength,
          includeMatches,
          ignoreLocation
        });

        if (isMatch) {
          hasMatches = true;
        }

        totalScore += score;

        if (isMatch && indices) {
          allIndices = [...allIndices, ...indices];
        }
      });

      let result = {
        isMatch: hasMatches,
        score: hasMatches ? totalScore / this.chunks.length : 1
      };

      if (hasMatches && includeMatches) {
        result.indices = allIndices;
      }

      return result
    }
  }

  class BaseMatch {
    constructor(pattern) {
      this.pattern = pattern;
    }
    static isMultiMatch(pattern) {
      return getMatch(pattern, this.multiRegex)
    }
    static isSingleMatch(pattern) {
      return getMatch(pattern, this.singleRegex)
    }
    search(/*text*/) {}
  }

  function getMatch(pattern, exp) {
    const matches = pattern.match(exp);
    return matches ? matches[1] : null
  }

  // Token: 'file

  class ExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return 'exact'
    }
    static get multiRegex() {
      return /^="(.*)"$/
    }
    static get singleRegex() {
      return /^=(.*)$/
    }
    search(text) {
      const isMatch = text === this.pattern;

      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, this.pattern.length - 1]
      }
    }
  }

  // Token: !fire

  class InverseExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return 'inverse-exact'
    }
    static get multiRegex() {
      return /^!"(.*)"$/
    }
    static get singleRegex() {
      return /^!(.*)$/
    }
    search(text) {
      const index = text.indexOf(this.pattern);
      const isMatch = index === -1;

      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1]
      }
    }
  }

  // Token: ^file

  class PrefixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return 'prefix-exact'
    }
    static get multiRegex() {
      return /^\^"(.*)"$/
    }
    static get singleRegex() {
      return /^\^(.*)$/
    }
    search(text) {
      const isMatch = text.startsWith(this.pattern);

      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, this.pattern.length - 1]
      }
    }
  }

  // Token: !^fire

  class InversePrefixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return 'inverse-prefix-exact'
    }
    static get multiRegex() {
      return /^!\^"(.*)"$/
    }
    static get singleRegex() {
      return /^!\^(.*)$/
    }
    search(text) {
      const isMatch = !text.startsWith(this.pattern);

      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1]
      }
    }
  }

  // Token: .file$

  class SuffixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return 'suffix-exact'
    }
    static get multiRegex() {
      return /^"(.*)"\$$/
    }
    static get singleRegex() {
      return /^(.*)\$$/
    }
    search(text) {
      const isMatch = text.endsWith(this.pattern);

      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [text.length - this.pattern.length, text.length - 1]
      }
    }
  }

  // Token: !.file$

  class InverseSuffixExactMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return 'inverse-suffix-exact'
    }
    static get multiRegex() {
      return /^!"(.*)"\$$/
    }
    static get singleRegex() {
      return /^!(.*)\$$/
    }
    search(text) {
      const isMatch = !text.endsWith(this.pattern);
      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices: [0, text.length - 1]
      }
    }
  }

  class FuzzyMatch extends BaseMatch {
    constructor(
      pattern,
      {
        location = Config.location,
        threshold = Config.threshold,
        distance = Config.distance,
        includeMatches = Config.includeMatches,
        findAllMatches = Config.findAllMatches,
        minMatchCharLength = Config.minMatchCharLength,
        isCaseSensitive = Config.isCaseSensitive,
        ignoreLocation = Config.ignoreLocation
      } = {}
    ) {
      super(pattern);
      this._bitapSearch = new BitapSearch(pattern, {
        location,
        threshold,
        distance,
        includeMatches,
        findAllMatches,
        minMatchCharLength,
        isCaseSensitive,
        ignoreLocation
      });
    }
    static get type() {
      return 'fuzzy'
    }
    static get multiRegex() {
      return /^"(.*)"$/
    }
    static get singleRegex() {
      return /^(.*)$/
    }
    search(text) {
      return this._bitapSearch.searchIn(text)
    }
  }

  // Token: 'file

  class IncludeMatch extends BaseMatch {
    constructor(pattern) {
      super(pattern);
    }
    static get type() {
      return 'include'
    }
    static get multiRegex() {
      return /^'"(.*)"$/
    }
    static get singleRegex() {
      return /^'(.*)$/
    }
    search(text) {
      let location = 0;
      let index;

      const indices = [];
      const patternLen = this.pattern.length;

      // Get all exact matches
      while ((index = text.indexOf(this.pattern, location)) > -1) {
        location = index + patternLen;
        indices.push([index, location - 1]);
      }

      const isMatch = !!indices.length;

      return {
        isMatch,
        score: isMatch ? 0 : 1,
        indices
      }
    }
  }

  // ❗Order is important. DO NOT CHANGE.
  const searchers = [
    ExactMatch,
    IncludeMatch,
    PrefixExactMatch,
    InversePrefixExactMatch,
    InverseSuffixExactMatch,
    SuffixExactMatch,
    InverseExactMatch,
    FuzzyMatch
  ];

  const searchersLen = searchers.length;

  // Regex to split by spaces, but keep anything in quotes together
  const SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
  const OR_TOKEN = '|';

  // Return a 2D array representation of the query, for simpler parsing.
  // Example:
  // "^core go$ | rb$ | py$ xy$" => [["^core", "go$"], ["rb$"], ["py$", "xy$"]]
  function parseQuery(pattern, options = {}) {
    return pattern.split(OR_TOKEN).map((item) => {
      let query = item
        .trim()
        .split(SPACE_RE)
        .filter((item) => item && !!item.trim());

      let results = [];
      for (let i = 0, len = query.length; i < len; i += 1) {
        const queryItem = query[i];

        // 1. Handle multiple query match (i.e, once that are quoted, like `"hello world"`)
        let found = false;
        let idx = -1;
        while (!found && ++idx < searchersLen) {
          const searcher = searchers[idx];
          let token = searcher.isMultiMatch(queryItem);
          if (token) {
            results.push(new searcher(token, options));
            found = true;
          }
        }

        if (found) {
          continue
        }

        // 2. Handle single query matches (i.e, once that are *not* quoted)
        idx = -1;
        while (++idx < searchersLen) {
          const searcher = searchers[idx];
          let token = searcher.isSingleMatch(queryItem);
          if (token) {
            results.push(new searcher(token, options));
            break
          }
        }
      }

      return results
    })
  }

  // These extended matchers can return an array of matches, as opposed
  // to a singl match
  const MultiMatchSet = new Set([FuzzyMatch.type, IncludeMatch.type]);

  /**
   * Command-like searching
   * ======================
   *
   * Given multiple search terms delimited by spaces.e.g. `^jscript .python$ ruby !java`,
   * search in a given text.
   *
   * Search syntax:
   *
   * | Token       | Match type                 | Description                            |
   * | ----------- | -------------------------- | -------------------------------------- |
   * | `jscript`   | fuzzy-match                | Items that fuzzy match `jscript`       |
   * | `=scheme`   | exact-match                | Items that are `scheme`                |
   * | `'python`   | include-match              | Items that include `python`            |
   * | `!ruby`     | inverse-exact-match        | Items that do not include `ruby`       |
   * | `^java`     | prefix-exact-match         | Items that start with `java`           |
   * | `!^earlang` | inverse-prefix-exact-match | Items that do not start with `earlang` |
   * | `.js$`      | suffix-exact-match         | Items that end with `.js`              |
   * | `!.go$`     | inverse-suffix-exact-match | Items that do not end with `.go`       |
   *
   * A single pipe character acts as an OR operator. For example, the following
   * query matches entries that start with `core` and end with either`go`, `rb`,
   * or`py`.
   *
   * ```
   * ^core go$ | rb$ | py$
   * ```
   */
  class ExtendedSearch {
    constructor(
      pattern,
      {
        isCaseSensitive = Config.isCaseSensitive,
        includeMatches = Config.includeMatches,
        minMatchCharLength = Config.minMatchCharLength,
        ignoreLocation = Config.ignoreLocation,
        findAllMatches = Config.findAllMatches,
        location = Config.location,
        threshold = Config.threshold,
        distance = Config.distance
      } = {}
    ) {
      this.query = null;
      this.options = {
        isCaseSensitive,
        includeMatches,
        minMatchCharLength,
        findAllMatches,
        ignoreLocation,
        location,
        threshold,
        distance
      };

      this.pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
      this.query = parseQuery(this.pattern, this.options);
    }

    static condition(_, options) {
      return options.useExtendedSearch
    }

    searchIn(text) {
      const query = this.query;

      if (!query) {
        return {
          isMatch: false,
          score: 1
        }
      }

      const { includeMatches, isCaseSensitive } = this.options;

      text = isCaseSensitive ? text : text.toLowerCase();

      let numMatches = 0;
      let allIndices = [];
      let totalScore = 0;

      // ORs
      for (let i = 0, qLen = query.length; i < qLen; i += 1) {
        const searchers = query[i];

        // Reset indices
        allIndices.length = 0;
        numMatches = 0;

        // ANDs
        for (let j = 0, pLen = searchers.length; j < pLen; j += 1) {
          const searcher = searchers[j];
          const { isMatch, indices, score } = searcher.search(text);

          if (isMatch) {
            numMatches += 1;
            totalScore += score;
            if (includeMatches) {
              const type = searcher.constructor.type;
              if (MultiMatchSet.has(type)) {
                allIndices = [...allIndices, ...indices];
              } else {
                allIndices.push(indices);
              }
            }
          } else {
            totalScore = 0;
            numMatches = 0;
            allIndices.length = 0;
            break
          }
        }

        // OR condition, so if TRUE, return
        if (numMatches) {
          let result = {
            isMatch: true,
            score: totalScore / numMatches
          };

          if (includeMatches) {
            result.indices = allIndices;
          }

          return result
        }
      }

      // Nothing was matched
      return {
        isMatch: false,
        score: 1
      }
    }
  }

  const registeredSearchers = [];

  function register(...args) {
    registeredSearchers.push(...args);
  }

  function createSearcher(pattern, options) {
    for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
      let searcherClass = registeredSearchers[i];
      if (searcherClass.condition(pattern, options)) {
        return new searcherClass(pattern, options)
      }
    }

    return new BitapSearch(pattern, options)
  }

  const LogicalOperator = {
    AND: '$and',
    OR: '$or'
  };

  const KeyType = {
    PATH: '$path',
    PATTERN: '$val'
  };

  const isExpression = (query) =>
    !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);

  const isPath = (query) => !!query[KeyType.PATH];

  const isLeaf = (query) =>
    !isArray$2(query) && isObject$h(query) && !isExpression(query);

  const convertToExplicit = (query) => ({
    [LogicalOperator.AND]: Object.keys(query).map((key) => ({
      [key]: query[key]
    }))
  });

  // When `auto` is `true`, the parse function will infer and initialize and add
  // the appropriate `Searcher` instance
  function parse(query, options, { auto = true } = {}) {
    const next = (query) => {
      let keys = Object.keys(query);

      const isQueryPath = isPath(query);

      if (!isQueryPath && keys.length > 1 && !isExpression(query)) {
        return next(convertToExplicit(query))
      }

      if (isLeaf(query)) {
        const key = isQueryPath ? query[KeyType.PATH] : keys[0];

        const pattern = isQueryPath ? query[KeyType.PATTERN] : query[key];

        if (!isString(pattern)) {
          throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key))
        }

        const obj = {
          keyId: createKeyId(key),
          pattern
        };

        if (auto) {
          obj.searcher = createSearcher(pattern, options);
        }

        return obj
      }

      let node = {
        children: [],
        operator: keys[0]
      };

      keys.forEach((key) => {
        const value = query[key];

        if (isArray$2(value)) {
          value.forEach((item) => {
            node.children.push(next(item));
          });
        }
      });

      return node
    };

    if (!isExpression(query)) {
      query = convertToExplicit(query);
    }

    return next(query)
  }

  // Practical scoring function
  function computeScore(
    results,
    { ignoreFieldNorm = Config.ignoreFieldNorm }
  ) {
    results.forEach((result) => {
      let totalScore = 1;

      result.matches.forEach(({ key, norm, score }) => {
        const weight = key ? key.weight : null;

        totalScore *= Math.pow(
          score === 0 && weight ? Number.EPSILON : score,
          (weight || 1) * (ignoreFieldNorm ? 1 : norm)
        );
      });

      result.score = totalScore;
    });
  }

  function transformMatches(result, data) {
    const matches = result.matches;
    data.matches = [];

    if (!isDefined(matches)) {
      return
    }

    matches.forEach((match) => {
      if (!isDefined(match.indices) || !match.indices.length) {
        return
      }

      const { indices, value } = match;

      let obj = {
        indices,
        value
      };

      if (match.key) {
        obj.key = match.key.src;
      }

      if (match.idx > -1) {
        obj.refIndex = match.idx;
      }

      data.matches.push(obj);
    });
  }

  function transformScore(result, data) {
    data.score = result.score;
  }

  function format(
    results,
    docs,
    {
      includeMatches = Config.includeMatches,
      includeScore = Config.includeScore
    } = {}
  ) {
    const transformers = [];

    if (includeMatches) transformers.push(transformMatches);
    if (includeScore) transformers.push(transformScore);

    return results.map((result) => {
      const { idx } = result;

      const data = {
        item: docs[idx],
        refIndex: idx
      };

      if (transformers.length) {
        transformers.forEach((transformer) => {
          transformer(result, data);
        });
      }

      return data
    })
  }

  class Fuse {
    constructor(docs, options = {}, index) {
      this.options = { ...Config, ...options };

      if (
        this.options.useExtendedSearch &&
        !true
      ) {
        throw new Error(EXTENDED_SEARCH_UNAVAILABLE)
      }

      this._keyStore = new KeyStore(this.options.keys);

      this.setCollection(docs, index);
    }

    setCollection(docs, index) {
      this._docs = docs;

      if (index && !(index instanceof FuseIndex)) {
        throw new Error(INCORRECT_INDEX_TYPE)
      }

      this._myIndex =
        index ||
        createIndex(this.options.keys, this._docs, {
          getFn: this.options.getFn,
          fieldNormWeight: this.options.fieldNormWeight
        });
    }

    add(doc) {
      if (!isDefined(doc)) {
        return
      }

      this._docs.push(doc);
      this._myIndex.add(doc);
    }

    remove(predicate = (/* doc, idx */) => false) {
      const results = [];

      for (let i = 0, len = this._docs.length; i < len; i += 1) {
        const doc = this._docs[i];
        if (predicate(doc, i)) {
          this.removeAt(i);
          i -= 1;
          len -= 1;

          results.push(doc);
        }
      }

      return results
    }

    removeAt(idx) {
      this._docs.splice(idx, 1);
      this._myIndex.removeAt(idx);
    }

    getIndex() {
      return this._myIndex
    }

    search(query, { limit = -1 } = {}) {
      const {
        includeMatches,
        includeScore,
        shouldSort,
        sortFn,
        ignoreFieldNorm
      } = this.options;

      let results = isString(query)
        ? isString(this._docs[0])
          ? this._searchStringList(query)
          : this._searchObjectList(query)
        : this._searchLogical(query);

      computeScore(results, { ignoreFieldNorm });

      if (shouldSort) {
        results.sort(sortFn);
      }

      if (isNumber(limit) && limit > -1) {
        results = results.slice(0, limit);
      }

      return format(results, this._docs, {
        includeMatches,
        includeScore
      })
    }

    _searchStringList(query) {
      const searcher = createSearcher(query, this.options);
      const { records } = this._myIndex;
      const results = [];

      // Iterate over every string in the index
      records.forEach(({ v: text, i: idx, n: norm }) => {
        if (!isDefined(text)) {
          return
        }

        const { isMatch, score, indices } = searcher.searchIn(text);

        if (isMatch) {
          results.push({
            item: text,
            idx,
            matches: [{ score, value: text, norm, indices }]
          });
        }
      });

      return results
    }

    _searchLogical(query) {

      const expression = parse(query, this.options);

      const evaluate = (node, item, idx) => {
        if (!node.children) {
          const { keyId, searcher } = node;

          const matches = this._findMatches({
            key: this._keyStore.get(keyId),
            value: this._myIndex.getValueForItemAtKeyId(item, keyId),
            searcher
          });

          if (matches && matches.length) {
            return [
              {
                idx,
                item,
                matches
              }
            ]
          }

          return []
        }

        const res = [];
        for (let i = 0, len = node.children.length; i < len; i += 1) {
          const child = node.children[i];
          const result = evaluate(child, item, idx);
          if (result.length) {
            res.push(...result);
          } else if (node.operator === LogicalOperator.AND) {
            return []
          }
        }
        return res
      };

      const records = this._myIndex.records;
      const resultMap = {};
      const results = [];

      records.forEach(({ $: item, i: idx }) => {
        if (isDefined(item)) {
          let expResults = evaluate(expression, item, idx);

          if (expResults.length) {
            // Dedupe when adding
            if (!resultMap[idx]) {
              resultMap[idx] = { idx, item, matches: [] };
              results.push(resultMap[idx]);
            }
            expResults.forEach(({ matches }) => {
              resultMap[idx].matches.push(...matches);
            });
          }
        }
      });

      return results
    }

    _searchObjectList(query) {
      const searcher = createSearcher(query, this.options);
      const { keys, records } = this._myIndex;
      const results = [];

      // List is Array<Object>
      records.forEach(({ $: item, i: idx }) => {
        if (!isDefined(item)) {
          return
        }

        let matches = [];

        // Iterate over every key (i.e, path), and fetch the value at that key
        keys.forEach((key, keyIndex) => {
          matches.push(
            ...this._findMatches({
              key,
              value: item[keyIndex],
              searcher
            })
          );
        });

        if (matches.length) {
          results.push({
            idx,
            item,
            matches
          });
        }
      });

      return results
    }
    _findMatches({ key, value, searcher }) {
      if (!isDefined(value)) {
        return []
      }

      let matches = [];

      if (isArray$2(value)) {
        value.forEach(({ v: text, i: idx, n: norm }) => {
          if (!isDefined(text)) {
            return
          }

          const { isMatch, score, indices } = searcher.searchIn(text);

          if (isMatch) {
            matches.push({
              score,
              key,
              value: text,
              idx,
              norm,
              indices
            });
          }
        });
      } else {
        const { v: text, n: norm } = value;

        const { isMatch, score, indices } = searcher.searchIn(text);

        if (isMatch) {
          matches.push({ score, key, value: text, norm, indices });
        }
      }

      return matches
    }
  }

  Fuse.version = '6.6.2';
  Fuse.createIndex = createIndex;
  Fuse.parseIndex = parseIndex;
  Fuse.config = Config;

  {
    Fuse.parseQuery = parse;
  }

  {
    register(ExtendedSearch);
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  var check = function (it) {
    return it && it.Math == Math && it;
  };

  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  var global$k =
    // eslint-disable-next-line es/no-global-this -- safe
    check(typeof globalThis == 'object' && globalThis) ||
    check(typeof window == 'object' && window) ||
    // eslint-disable-next-line no-restricted-globals -- safe
    check(typeof self == 'object' && self) ||
    check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
    // eslint-disable-next-line no-new-func -- fallback
    (function () { return this; })() || Function('return this')();

  var sharedExports = {};
  var shared$4 = {
    get exports(){ return sharedExports; },
    set exports(v){ sharedExports = v; },
  };

  var global$j = global$k;

  // eslint-disable-next-line es/no-object-defineproperty -- safe
  var defineProperty$7 = Object.defineProperty;

  var defineGlobalProperty$3 = function (key, value) {
    try {
      defineProperty$7(global$j, key, { value: value, configurable: true, writable: true });
    } catch (error) {
      global$j[key] = value;
    } return value;
  };

  var global$i = global$k;
  var defineGlobalProperty$2 = defineGlobalProperty$3;

  var SHARED = '__core-js_shared__';
  var store$3 = global$i[SHARED] || defineGlobalProperty$2(SHARED, {});

  var sharedStore = store$3;

  var store$2 = sharedStore;

  (shared$4.exports = function (key, value) {
    return store$2[key] || (store$2[key] = value !== undefined ? value : {});
  })('versions', []).push({
    version: '3.27.0',
    mode: 'global',
    copyright: '© 2014-2022 Denis Pushkarev (zloirock.ru)',
    license: 'https://github.com/zloirock/core-js/blob/v3.27.0/LICENSE',
    source: 'https://github.com/zloirock/core-js'
  });

  var fails$o = function (exec) {
    try {
      return !!exec();
    } catch (error) {
      return true;
    }
  };

  var fails$n = fails$o;

  var functionBindNative = !fails$n(function () {
    // eslint-disable-next-line es/no-function-prototype-bind -- safe
    var test = (function () { /* empty */ }).bind();
    // eslint-disable-next-line no-prototype-builtins -- safe
    return typeof test != 'function' || test.hasOwnProperty('prototype');
  });

  var NATIVE_BIND$3 = functionBindNative;

  var FunctionPrototype$3 = Function.prototype;
  var call$e = FunctionPrototype$3.call;
  var uncurryThisWithBind = NATIVE_BIND$3 && FunctionPrototype$3.bind.bind(call$e, call$e);

  var functionUncurryThis = NATIVE_BIND$3 ? uncurryThisWithBind : function (fn) {
    return function () {
      return call$e.apply(fn, arguments);
    };
  };

  // we can't use just `it == null` since of `document.all` special case
  // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot-aec
  var isNullOrUndefined$7 = function (it) {
    return it === null || it === undefined;
  };

  var isNullOrUndefined$6 = isNullOrUndefined$7;

  var $TypeError$b = TypeError;

  // `RequireObjectCoercible` abstract operation
  // https://tc39.es/ecma262/#sec-requireobjectcoercible
  var requireObjectCoercible$6 = function (it) {
    if (isNullOrUndefined$6(it)) throw $TypeError$b("Can't call method on " + it);
    return it;
  };

  var requireObjectCoercible$5 = requireObjectCoercible$6;

  var $Object$4 = Object;

  // `ToObject` abstract operation
  // https://tc39.es/ecma262/#sec-toobject
  var toObject$6 = function (argument) {
    return $Object$4(requireObjectCoercible$5(argument));
  };

  var uncurryThis$p = functionUncurryThis;
  var toObject$5 = toObject$6;

  var hasOwnProperty$1 = uncurryThis$p({}.hasOwnProperty);

  // `HasOwnProperty` abstract operation
  // https://tc39.es/ecma262/#sec-hasownproperty
  // eslint-disable-next-line es/no-object-hasown -- safe
  var hasOwnProperty_1 = Object.hasOwn || function hasOwn(it, key) {
    return hasOwnProperty$1(toObject$5(it), key);
  };

  var uncurryThis$o = functionUncurryThis;

  var id$2 = 0;
  var postfix = Math.random();
  var toString$a = uncurryThis$o(1.0.toString);

  var uid$3 = function (key) {
    return 'Symbol(' + (key === undefined ? '' : key) + ')_' + toString$a(++id$2 + postfix, 36);
  };

  var documentAll$2 = typeof document == 'object' && document.all;

  // https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
  // eslint-disable-next-line unicorn/no-typeof-undefined -- required for testing
  var IS_HTMLDDA = typeof documentAll$2 == 'undefined' && documentAll$2 !== undefined;

  var documentAll_1 = {
    all: documentAll$2,
    IS_HTMLDDA: IS_HTMLDDA
  };

  var $documentAll$1 = documentAll_1;

  var documentAll$1 = $documentAll$1.all;

  // `IsCallable` abstract operation
  // https://tc39.es/ecma262/#sec-iscallable
  var isCallable$k = $documentAll$1.IS_HTMLDDA ? function (argument) {
    return typeof argument == 'function' || argument === documentAll$1;
  } : function (argument) {
    return typeof argument == 'function';
  };

  var global$h = global$k;
  var isCallable$j = isCallable$k;

  var aFunction = function (argument) {
    return isCallable$j(argument) ? argument : undefined;
  };

  var getBuiltIn$5 = function (namespace, method) {
    return arguments.length < 2 ? aFunction(global$h[namespace]) : global$h[namespace] && global$h[namespace][method];
  };

  var getBuiltIn$4 = getBuiltIn$5;

  var engineUserAgent = getBuiltIn$4('navigator', 'userAgent') || '';

  var global$g = global$k;
  var userAgent = engineUserAgent;

  var process$1 = global$g.process;
  var Deno = global$g.Deno;
  var versions = process$1 && process$1.versions || Deno && Deno.version;
  var v8 = versions && versions.v8;
  var match, version$1;

  if (v8) {
    match = v8.split('.');
    // in old Chrome, versions of V8 isn't V8 = Chrome / 10
    // but their correct versions are not interesting for us
    version$1 = match[0] > 0 && match[0] < 4 ? 1 : +(match[0] + match[1]);
  }

  // BrowserFS NodeJS `process` polyfill incorrectly set `.v8` to `0.0`
  // so check `userAgent` even if `.v8` exists, but 0
  if (!version$1 && userAgent) {
    match = userAgent.match(/Edge\/(\d+)/);
    if (!match || match[1] >= 74) {
      match = userAgent.match(/Chrome\/(\d+)/);
      if (match) version$1 = +match[1];
    }
  }

  var engineV8Version = version$1;

  /* eslint-disable es/no-symbol -- required for testing */

  var V8_VERSION$1 = engineV8Version;
  var fails$m = fails$o;

  // eslint-disable-next-line es/no-object-getownpropertysymbols -- required for testing
  var symbolConstructorDetection = !!Object.getOwnPropertySymbols && !fails$m(function () {
    var symbol = Symbol();
    // Chrome 38 Symbol has incorrect toString conversion
    // `get-own-property-symbols` polyfill symbols converted to object are not Symbol instances
    return !String(symbol) || !(Object(symbol) instanceof Symbol) ||
      // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
      !Symbol.sham && V8_VERSION$1 && V8_VERSION$1 < 41;
  });

  /* eslint-disable es/no-symbol -- required for testing */

  var NATIVE_SYMBOL$1 = symbolConstructorDetection;

  var useSymbolAsUid = NATIVE_SYMBOL$1
    && !Symbol.sham
    && typeof Symbol.iterator == 'symbol';

  var global$f = global$k;
  var shared$3 = sharedExports;
  var hasOwn$a = hasOwnProperty_1;
  var uid$2 = uid$3;
  var NATIVE_SYMBOL = symbolConstructorDetection;
  var USE_SYMBOL_AS_UID$1 = useSymbolAsUid;

  var WellKnownSymbolsStore = shared$3('wks');
  var Symbol$2 = global$f.Symbol;
  var symbolFor = Symbol$2 && Symbol$2['for'];
  var createWellKnownSymbol = USE_SYMBOL_AS_UID$1 ? Symbol$2 : Symbol$2 && Symbol$2.withoutSetter || uid$2;

  var wellKnownSymbol$f = function (name) {
    if (!hasOwn$a(WellKnownSymbolsStore, name) || !(NATIVE_SYMBOL || typeof WellKnownSymbolsStore[name] == 'string')) {
      var description = 'Symbol.' + name;
      if (NATIVE_SYMBOL && hasOwn$a(Symbol$2, name)) {
        WellKnownSymbolsStore[name] = Symbol$2[name];
      } else if (USE_SYMBOL_AS_UID$1 && symbolFor) {
        WellKnownSymbolsStore[name] = symbolFor(description);
      } else {
        WellKnownSymbolsStore[name] = createWellKnownSymbol(description);
      }
    } return WellKnownSymbolsStore[name];
  };

  var wellKnownSymbol$e = wellKnownSymbol$f;

  var TO_STRING_TAG$3 = wellKnownSymbol$e('toStringTag');
  var test = {};

  test[TO_STRING_TAG$3] = 'z';

  var toStringTagSupport = String(test) === '[object z]';

  var objectDefineProperty = {};

  var fails$l = fails$o;

  // Detect IE8's incomplete defineProperty implementation
  var descriptors = !fails$l(function () {
    // eslint-disable-next-line es/no-object-defineproperty -- required for testing
    return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] != 7;
  });

  var isCallable$i = isCallable$k;
  var $documentAll = documentAll_1;

  var documentAll = $documentAll.all;

  var isObject$g = $documentAll.IS_HTMLDDA ? function (it) {
    return typeof it == 'object' ? it !== null : isCallable$i(it) || it === documentAll;
  } : function (it) {
    return typeof it == 'object' ? it !== null : isCallable$i(it);
  };

  var global$e = global$k;
  var isObject$f = isObject$g;

  var document$1 = global$e.document;
  // typeof document.createElement is 'object' in old IE
  var EXISTS$1 = isObject$f(document$1) && isObject$f(document$1.createElement);

  var documentCreateElement$2 = function (it) {
    return EXISTS$1 ? document$1.createElement(it) : {};
  };

  var DESCRIPTORS$a = descriptors;
  var fails$k = fails$o;
  var createElement = documentCreateElement$2;

  // Thanks to IE8 for its funny defineProperty
  var ie8DomDefine = !DESCRIPTORS$a && !fails$k(function () {
    // eslint-disable-next-line es/no-object-defineproperty -- required for testing
    return Object.defineProperty(createElement('div'), 'a', {
      get: function () { return 7; }
    }).a != 7;
  });

  var DESCRIPTORS$9 = descriptors;
  var fails$j = fails$o;

  // V8 ~ Chrome 36-
  // https://bugs.chromium.org/p/v8/issues/detail?id=3334
  var v8PrototypeDefineBug = DESCRIPTORS$9 && fails$j(function () {
    // eslint-disable-next-line es/no-object-defineproperty -- required for testing
    return Object.defineProperty(function () { /* empty */ }, 'prototype', {
      value: 42,
      writable: false
    }).prototype != 42;
  });

  var isObject$e = isObject$g;

  var $String$3 = String;
  var $TypeError$a = TypeError;

  // `Assert: Type(argument) is Object`
  var anObject$d = function (argument) {
    if (isObject$e(argument)) return argument;
    throw $TypeError$a($String$3(argument) + ' is not an object');
  };

  var NATIVE_BIND$2 = functionBindNative;

  var call$d = Function.prototype.call;

  var functionCall = NATIVE_BIND$2 ? call$d.bind(call$d) : function () {
    return call$d.apply(call$d, arguments);
  };

  var uncurryThis$n = functionUncurryThis;

  var objectIsPrototypeOf = uncurryThis$n({}.isPrototypeOf);

  var getBuiltIn$3 = getBuiltIn$5;
  var isCallable$h = isCallable$k;
  var isPrototypeOf$2 = objectIsPrototypeOf;
  var USE_SYMBOL_AS_UID = useSymbolAsUid;

  var $Object$3 = Object;

  var isSymbol$4 = USE_SYMBOL_AS_UID ? function (it) {
    return typeof it == 'symbol';
  } : function (it) {
    var $Symbol = getBuiltIn$3('Symbol');
    return isCallable$h($Symbol) && isPrototypeOf$2($Symbol.prototype, $Object$3(it));
  };

  var $String$2 = String;

  var tryToString$3 = function (argument) {
    try {
      return $String$2(argument);
    } catch (error) {
      return 'Object';
    }
  };

  var isCallable$g = isCallable$k;
  var tryToString$2 = tryToString$3;

  var $TypeError$9 = TypeError;

  // `Assert: IsCallable(argument) is true`
  var aCallable$4 = function (argument) {
    if (isCallable$g(argument)) return argument;
    throw $TypeError$9(tryToString$2(argument) + ' is not a function');
  };

  var aCallable$3 = aCallable$4;
  var isNullOrUndefined$5 = isNullOrUndefined$7;

  // `GetMethod` abstract operation
  // https://tc39.es/ecma262/#sec-getmethod
  var getMethod$5 = function (V, P) {
    var func = V[P];
    return isNullOrUndefined$5(func) ? undefined : aCallable$3(func);
  };

  var call$c = functionCall;
  var isCallable$f = isCallable$k;
  var isObject$d = isObject$g;

  var $TypeError$8 = TypeError;

  // `OrdinaryToPrimitive` abstract operation
  // https://tc39.es/ecma262/#sec-ordinarytoprimitive
  var ordinaryToPrimitive$1 = function (input, pref) {
    var fn, val;
    if (pref === 'string' && isCallable$f(fn = input.toString) && !isObject$d(val = call$c(fn, input))) return val;
    if (isCallable$f(fn = input.valueOf) && !isObject$d(val = call$c(fn, input))) return val;
    if (pref !== 'string' && isCallable$f(fn = input.toString) && !isObject$d(val = call$c(fn, input))) return val;
    throw $TypeError$8("Can't convert object to primitive value");
  };

  var call$b = functionCall;
  var isObject$c = isObject$g;
  var isSymbol$3 = isSymbol$4;
  var getMethod$4 = getMethod$5;
  var ordinaryToPrimitive = ordinaryToPrimitive$1;
  var wellKnownSymbol$d = wellKnownSymbol$f;

  var $TypeError$7 = TypeError;
  var TO_PRIMITIVE = wellKnownSymbol$d('toPrimitive');

  // `ToPrimitive` abstract operation
  // https://tc39.es/ecma262/#sec-toprimitive
  var toPrimitive$1 = function (input, pref) {
    if (!isObject$c(input) || isSymbol$3(input)) return input;
    var exoticToPrim = getMethod$4(input, TO_PRIMITIVE);
    var result;
    if (exoticToPrim) {
      if (pref === undefined) pref = 'default';
      result = call$b(exoticToPrim, input, pref);
      if (!isObject$c(result) || isSymbol$3(result)) return result;
      throw $TypeError$7("Can't convert object to primitive value");
    }
    if (pref === undefined) pref = 'number';
    return ordinaryToPrimitive(input, pref);
  };

  var toPrimitive = toPrimitive$1;
  var isSymbol$2 = isSymbol$4;

  // `ToPropertyKey` abstract operation
  // https://tc39.es/ecma262/#sec-topropertykey
  var toPropertyKey$3 = function (argument) {
    var key = toPrimitive(argument, 'string');
    return isSymbol$2(key) ? key : key + '';
  };

  var DESCRIPTORS$8 = descriptors;
  var IE8_DOM_DEFINE$1 = ie8DomDefine;
  var V8_PROTOTYPE_DEFINE_BUG$1 = v8PrototypeDefineBug;
  var anObject$c = anObject$d;
  var toPropertyKey$2 = toPropertyKey$3;

  var $TypeError$6 = TypeError;
  // eslint-disable-next-line es/no-object-defineproperty -- safe
  var $defineProperty = Object.defineProperty;
  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
  var $getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;
  var ENUMERABLE = 'enumerable';
  var CONFIGURABLE$1 = 'configurable';
  var WRITABLE = 'writable';

  // `Object.defineProperty` method
  // https://tc39.es/ecma262/#sec-object.defineproperty
  objectDefineProperty.f = DESCRIPTORS$8 ? V8_PROTOTYPE_DEFINE_BUG$1 ? function defineProperty(O, P, Attributes) {
    anObject$c(O);
    P = toPropertyKey$2(P);
    anObject$c(Attributes);
    if (typeof O === 'function' && P === 'prototype' && 'value' in Attributes && WRITABLE in Attributes && !Attributes[WRITABLE]) {
      var current = $getOwnPropertyDescriptor$1(O, P);
      if (current && current[WRITABLE]) {
        O[P] = Attributes.value;
        Attributes = {
          configurable: CONFIGURABLE$1 in Attributes ? Attributes[CONFIGURABLE$1] : current[CONFIGURABLE$1],
          enumerable: ENUMERABLE in Attributes ? Attributes[ENUMERABLE] : current[ENUMERABLE],
          writable: false
        };
      }
    } return $defineProperty(O, P, Attributes);
  } : $defineProperty : function defineProperty(O, P, Attributes) {
    anObject$c(O);
    P = toPropertyKey$2(P);
    anObject$c(Attributes);
    if (IE8_DOM_DEFINE$1) try {
      return $defineProperty(O, P, Attributes);
    } catch (error) { /* empty */ }
    if ('get' in Attributes || 'set' in Attributes) throw $TypeError$6('Accessors not supported');
    if ('value' in Attributes) O[P] = Attributes.value;
    return O;
  };

  var makeBuiltInExports = {};
  var makeBuiltIn$2 = {
    get exports(){ return makeBuiltInExports; },
    set exports(v){ makeBuiltInExports = v; },
  };

  var DESCRIPTORS$7 = descriptors;
  var hasOwn$9 = hasOwnProperty_1;

  var FunctionPrototype$2 = Function.prototype;
  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
  var getDescriptor = DESCRIPTORS$7 && Object.getOwnPropertyDescriptor;

  var EXISTS = hasOwn$9(FunctionPrototype$2, 'name');
  // additional protection from minified / mangled / dropped function names
  var PROPER = EXISTS && (function something() { /* empty */ }).name === 'something';
  var CONFIGURABLE = EXISTS && (!DESCRIPTORS$7 || (DESCRIPTORS$7 && getDescriptor(FunctionPrototype$2, 'name').configurable));

  var functionName = {
    EXISTS: EXISTS,
    PROPER: PROPER,
    CONFIGURABLE: CONFIGURABLE
  };

  var uncurryThis$m = functionUncurryThis;
  var isCallable$e = isCallable$k;
  var store$1 = sharedStore;

  var functionToString$1 = uncurryThis$m(Function.toString);

  // this helper broken in `core-js@3.4.1-3.4.4`, so we can't use `shared` helper
  if (!isCallable$e(store$1.inspectSource)) {
    store$1.inspectSource = function (it) {
      return functionToString$1(it);
    };
  }

  var inspectSource$2 = store$1.inspectSource;

  var global$d = global$k;
  var isCallable$d = isCallable$k;

  var WeakMap$2 = global$d.WeakMap;

  var weakMapBasicDetection = isCallable$d(WeakMap$2) && /native code/.test(String(WeakMap$2));

  var createPropertyDescriptor$4 = function (bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };

  var DESCRIPTORS$6 = descriptors;
  var definePropertyModule$4 = objectDefineProperty;
  var createPropertyDescriptor$3 = createPropertyDescriptor$4;

  var createNonEnumerableProperty$6 = DESCRIPTORS$6 ? function (object, key, value) {
    return definePropertyModule$4.f(object, key, createPropertyDescriptor$3(1, value));
  } : function (object, key, value) {
    object[key] = value;
    return object;
  };

  var shared$2 = sharedExports;
  var uid$1 = uid$3;

  var keys = shared$2('keys');

  var sharedKey$3 = function (key) {
    return keys[key] || (keys[key] = uid$1(key));
  };

  var hiddenKeys$5 = {};

  var NATIVE_WEAK_MAP$1 = weakMapBasicDetection;
  var global$c = global$k;
  var isObject$b = isObject$g;
  var createNonEnumerableProperty$5 = createNonEnumerableProperty$6;
  var hasOwn$8 = hasOwnProperty_1;
  var shared$1 = sharedStore;
  var sharedKey$2 = sharedKey$3;
  var hiddenKeys$4 = hiddenKeys$5;

  var OBJECT_ALREADY_INITIALIZED = 'Object already initialized';
  var TypeError$1 = global$c.TypeError;
  var WeakMap$1 = global$c.WeakMap;
  var set, get, has;

  var enforce = function (it) {
    return has(it) ? get(it) : set(it, {});
  };

  var getterFor = function (TYPE) {
    return function (it) {
      var state;
      if (!isObject$b(it) || (state = get(it)).type !== TYPE) {
        throw TypeError$1('Incompatible receiver, ' + TYPE + ' required');
      } return state;
    };
  };

  if (NATIVE_WEAK_MAP$1 || shared$1.state) {
    var store = shared$1.state || (shared$1.state = new WeakMap$1());
    /* eslint-disable no-self-assign -- prototype methods protection */
    store.get = store.get;
    store.has = store.has;
    store.set = store.set;
    /* eslint-enable no-self-assign -- prototype methods protection */
    set = function (it, metadata) {
      if (store.has(it)) throw TypeError$1(OBJECT_ALREADY_INITIALIZED);
      metadata.facade = it;
      store.set(it, metadata);
      return metadata;
    };
    get = function (it) {
      return store.get(it) || {};
    };
    has = function (it) {
      return store.has(it);
    };
  } else {
    var STATE = sharedKey$2('state');
    hiddenKeys$4[STATE] = true;
    set = function (it, metadata) {
      if (hasOwn$8(it, STATE)) throw TypeError$1(OBJECT_ALREADY_INITIALIZED);
      metadata.facade = it;
      createNonEnumerableProperty$5(it, STATE, metadata);
      return metadata;
    };
    get = function (it) {
      return hasOwn$8(it, STATE) ? it[STATE] : {};
    };
    has = function (it) {
      return hasOwn$8(it, STATE);
    };
  }

  var internalState = {
    set: set,
    get: get,
    has: has,
    enforce: enforce,
    getterFor: getterFor
  };

  var fails$i = fails$o;
  var isCallable$c = isCallable$k;
  var hasOwn$7 = hasOwnProperty_1;
  var DESCRIPTORS$5 = descriptors;
  var CONFIGURABLE_FUNCTION_NAME$1 = functionName.CONFIGURABLE;
  var inspectSource$1 = inspectSource$2;
  var InternalStateModule$3 = internalState;

  var enforceInternalState$1 = InternalStateModule$3.enforce;
  var getInternalState$3 = InternalStateModule$3.get;
  // eslint-disable-next-line es/no-object-defineproperty -- safe
  var defineProperty$6 = Object.defineProperty;

  var CONFIGURABLE_LENGTH = DESCRIPTORS$5 && !fails$i(function () {
    return defineProperty$6(function () { /* empty */ }, 'length', { value: 8 }).length !== 8;
  });

  var TEMPLATE = String(String).split('String');

  var makeBuiltIn$1 = makeBuiltIn$2.exports = function (value, name, options) {
    if (String(name).slice(0, 7) === 'Symbol(') {
      name = '[' + String(name).replace(/^Symbol\(([^)]*)\)/, '$1') + ']';
    }
    if (options && options.getter) name = 'get ' + name;
    if (options && options.setter) name = 'set ' + name;
    if (!hasOwn$7(value, 'name') || (CONFIGURABLE_FUNCTION_NAME$1 && value.name !== name)) {
      if (DESCRIPTORS$5) defineProperty$6(value, 'name', { value: name, configurable: true });
      else value.name = name;
    }
    if (CONFIGURABLE_LENGTH && options && hasOwn$7(options, 'arity') && value.length !== options.arity) {
      defineProperty$6(value, 'length', { value: options.arity });
    }
    try {
      if (options && hasOwn$7(options, 'constructor') && options.constructor) {
        if (DESCRIPTORS$5) defineProperty$6(value, 'prototype', { writable: false });
      // in V8 ~ Chrome 53, prototypes of some methods, like `Array.prototype.values`, are non-writable
      } else if (value.prototype) value.prototype = undefined;
    } catch (error) { /* empty */ }
    var state = enforceInternalState$1(value);
    if (!hasOwn$7(state, 'source')) {
      state.source = TEMPLATE.join(typeof name == 'string' ? name : '');
    } return value;
  };

  // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
  // eslint-disable-next-line no-extend-native -- required
  Function.prototype.toString = makeBuiltIn$1(function toString() {
    return isCallable$c(this) && getInternalState$3(this).source || inspectSource$1(this);
  }, 'toString');

  var isCallable$b = isCallable$k;
  var definePropertyModule$3 = objectDefineProperty;
  var makeBuiltIn = makeBuiltInExports;
  var defineGlobalProperty$1 = defineGlobalProperty$3;

  var defineBuiltIn$7 = function (O, key, value, options) {
    if (!options) options = {};
    var simple = options.enumerable;
    var name = options.name !== undefined ? options.name : key;
    if (isCallable$b(value)) makeBuiltIn(value, name, options);
    if (options.global) {
      if (simple) O[key] = value;
      else defineGlobalProperty$1(key, value);
    } else {
      try {
        if (!options.unsafe) delete O[key];
        else if (O[key]) simple = true;
      } catch (error) { /* empty */ }
      if (simple) O[key] = value;
      else definePropertyModule$3.f(O, key, {
        value: value,
        enumerable: false,
        configurable: !options.nonConfigurable,
        writable: !options.nonWritable
      });
    } return O;
  };

  var uncurryThis$l = functionUncurryThis;

  var toString$9 = uncurryThis$l({}.toString);
  var stringSlice$4 = uncurryThis$l(''.slice);

  var classofRaw$2 = function (it) {
    return stringSlice$4(toString$9(it), 8, -1);
  };

  var TO_STRING_TAG_SUPPORT$2 = toStringTagSupport;
  var isCallable$a = isCallable$k;
  var classofRaw$1 = classofRaw$2;
  var wellKnownSymbol$c = wellKnownSymbol$f;

  var TO_STRING_TAG$2 = wellKnownSymbol$c('toStringTag');
  var $Object$2 = Object;

  // ES3 wrong here
  var CORRECT_ARGUMENTS = classofRaw$1(function () { return arguments; }()) == 'Arguments';

  // fallback for IE11 Script Access Denied error
  var tryGet = function (it, key) {
    try {
      return it[key];
    } catch (error) { /* empty */ }
  };

  // getting tag from ES6+ `Object.prototype.toString`
  var classof$a = TO_STRING_TAG_SUPPORT$2 ? classofRaw$1 : function (it) {
    var O, tag, result;
    return it === undefined ? 'Undefined' : it === null ? 'Null'
      // @@toStringTag case
      : typeof (tag = tryGet(O = $Object$2(it), TO_STRING_TAG$2)) == 'string' ? tag
      // builtinTag case
      : CORRECT_ARGUMENTS ? classofRaw$1(O)
      // ES3 arguments fallback
      : (result = classofRaw$1(O)) == 'Object' && isCallable$a(O.callee) ? 'Arguments' : result;
  };

  var TO_STRING_TAG_SUPPORT$1 = toStringTagSupport;
  var classof$9 = classof$a;

  // `Object.prototype.toString` method implementation
  // https://tc39.es/ecma262/#sec-object.prototype.tostring
  var objectToString$3 = TO_STRING_TAG_SUPPORT$1 ? {}.toString : function toString() {
    return '[object ' + classof$9(this) + ']';
  };

  var TO_STRING_TAG_SUPPORT = toStringTagSupport;
  var defineBuiltIn$6 = defineBuiltIn$7;
  var toString$8 = objectToString$3;

  // `Object.prototype.toString` method
  // https://tc39.es/ecma262/#sec-object.prototype.tostring
  if (!TO_STRING_TAG_SUPPORT) {
    defineBuiltIn$6(Object.prototype, 'toString', toString$8, { unsafe: true });
  }

  // iterable DOM collections
  // flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
  var domIterables = {
    CSSRuleList: 0,
    CSSStyleDeclaration: 0,
    CSSValueList: 0,
    ClientRectList: 0,
    DOMRectList: 0,
    DOMStringList: 0,
    DOMTokenList: 1,
    DataTransferItemList: 0,
    FileList: 0,
    HTMLAllCollection: 0,
    HTMLCollection: 0,
    HTMLFormElement: 0,
    HTMLSelectElement: 0,
    MediaList: 0,
    MimeTypeArray: 0,
    NamedNodeMap: 0,
    NodeList: 1,
    PaintRequestList: 0,
    Plugin: 0,
    PluginArray: 0,
    SVGLengthList: 0,
    SVGNumberList: 0,
    SVGPathSegList: 0,
    SVGPointList: 0,
    SVGStringList: 0,
    SVGTransformList: 0,
    SourceBufferList: 0,
    StyleSheetList: 0,
    TextTrackCueList: 0,
    TextTrackList: 0,
    TouchList: 0
  };

  // in old WebKit versions, `element.classList` is not an instance of global `DOMTokenList`
  var documentCreateElement$1 = documentCreateElement$2;

  var classList = documentCreateElement$1('span').classList;
  var DOMTokenListPrototype$2 = classList && classList.constructor && classList.constructor.prototype;

  var domTokenListPrototype = DOMTokenListPrototype$2 === Object.prototype ? undefined : DOMTokenListPrototype$2;

  var classofRaw = classofRaw$2;
  var uncurryThis$k = functionUncurryThis;

  var functionUncurryThisClause = function (fn) {
    // Nashorn bug:
    //   https://github.com/zloirock/core-js/issues/1128
    //   https://github.com/zloirock/core-js/issues/1130
    if (classofRaw(fn) === 'Function') return uncurryThis$k(fn);
  };

  var uncurryThis$j = functionUncurryThisClause;
  var aCallable$2 = aCallable$4;
  var NATIVE_BIND$1 = functionBindNative;

  var bind$2 = uncurryThis$j(uncurryThis$j.bind);

  // optional / simple context binding
  var functionBindContext = function (fn, that) {
    aCallable$2(fn);
    return that === undefined ? fn : NATIVE_BIND$1 ? bind$2(fn, that) : function (/* ...args */) {
      return fn.apply(that, arguments);
    };
  };

  var uncurryThis$i = functionUncurryThis;
  var fails$h = fails$o;
  var classof$8 = classofRaw$2;

  var $Object$1 = Object;
  var split = uncurryThis$i(''.split);

  // fallback for non-array-like ES3 and non-enumerable old V8 strings
  var indexedObject = fails$h(function () {
    // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
    // eslint-disable-next-line no-prototype-builtins -- safe
    return !$Object$1('z').propertyIsEnumerable(0);
  }) ? function (it) {
    return classof$8(it) == 'String' ? split(it, '') : $Object$1(it);
  } : $Object$1;

  var ceil = Math.ceil;
  var floor$1 = Math.floor;

  // `Math.trunc` method
  // https://tc39.es/ecma262/#sec-math.trunc
  // eslint-disable-next-line es/no-math-trunc -- safe
  var mathTrunc = Math.trunc || function trunc(x) {
    var n = +x;
    return (n > 0 ? floor$1 : ceil)(n);
  };

  var trunc = mathTrunc;

  // `ToIntegerOrInfinity` abstract operation
  // https://tc39.es/ecma262/#sec-tointegerorinfinity
  var toIntegerOrInfinity$4 = function (argument) {
    var number = +argument;
    // eslint-disable-next-line no-self-compare -- NaN check
    return number !== number || number === 0 ? 0 : trunc(number);
  };

  var toIntegerOrInfinity$3 = toIntegerOrInfinity$4;

  var min$2 = Math.min;

  // `ToLength` abstract operation
  // https://tc39.es/ecma262/#sec-tolength
  var toLength$3 = function (argument) {
    return argument > 0 ? min$2(toIntegerOrInfinity$3(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
  };

  var toLength$2 = toLength$3;

  // `LengthOfArrayLike` abstract operation
  // https://tc39.es/ecma262/#sec-lengthofarraylike
  var lengthOfArrayLike$5 = function (obj) {
    return toLength$2(obj.length);
  };

  var classof$7 = classofRaw$2;

  // `IsArray` abstract operation
  // https://tc39.es/ecma262/#sec-isarray
  // eslint-disable-next-line es/no-array-isarray -- safe
  var isArray$1 = Array.isArray || function isArray(argument) {
    return classof$7(argument) == 'Array';
  };

  var uncurryThis$h = functionUncurryThis;
  var fails$g = fails$o;
  var isCallable$9 = isCallable$k;
  var classof$6 = classof$a;
  var getBuiltIn$2 = getBuiltIn$5;
  var inspectSource = inspectSource$2;

  var noop = function () { /* empty */ };
  var empty = [];
  var construct = getBuiltIn$2('Reflect', 'construct');
  var constructorRegExp = /^\s*(?:class|function)\b/;
  var exec$2 = uncurryThis$h(constructorRegExp.exec);
  var INCORRECT_TO_STRING = !constructorRegExp.exec(noop);

  var isConstructorModern = function isConstructor(argument) {
    if (!isCallable$9(argument)) return false;
    try {
      construct(noop, empty, argument);
      return true;
    } catch (error) {
      return false;
    }
  };

  var isConstructorLegacy = function isConstructor(argument) {
    if (!isCallable$9(argument)) return false;
    switch (classof$6(argument)) {
      case 'AsyncFunction':
      case 'GeneratorFunction':
      case 'AsyncGeneratorFunction': return false;
    }
    try {
      // we can't check .prototype since constructors produced by .bind haven't it
      // `Function#toString` throws on some built-it function in some legacy engines
      // (for example, `DOMQuad` and similar in FF41-)
      return INCORRECT_TO_STRING || !!exec$2(constructorRegExp, inspectSource(argument));
    } catch (error) {
      return true;
    }
  };

  isConstructorLegacy.sham = true;

  // `IsConstructor` abstract operation
  // https://tc39.es/ecma262/#sec-isconstructor
  var isConstructor$1 = !construct || fails$g(function () {
    var called;
    return isConstructorModern(isConstructorModern.call)
      || !isConstructorModern(Object)
      || !isConstructorModern(function () { called = true; })
      || called;
  }) ? isConstructorLegacy : isConstructorModern;

  var isArray = isArray$1;
  var isConstructor = isConstructor$1;
  var isObject$a = isObject$g;
  var wellKnownSymbol$b = wellKnownSymbol$f;

  var SPECIES$2 = wellKnownSymbol$b('species');
  var $Array$1 = Array;

  // a part of `ArraySpeciesCreate` abstract operation
  // https://tc39.es/ecma262/#sec-arrayspeciescreate
  var arraySpeciesConstructor$1 = function (originalArray) {
    var C;
    if (isArray(originalArray)) {
      C = originalArray.constructor;
      // cross-realm fallback
      if (isConstructor(C) && (C === $Array$1 || isArray(C.prototype))) C = undefined;
      else if (isObject$a(C)) {
        C = C[SPECIES$2];
        if (C === null) C = undefined;
      }
    } return C === undefined ? $Array$1 : C;
  };

  var arraySpeciesConstructor = arraySpeciesConstructor$1;

  // `ArraySpeciesCreate` abstract operation
  // https://tc39.es/ecma262/#sec-arrayspeciescreate
  var arraySpeciesCreate$1 = function (originalArray, length) {
    return new (arraySpeciesConstructor(originalArray))(length === 0 ? 0 : length);
  };

  var bind$1 = functionBindContext;
  var uncurryThis$g = functionUncurryThis;
  var IndexedObject$3 = indexedObject;
  var toObject$4 = toObject$6;
  var lengthOfArrayLike$4 = lengthOfArrayLike$5;
  var arraySpeciesCreate = arraySpeciesCreate$1;

  var push$2 = uncurryThis$g([].push);

  // `Array.prototype.{ forEach, map, filter, some, every, find, findIndex, filterReject }` methods implementation
  var createMethod$4 = function (TYPE) {
    var IS_MAP = TYPE == 1;
    var IS_FILTER = TYPE == 2;
    var IS_SOME = TYPE == 3;
    var IS_EVERY = TYPE == 4;
    var IS_FIND_INDEX = TYPE == 6;
    var IS_FILTER_REJECT = TYPE == 7;
    var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
    return function ($this, callbackfn, that, specificCreate) {
      var O = toObject$4($this);
      var self = IndexedObject$3(O);
      var boundFunction = bind$1(callbackfn, that);
      var length = lengthOfArrayLike$4(self);
      var index = 0;
      var create = specificCreate || arraySpeciesCreate;
      var target = IS_MAP ? create($this, length) : IS_FILTER || IS_FILTER_REJECT ? create($this, 0) : undefined;
      var value, result;
      for (;length > index; index++) if (NO_HOLES || index in self) {
        value = self[index];
        result = boundFunction(value, index, O);
        if (TYPE) {
          if (IS_MAP) target[index] = result; // map
          else if (result) switch (TYPE) {
            case 3: return true;              // some
            case 5: return value;             // find
            case 6: return index;             // findIndex
            case 2: push$2(target, value);      // filter
          } else switch (TYPE) {
            case 4: return false;             // every
            case 7: push$2(target, value);      // filterReject
          }
        }
      }
      return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
    };
  };

  var arrayIteration = {
    // `Array.prototype.forEach` method
    // https://tc39.es/ecma262/#sec-array.prototype.foreach
    forEach: createMethod$4(0),
    // `Array.prototype.map` method
    // https://tc39.es/ecma262/#sec-array.prototype.map
    map: createMethod$4(1),
    // `Array.prototype.filter` method
    // https://tc39.es/ecma262/#sec-array.prototype.filter
    filter: createMethod$4(2),
    // `Array.prototype.some` method
    // https://tc39.es/ecma262/#sec-array.prototype.some
    some: createMethod$4(3),
    // `Array.prototype.every` method
    // https://tc39.es/ecma262/#sec-array.prototype.every
    every: createMethod$4(4),
    // `Array.prototype.find` method
    // https://tc39.es/ecma262/#sec-array.prototype.find
    find: createMethod$4(5),
    // `Array.prototype.findIndex` method
    // https://tc39.es/ecma262/#sec-array.prototype.findIndex
    findIndex: createMethod$4(6),
    // `Array.prototype.filterReject` method
    // https://github.com/tc39/proposal-array-filtering
    filterReject: createMethod$4(7)
  };

  var fails$f = fails$o;

  var arrayMethodIsStrict$2 = function (METHOD_NAME, argument) {
    var method = [][METHOD_NAME];
    return !!method && fails$f(function () {
      // eslint-disable-next-line no-useless-call -- required for testing
      method.call(null, argument || function () { return 1; }, 1);
    });
  };

  var $forEach = arrayIteration.forEach;
  var arrayMethodIsStrict$1 = arrayMethodIsStrict$2;

  var STRICT_METHOD$1 = arrayMethodIsStrict$1('forEach');

  // `Array.prototype.forEach` method implementation
  // https://tc39.es/ecma262/#sec-array.prototype.foreach
  var arrayForEach = !STRICT_METHOD$1 ? function forEach(callbackfn /* , thisArg */) {
    return $forEach(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  // eslint-disable-next-line es/no-array-prototype-foreach -- safe
  } : [].forEach;

  var global$b = global$k;
  var DOMIterables$1 = domIterables;
  var DOMTokenListPrototype$1 = domTokenListPrototype;
  var forEach = arrayForEach;
  var createNonEnumerableProperty$4 = createNonEnumerableProperty$6;

  var handlePrototype$1 = function (CollectionPrototype) {
    // some Chrome versions have non-configurable methods on DOMTokenList
    if (CollectionPrototype && CollectionPrototype.forEach !== forEach) try {
      createNonEnumerableProperty$4(CollectionPrototype, 'forEach', forEach);
    } catch (error) {
      CollectionPrototype.forEach = forEach;
    }
  };

  for (var COLLECTION_NAME$1 in DOMIterables$1) {
    if (DOMIterables$1[COLLECTION_NAME$1]) {
      handlePrototype$1(global$b[COLLECTION_NAME$1] && global$b[COLLECTION_NAME$1].prototype);
    }
  }

  handlePrototype$1(DOMTokenListPrototype$1);

  var canUseDOM = !!(
    typeof window !== 'undefined' &&
    window.document &&
    window.document.createElement
  );

  var canUseDom = canUseDOM;

  var objectGetOwnPropertyDescriptor = {};

  var objectPropertyIsEnumerable = {};

  var $propertyIsEnumerable = {}.propertyIsEnumerable;
  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
  var getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

  // Nashorn ~ JDK8 bug
  var NASHORN_BUG = getOwnPropertyDescriptor$1 && !$propertyIsEnumerable.call({ 1: 2 }, 1);

  // `Object.prototype.propertyIsEnumerable` method implementation
  // https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
  objectPropertyIsEnumerable.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
    var descriptor = getOwnPropertyDescriptor$1(this, V);
    return !!descriptor && descriptor.enumerable;
  } : $propertyIsEnumerable;

  // toObject with fallback for non-array-like ES3 strings
  var IndexedObject$2 = indexedObject;
  var requireObjectCoercible$4 = requireObjectCoercible$6;

  var toIndexedObject$6 = function (it) {
    return IndexedObject$2(requireObjectCoercible$4(it));
  };

  var DESCRIPTORS$4 = descriptors;
  var call$a = functionCall;
  var propertyIsEnumerableModule$1 = objectPropertyIsEnumerable;
  var createPropertyDescriptor$2 = createPropertyDescriptor$4;
  var toIndexedObject$5 = toIndexedObject$6;
  var toPropertyKey$1 = toPropertyKey$3;
  var hasOwn$6 = hasOwnProperty_1;
  var IE8_DOM_DEFINE = ie8DomDefine;

  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
  var $getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

  // `Object.getOwnPropertyDescriptor` method
  // https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
  objectGetOwnPropertyDescriptor.f = DESCRIPTORS$4 ? $getOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
    O = toIndexedObject$5(O);
    P = toPropertyKey$1(P);
    if (IE8_DOM_DEFINE) try {
      return $getOwnPropertyDescriptor(O, P);
    } catch (error) { /* empty */ }
    if (hasOwn$6(O, P)) return createPropertyDescriptor$2(!call$a(propertyIsEnumerableModule$1.f, O, P), O[P]);
  };

  var objectGetOwnPropertyNames = {};

  var toIntegerOrInfinity$2 = toIntegerOrInfinity$4;

  var max$2 = Math.max;
  var min$1 = Math.min;

  // Helper for a popular repeating case of the spec:
  // Let integer be ? ToInteger(index).
  // If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
  var toAbsoluteIndex$2 = function (index, length) {
    var integer = toIntegerOrInfinity$2(index);
    return integer < 0 ? max$2(integer + length, 0) : min$1(integer, length);
  };

  var toIndexedObject$4 = toIndexedObject$6;
  var toAbsoluteIndex$1 = toAbsoluteIndex$2;
  var lengthOfArrayLike$3 = lengthOfArrayLike$5;

  // `Array.prototype.{ indexOf, includes }` methods implementation
  var createMethod$3 = function (IS_INCLUDES) {
    return function ($this, el, fromIndex) {
      var O = toIndexedObject$4($this);
      var length = lengthOfArrayLike$3(O);
      var index = toAbsoluteIndex$1(fromIndex, length);
      var value;
      // Array#includes uses SameValueZero equality algorithm
      // eslint-disable-next-line no-self-compare -- NaN check
      if (IS_INCLUDES && el != el) while (length > index) {
        value = O[index++];
        // eslint-disable-next-line no-self-compare -- NaN check
        if (value != value) return true;
      // Array#indexOf ignores holes, Array#includes - not
      } else for (;length > index; index++) {
        if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
      } return !IS_INCLUDES && -1;
    };
  };

  var arrayIncludes = {
    // `Array.prototype.includes` method
    // https://tc39.es/ecma262/#sec-array.prototype.includes
    includes: createMethod$3(true),
    // `Array.prototype.indexOf` method
    // https://tc39.es/ecma262/#sec-array.prototype.indexof
    indexOf: createMethod$3(false)
  };

  var uncurryThis$f = functionUncurryThis;
  var hasOwn$5 = hasOwnProperty_1;
  var toIndexedObject$3 = toIndexedObject$6;
  var indexOf$1 = arrayIncludes.indexOf;
  var hiddenKeys$3 = hiddenKeys$5;

  var push$1 = uncurryThis$f([].push);

  var objectKeysInternal = function (object, names) {
    var O = toIndexedObject$3(object);
    var i = 0;
    var result = [];
    var key;
    for (key in O) !hasOwn$5(hiddenKeys$3, key) && hasOwn$5(O, key) && push$1(result, key);
    // Don't enum bug & hidden keys
    while (names.length > i) if (hasOwn$5(O, key = names[i++])) {
      ~indexOf$1(result, key) || push$1(result, key);
    }
    return result;
  };

  // IE8- don't enum bug keys
  var enumBugKeys$3 = [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf'
  ];

  var internalObjectKeys$1 = objectKeysInternal;
  var enumBugKeys$2 = enumBugKeys$3;

  var hiddenKeys$2 = enumBugKeys$2.concat('length', 'prototype');

  // `Object.getOwnPropertyNames` method
  // https://tc39.es/ecma262/#sec-object.getownpropertynames
  // eslint-disable-next-line es/no-object-getownpropertynames -- safe
  objectGetOwnPropertyNames.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
    return internalObjectKeys$1(O, hiddenKeys$2);
  };

  var objectGetOwnPropertySymbols = {};

  // eslint-disable-next-line es/no-object-getownpropertysymbols -- safe
  objectGetOwnPropertySymbols.f = Object.getOwnPropertySymbols;

  var getBuiltIn$1 = getBuiltIn$5;
  var uncurryThis$e = functionUncurryThis;
  var getOwnPropertyNamesModule$1 = objectGetOwnPropertyNames;
  var getOwnPropertySymbolsModule$1 = objectGetOwnPropertySymbols;
  var anObject$b = anObject$d;

  var concat$3 = uncurryThis$e([].concat);

  // all object keys, includes non-enumerable and symbols
  var ownKeys$1 = getBuiltIn$1('Reflect', 'ownKeys') || function ownKeys(it) {
    var keys = getOwnPropertyNamesModule$1.f(anObject$b(it));
    var getOwnPropertySymbols = getOwnPropertySymbolsModule$1.f;
    return getOwnPropertySymbols ? concat$3(keys, getOwnPropertySymbols(it)) : keys;
  };

  var hasOwn$4 = hasOwnProperty_1;
  var ownKeys = ownKeys$1;
  var getOwnPropertyDescriptorModule = objectGetOwnPropertyDescriptor;
  var definePropertyModule$2 = objectDefineProperty;

  var copyConstructorProperties$1 = function (target, source, exceptions) {
    var keys = ownKeys(source);
    var defineProperty = definePropertyModule$2.f;
    var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!hasOwn$4(target, key) && !(exceptions && hasOwn$4(exceptions, key))) {
        defineProperty(target, key, getOwnPropertyDescriptor(source, key));
      }
    }
  };

  var fails$e = fails$o;
  var isCallable$8 = isCallable$k;

  var replacement = /#|\.prototype\./;

  var isForced$2 = function (feature, detection) {
    var value = data[normalize(feature)];
    return value == POLYFILL ? true
      : value == NATIVE ? false
      : isCallable$8(detection) ? fails$e(detection)
      : !!detection;
  };

  var normalize = isForced$2.normalize = function (string) {
    return String(string).replace(replacement, '.').toLowerCase();
  };

  var data = isForced$2.data = {};
  var NATIVE = isForced$2.NATIVE = 'N';
  var POLYFILL = isForced$2.POLYFILL = 'P';

  var isForced_1 = isForced$2;

  var global$a = global$k;
  var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
  var createNonEnumerableProperty$3 = createNonEnumerableProperty$6;
  var defineBuiltIn$5 = defineBuiltIn$7;
  var defineGlobalProperty = defineGlobalProperty$3;
  var copyConstructorProperties = copyConstructorProperties$1;
  var isForced$1 = isForced_1;

  /*
    options.target         - name of the target object
    options.global         - target is the global object
    options.stat           - export as static methods of target
    options.proto          - export as prototype methods of target
    options.real           - real prototype method for the `pure` version
    options.forced         - export even if the native feature is available
    options.bind           - bind methods to the target, required for the `pure` version
    options.wrap           - wrap constructors to preventing global pollution, required for the `pure` version
    options.unsafe         - use the simple assignment of property instead of delete + defineProperty
    options.sham           - add a flag to not completely full polyfills
    options.enumerable     - export as enumerable property
    options.dontCallGetSet - prevent calling a getter on target
    options.name           - the .name of the function if it does not match the key
  */
  var _export = function (options, source) {
    var TARGET = options.target;
    var GLOBAL = options.global;
    var STATIC = options.stat;
    var FORCED, target, key, targetProperty, sourceProperty, descriptor;
    if (GLOBAL) {
      target = global$a;
    } else if (STATIC) {
      target = global$a[TARGET] || defineGlobalProperty(TARGET, {});
    } else {
      target = (global$a[TARGET] || {}).prototype;
    }
    if (target) for (key in source) {
      sourceProperty = source[key];
      if (options.dontCallGetSet) {
        descriptor = getOwnPropertyDescriptor(target, key);
        targetProperty = descriptor && descriptor.value;
      } else targetProperty = target[key];
      FORCED = isForced$1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
      // contained in target
      if (!FORCED && targetProperty !== undefined) {
        if (typeof sourceProperty == typeof targetProperty) continue;
        copyConstructorProperties(sourceProperty, targetProperty);
      }
      // add a flag to not completely full polyfills
      if (options.sham || (targetProperty && targetProperty.sham)) {
        createNonEnumerableProperty$3(sourceProperty, 'sham', true);
      }
      defineBuiltIn$5(target, key, sourceProperty, options);
    }
  };

  var classof$5 = classof$a;

  var $String$1 = String;

  var toString$7 = function (argument) {
    if (classof$5(argument) === 'Symbol') throw TypeError('Cannot convert a Symbol value to a string');
    return $String$1(argument);
  };

  // a string of all valid unicode whitespaces
  var whitespaces$2 = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002' +
    '\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

  var uncurryThis$d = functionUncurryThis;
  var requireObjectCoercible$3 = requireObjectCoercible$6;
  var toString$6 = toString$7;
  var whitespaces$1 = whitespaces$2;

  var replace$2 = uncurryThis$d(''.replace);
  var whitespace = '[' + whitespaces$1 + ']';
  var ltrim = RegExp('^' + whitespace + whitespace + '*');
  var rtrim = RegExp(whitespace + whitespace + '*$');

  // `String.prototype.{ trim, trimStart, trimEnd, trimLeft, trimRight }` methods implementation
  var createMethod$2 = function (TYPE) {
    return function ($this) {
      var string = toString$6(requireObjectCoercible$3($this));
      if (TYPE & 1) string = replace$2(string, ltrim, '');
      if (TYPE & 2) string = replace$2(string, rtrim, '');
      return string;
    };
  };

  var stringTrim = {
    // `String.prototype.{ trimLeft, trimStart }` methods
    // https://tc39.es/ecma262/#sec-string.prototype.trimstart
    start: createMethod$2(1),
    // `String.prototype.{ trimRight, trimEnd }` methods
    // https://tc39.es/ecma262/#sec-string.prototype.trimend
    end: createMethod$2(2),
    // `String.prototype.trim` method
    // https://tc39.es/ecma262/#sec-string.prototype.trim
    trim: createMethod$2(3)
  };

  var global$9 = global$k;
  var fails$d = fails$o;
  var uncurryThis$c = functionUncurryThis;
  var toString$5 = toString$7;
  var trim = stringTrim.trim;
  var whitespaces = whitespaces$2;

  var $parseInt$1 = global$9.parseInt;
  var Symbol$1 = global$9.Symbol;
  var ITERATOR$6 = Symbol$1 && Symbol$1.iterator;
  var hex = /^[+-]?0x/i;
  var exec$1 = uncurryThis$c(hex.exec);
  var FORCED = $parseInt$1(whitespaces + '08') !== 8 || $parseInt$1(whitespaces + '0x16') !== 22
    // MS Edge 18- broken with boxed symbols
    || (ITERATOR$6 && !fails$d(function () { $parseInt$1(Object(ITERATOR$6)); }));

  // `parseInt` method
  // https://tc39.es/ecma262/#sec-parseint-string-radix
  var numberParseInt = FORCED ? function parseInt(string, radix) {
    var S = trim(toString$5(string));
    return $parseInt$1(S, (radix >>> 0) || (exec$1(hex, S) ? 16 : 10));
  } : $parseInt$1;

  var $$7 = _export;
  var $parseInt = numberParseInt;

  // `parseInt` method
  // https://tc39.es/ecma262/#sec-parseint-string-radix
  $$7({ global: true, forced: parseInt != $parseInt }, {
    parseInt: $parseInt
  });

  var internalObjectKeys = objectKeysInternal;
  var enumBugKeys$1 = enumBugKeys$3;

  // `Object.keys` method
  // https://tc39.es/ecma262/#sec-object.keys
  // eslint-disable-next-line es/no-object-keys -- safe
  var objectKeys$2 = Object.keys || function keys(O) {
    return internalObjectKeys(O, enumBugKeys$1);
  };

  var DESCRIPTORS$3 = descriptors;
  var uncurryThis$b = functionUncurryThis;
  var call$9 = functionCall;
  var fails$c = fails$o;
  var objectKeys$1 = objectKeys$2;
  var getOwnPropertySymbolsModule = objectGetOwnPropertySymbols;
  var propertyIsEnumerableModule = objectPropertyIsEnumerable;
  var toObject$3 = toObject$6;
  var IndexedObject$1 = indexedObject;

  // eslint-disable-next-line es/no-object-assign -- safe
  var $assign = Object.assign;
  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
  var defineProperty$5 = Object.defineProperty;
  var concat$2 = uncurryThis$b([].concat);

  // `Object.assign` method
  // https://tc39.es/ecma262/#sec-object.assign
  var objectAssign = !$assign || fails$c(function () {
    // should have correct order of operations (Edge bug)
    if (DESCRIPTORS$3 && $assign({ b: 1 }, $assign(defineProperty$5({}, 'a', {
      enumerable: true,
      get: function () {
        defineProperty$5(this, 'b', {
          value: 3,
          enumerable: false
        });
      }
    }), { b: 2 })).b !== 1) return true;
    // should work with symbols and should have deterministic property order (V8 bug)
    var A = {};
    var B = {};
    // eslint-disable-next-line es/no-symbol -- safe
    var symbol = Symbol();
    var alphabet = 'abcdefghijklmnopqrst';
    A[symbol] = 7;
    alphabet.split('').forEach(function (chr) { B[chr] = chr; });
    return $assign({}, A)[symbol] != 7 || objectKeys$1($assign({}, B)).join('') != alphabet;
  }) ? function assign(target, source) { // eslint-disable-line no-unused-vars -- required for `.length`
    var T = toObject$3(target);
    var argumentsLength = arguments.length;
    var index = 1;
    var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
    var propertyIsEnumerable = propertyIsEnumerableModule.f;
    while (argumentsLength > index) {
      var S = IndexedObject$1(arguments[index++]);
      var keys = getOwnPropertySymbols ? concat$2(objectKeys$1(S), getOwnPropertySymbols(S)) : objectKeys$1(S);
      var length = keys.length;
      var j = 0;
      var key;
      while (length > j) {
        key = keys[j++];
        if (!DESCRIPTORS$3 || call$9(propertyIsEnumerable, S, key)) T[key] = S[key];
      }
    } return T;
  } : $assign;

  var $$6 = _export;
  var assign = objectAssign;

  // `Object.assign` method
  // https://tc39.es/ecma262/#sec-object.assign
  // eslint-disable-next-line es/no-object-assign -- required for testing
  $$6({ target: 'Object', stat: true, arity: 2, forced: Object.assign !== assign }, {
    assign: assign
  });

  var fails$b = fails$o;
  var wellKnownSymbol$a = wellKnownSymbol$f;
  var V8_VERSION = engineV8Version;

  var SPECIES$1 = wellKnownSymbol$a('species');

  var arrayMethodHasSpeciesSupport$1 = function (METHOD_NAME) {
    // We can't use this feature detection in V8 since it causes
    // deoptimization and serious performance degradation
    // https://github.com/zloirock/core-js/issues/677
    return V8_VERSION >= 51 || !fails$b(function () {
      var array = [];
      var constructor = array.constructor = {};
      constructor[SPECIES$1] = function () {
        return { foo: 1 };
      };
      return array[METHOD_NAME](Boolean).foo !== 1;
    });
  };

  var $$5 = _export;
  var $filter = arrayIteration.filter;
  var arrayMethodHasSpeciesSupport = arrayMethodHasSpeciesSupport$1;

  var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('filter');

  // `Array.prototype.filter` method
  // https://tc39.es/ecma262/#sec-array.prototype.filter
  // with adding support of @@species
  $$5({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
    filter: function filter(callbackfn /* , thisArg */) {
      return $filter(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  var objectDefineProperties = {};

  var DESCRIPTORS$2 = descriptors;
  var V8_PROTOTYPE_DEFINE_BUG = v8PrototypeDefineBug;
  var definePropertyModule$1 = objectDefineProperty;
  var anObject$a = anObject$d;
  var toIndexedObject$2 = toIndexedObject$6;
  var objectKeys = objectKeys$2;

  // `Object.defineProperties` method
  // https://tc39.es/ecma262/#sec-object.defineproperties
  // eslint-disable-next-line es/no-object-defineproperties -- safe
  objectDefineProperties.f = DESCRIPTORS$2 && !V8_PROTOTYPE_DEFINE_BUG ? Object.defineProperties : function defineProperties(O, Properties) {
    anObject$a(O);
    var props = toIndexedObject$2(Properties);
    var keys = objectKeys(Properties);
    var length = keys.length;
    var index = 0;
    var key;
    while (length > index) definePropertyModule$1.f(O, key = keys[index++], props[key]);
    return O;
  };

  var getBuiltIn = getBuiltIn$5;

  var html$1 = getBuiltIn('document', 'documentElement');

  /* global ActiveXObject -- old IE, WSH */

  var anObject$9 = anObject$d;
  var definePropertiesModule = objectDefineProperties;
  var enumBugKeys = enumBugKeys$3;
  var hiddenKeys$1 = hiddenKeys$5;
  var html = html$1;
  var documentCreateElement = documentCreateElement$2;
  var sharedKey$1 = sharedKey$3;

  var GT = '>';
  var LT = '<';
  var PROTOTYPE = 'prototype';
  var SCRIPT = 'script';
  var IE_PROTO$1 = sharedKey$1('IE_PROTO');

  var EmptyConstructor = function () { /* empty */ };

  var scriptTag = function (content) {
    return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
  };

  // Create object with fake `null` prototype: use ActiveX Object with cleared prototype
  var NullProtoObjectViaActiveX = function (activeXDocument) {
    activeXDocument.write(scriptTag(''));
    activeXDocument.close();
    var temp = activeXDocument.parentWindow.Object;
    activeXDocument = null; // avoid memory leak
    return temp;
  };

  // Create object with fake `null` prototype: use iframe Object with cleared prototype
  var NullProtoObjectViaIFrame = function () {
    // Thrash, waste and sodomy: IE GC bug
    var iframe = documentCreateElement('iframe');
    var JS = 'java' + SCRIPT + ':';
    var iframeDocument;
    iframe.style.display = 'none';
    html.appendChild(iframe);
    // https://github.com/zloirock/core-js/issues/475
    iframe.src = String(JS);
    iframeDocument = iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write(scriptTag('document.F=Object'));
    iframeDocument.close();
    return iframeDocument.F;
  };

  // Check for document.domain and active x support
  // No need to use active x approach when document.domain is not set
  // see https://github.com/es-shims/es5-shim/issues/150
  // variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
  // avoid IE GC bug
  var activeXDocument;
  var NullProtoObject = function () {
    try {
      activeXDocument = new ActiveXObject('htmlfile');
    } catch (error) { /* ignore */ }
    NullProtoObject = typeof document != 'undefined'
      ? document.domain && activeXDocument
        ? NullProtoObjectViaActiveX(activeXDocument) // old IE
        : NullProtoObjectViaIFrame()
      : NullProtoObjectViaActiveX(activeXDocument); // WSH
    var length = enumBugKeys.length;
    while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];
    return NullProtoObject();
  };

  hiddenKeys$1[IE_PROTO$1] = true;

  // `Object.create` method
  // https://tc39.es/ecma262/#sec-object.create
  // eslint-disable-next-line es/no-object-create -- safe
  var objectCreate = Object.create || function create(O, Properties) {
    var result;
    if (O !== null) {
      EmptyConstructor[PROTOTYPE] = anObject$9(O);
      result = new EmptyConstructor();
      EmptyConstructor[PROTOTYPE] = null;
      // add "__proto__" for Object.getPrototypeOf polyfill
      result[IE_PROTO$1] = O;
    } else result = NullProtoObject();
    return Properties === undefined ? result : definePropertiesModule.f(result, Properties);
  };

  var wellKnownSymbol$9 = wellKnownSymbol$f;
  var create$2 = objectCreate;
  var defineProperty$4 = objectDefineProperty.f;

  var UNSCOPABLES = wellKnownSymbol$9('unscopables');
  var ArrayPrototype$1 = Array.prototype;

  // Array.prototype[@@unscopables]
  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  if (ArrayPrototype$1[UNSCOPABLES] == undefined) {
    defineProperty$4(ArrayPrototype$1, UNSCOPABLES, {
      configurable: true,
      value: create$2(null)
    });
  }

  // add a key to Array.prototype[@@unscopables]
  var addToUnscopables$1 = function (key) {
    ArrayPrototype$1[UNSCOPABLES][key] = true;
  };

  var iterators = {};

  var fails$a = fails$o;

  var correctPrototypeGetter = !fails$a(function () {
    function F() { /* empty */ }
    F.prototype.constructor = null;
    // eslint-disable-next-line es/no-object-getprototypeof -- required for testing
    return Object.getPrototypeOf(new F()) !== F.prototype;
  });

  var hasOwn$3 = hasOwnProperty_1;
  var isCallable$7 = isCallable$k;
  var toObject$2 = toObject$6;
  var sharedKey = sharedKey$3;
  var CORRECT_PROTOTYPE_GETTER = correctPrototypeGetter;

  var IE_PROTO = sharedKey('IE_PROTO');
  var $Object = Object;
  var ObjectPrototype = $Object.prototype;

  // `Object.getPrototypeOf` method
  // https://tc39.es/ecma262/#sec-object.getprototypeof
  // eslint-disable-next-line es/no-object-getprototypeof -- safe
  var objectGetPrototypeOf = CORRECT_PROTOTYPE_GETTER ? $Object.getPrototypeOf : function (O) {
    var object = toObject$2(O);
    if (hasOwn$3(object, IE_PROTO)) return object[IE_PROTO];
    var constructor = object.constructor;
    if (isCallable$7(constructor) && object instanceof constructor) {
      return constructor.prototype;
    } return object instanceof $Object ? ObjectPrototype : null;
  };

  var fails$9 = fails$o;
  var isCallable$6 = isCallable$k;
  var isObject$9 = isObject$g;
  var getPrototypeOf$1 = objectGetPrototypeOf;
  var defineBuiltIn$4 = defineBuiltIn$7;
  var wellKnownSymbol$8 = wellKnownSymbol$f;

  var ITERATOR$5 = wellKnownSymbol$8('iterator');
  var BUGGY_SAFARI_ITERATORS$1 = false;

  // `%IteratorPrototype%` object
  // https://tc39.es/ecma262/#sec-%iteratorprototype%-object
  var IteratorPrototype$2, PrototypeOfArrayIteratorPrototype, arrayIterator;

  /* eslint-disable es/no-array-prototype-keys -- safe */
  if ([].keys) {
    arrayIterator = [].keys();
    // Safari 8 has buggy iterators w/o `next`
    if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS$1 = true;
    else {
      PrototypeOfArrayIteratorPrototype = getPrototypeOf$1(getPrototypeOf$1(arrayIterator));
      if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype$2 = PrototypeOfArrayIteratorPrototype;
    }
  }

  var NEW_ITERATOR_PROTOTYPE = !isObject$9(IteratorPrototype$2) || fails$9(function () {
    var test = {};
    // FF44- legacy iterators case
    return IteratorPrototype$2[ITERATOR$5].call(test) !== test;
  });

  if (NEW_ITERATOR_PROTOTYPE) IteratorPrototype$2 = {};

  // `%IteratorPrototype%[@@iterator]()` method
  // https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
  if (!isCallable$6(IteratorPrototype$2[ITERATOR$5])) {
    defineBuiltIn$4(IteratorPrototype$2, ITERATOR$5, function () {
      return this;
    });
  }

  var iteratorsCore = {
    IteratorPrototype: IteratorPrototype$2,
    BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS$1
  };

  var defineProperty$3 = objectDefineProperty.f;
  var hasOwn$2 = hasOwnProperty_1;
  var wellKnownSymbol$7 = wellKnownSymbol$f;

  var TO_STRING_TAG$1 = wellKnownSymbol$7('toStringTag');

  var setToStringTag$3 = function (target, TAG, STATIC) {
    if (target && !STATIC) target = target.prototype;
    if (target && !hasOwn$2(target, TO_STRING_TAG$1)) {
      defineProperty$3(target, TO_STRING_TAG$1, { configurable: true, value: TAG });
    }
  };

  var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;
  var create$1 = objectCreate;
  var createPropertyDescriptor$1 = createPropertyDescriptor$4;
  var setToStringTag$2 = setToStringTag$3;
  var Iterators$4 = iterators;

  var returnThis$1 = function () { return this; };

  var iteratorCreateConstructor = function (IteratorConstructor, NAME, next, ENUMERABLE_NEXT) {
    var TO_STRING_TAG = NAME + ' Iterator';
    IteratorConstructor.prototype = create$1(IteratorPrototype$1, { next: createPropertyDescriptor$1(+!ENUMERABLE_NEXT, next) });
    setToStringTag$2(IteratorConstructor, TO_STRING_TAG, false);
    Iterators$4[TO_STRING_TAG] = returnThis$1;
    return IteratorConstructor;
  };

  var isCallable$5 = isCallable$k;

  var $String = String;
  var $TypeError$5 = TypeError;

  var aPossiblePrototype$1 = function (argument) {
    if (typeof argument == 'object' || isCallable$5(argument)) return argument;
    throw $TypeError$5("Can't set " + $String(argument) + ' as a prototype');
  };

  /* eslint-disable no-proto -- safe */

  var uncurryThis$a = functionUncurryThis;
  var anObject$8 = anObject$d;
  var aPossiblePrototype = aPossiblePrototype$1;

  // `Object.setPrototypeOf` method
  // https://tc39.es/ecma262/#sec-object.setprototypeof
  // Works with __proto__ only. Old v8 can't work with null proto objects.
  // eslint-disable-next-line es/no-object-setprototypeof -- safe
  var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
    var CORRECT_SETTER = false;
    var test = {};
    var setter;
    try {
      // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
      setter = uncurryThis$a(Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set);
      setter(test, []);
      CORRECT_SETTER = test instanceof Array;
    } catch (error) { /* empty */ }
    return function setPrototypeOf(O, proto) {
      anObject$8(O);
      aPossiblePrototype(proto);
      if (CORRECT_SETTER) setter(O, proto);
      else O.__proto__ = proto;
      return O;
    };
  }() : undefined);

  var $$4 = _export;
  var call$8 = functionCall;
  var FunctionName = functionName;
  var isCallable$4 = isCallable$k;
  var createIteratorConstructor = iteratorCreateConstructor;
  var getPrototypeOf = objectGetPrototypeOf;
  var setPrototypeOf$1 = objectSetPrototypeOf;
  var setToStringTag$1 = setToStringTag$3;
  var createNonEnumerableProperty$2 = createNonEnumerableProperty$6;
  var defineBuiltIn$3 = defineBuiltIn$7;
  var wellKnownSymbol$6 = wellKnownSymbol$f;
  var Iterators$3 = iterators;
  var IteratorsCore = iteratorsCore;

  var PROPER_FUNCTION_NAME = FunctionName.PROPER;
  var CONFIGURABLE_FUNCTION_NAME = FunctionName.CONFIGURABLE;
  var IteratorPrototype = IteratorsCore.IteratorPrototype;
  var BUGGY_SAFARI_ITERATORS = IteratorsCore.BUGGY_SAFARI_ITERATORS;
  var ITERATOR$4 = wellKnownSymbol$6('iterator');
  var KEYS = 'keys';
  var VALUES = 'values';
  var ENTRIES = 'entries';

  var returnThis = function () { return this; };

  var iteratorDefine = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
    createIteratorConstructor(IteratorConstructor, NAME, next);

    var getIterationMethod = function (KIND) {
      if (KIND === DEFAULT && defaultIterator) return defaultIterator;
      if (!BUGGY_SAFARI_ITERATORS && KIND in IterablePrototype) return IterablePrototype[KIND];
      switch (KIND) {
        case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
        case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
        case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
      } return function () { return new IteratorConstructor(this); };
    };

    var TO_STRING_TAG = NAME + ' Iterator';
    var INCORRECT_VALUES_NAME = false;
    var IterablePrototype = Iterable.prototype;
    var nativeIterator = IterablePrototype[ITERATOR$4]
      || IterablePrototype['@@iterator']
      || DEFAULT && IterablePrototype[DEFAULT];
    var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
    var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
    var CurrentIteratorPrototype, methods, KEY;

    // fix native
    if (anyNativeIterator) {
      CurrentIteratorPrototype = getPrototypeOf(anyNativeIterator.call(new Iterable()));
      if (CurrentIteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
        if (getPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype) {
          if (setPrototypeOf$1) {
            setPrototypeOf$1(CurrentIteratorPrototype, IteratorPrototype);
          } else if (!isCallable$4(CurrentIteratorPrototype[ITERATOR$4])) {
            defineBuiltIn$3(CurrentIteratorPrototype, ITERATOR$4, returnThis);
          }
        }
        // Set @@toStringTag to native iterators
        setToStringTag$1(CurrentIteratorPrototype, TO_STRING_TAG, true);
      }
    }

    // fix Array.prototype.{ values, @@iterator }.name in V8 / FF
    if (PROPER_FUNCTION_NAME && DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
      if (CONFIGURABLE_FUNCTION_NAME) {
        createNonEnumerableProperty$2(IterablePrototype, 'name', VALUES);
      } else {
        INCORRECT_VALUES_NAME = true;
        defaultIterator = function values() { return call$8(nativeIterator, this); };
      }
    }

    // export additional methods
    if (DEFAULT) {
      methods = {
        values: getIterationMethod(VALUES),
        keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
        entries: getIterationMethod(ENTRIES)
      };
      if (FORCED) for (KEY in methods) {
        if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
          defineBuiltIn$3(IterablePrototype, KEY, methods[KEY]);
        }
      } else $$4({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME }, methods);
    }

    // define iterator
    if (IterablePrototype[ITERATOR$4] !== defaultIterator) {
      defineBuiltIn$3(IterablePrototype, ITERATOR$4, defaultIterator, { name: DEFAULT });
    }
    Iterators$3[NAME] = defaultIterator;

    return methods;
  };

  // `CreateIterResultObject` abstract operation
  // https://tc39.es/ecma262/#sec-createiterresultobject
  var createIterResultObject$2 = function (value, done) {
    return { value: value, done: done };
  };

  var toIndexedObject$1 = toIndexedObject$6;
  var addToUnscopables = addToUnscopables$1;
  var Iterators$2 = iterators;
  var InternalStateModule$2 = internalState;
  var defineProperty$2 = objectDefineProperty.f;
  var defineIterator$1 = iteratorDefine;
  var createIterResultObject$1 = createIterResultObject$2;
  var DESCRIPTORS$1 = descriptors;

  var ARRAY_ITERATOR = 'Array Iterator';
  var setInternalState$2 = InternalStateModule$2.set;
  var getInternalState$2 = InternalStateModule$2.getterFor(ARRAY_ITERATOR);

  // `Array.prototype.entries` method
  // https://tc39.es/ecma262/#sec-array.prototype.entries
  // `Array.prototype.keys` method
  // https://tc39.es/ecma262/#sec-array.prototype.keys
  // `Array.prototype.values` method
  // https://tc39.es/ecma262/#sec-array.prototype.values
  // `Array.prototype[@@iterator]` method
  // https://tc39.es/ecma262/#sec-array.prototype-@@iterator
  // `CreateArrayIterator` internal method
  // https://tc39.es/ecma262/#sec-createarrayiterator
  var es_array_iterator = defineIterator$1(Array, 'Array', function (iterated, kind) {
    setInternalState$2(this, {
      type: ARRAY_ITERATOR,
      target: toIndexedObject$1(iterated), // target
      index: 0,                          // next index
      kind: kind                         // kind
    });
  // `%ArrayIteratorPrototype%.next` method
  // https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next
  }, function () {
    var state = getInternalState$2(this);
    var target = state.target;
    var kind = state.kind;
    var index = state.index++;
    if (!target || index >= target.length) {
      state.target = undefined;
      return createIterResultObject$1(undefined, true);
    }
    if (kind == 'keys') return createIterResultObject$1(index, false);
    if (kind == 'values') return createIterResultObject$1(target[index], false);
    return createIterResultObject$1([index, target[index]], false);
  }, 'values');

  // argumentsList[@@iterator] is %ArrayProto_values%
  // https://tc39.es/ecma262/#sec-createunmappedargumentsobject
  // https://tc39.es/ecma262/#sec-createmappedargumentsobject
  var values = Iterators$2.Arguments = Iterators$2.Array;

  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');

  // V8 ~ Chrome 45- bug
  if (DESCRIPTORS$1 && values.name !== 'values') try {
    defineProperty$2(values, 'name', { value: 'values' });
  } catch (error) { /* empty */ }

  var uncurryThis$9 = functionUncurryThis;
  var toIntegerOrInfinity$1 = toIntegerOrInfinity$4;
  var toString$4 = toString$7;
  var requireObjectCoercible$2 = requireObjectCoercible$6;

  var charAt$4 = uncurryThis$9(''.charAt);
  var charCodeAt = uncurryThis$9(''.charCodeAt);
  var stringSlice$3 = uncurryThis$9(''.slice);

  var createMethod$1 = function (CONVERT_TO_STRING) {
    return function ($this, pos) {
      var S = toString$4(requireObjectCoercible$2($this));
      var position = toIntegerOrInfinity$1(pos);
      var size = S.length;
      var first, second;
      if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
      first = charCodeAt(S, position);
      return first < 0xD800 || first > 0xDBFF || position + 1 === size
        || (second = charCodeAt(S, position + 1)) < 0xDC00 || second > 0xDFFF
          ? CONVERT_TO_STRING
            ? charAt$4(S, position)
            : first
          : CONVERT_TO_STRING
            ? stringSlice$3(S, position, position + 2)
            : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
    };
  };

  var stringMultibyte = {
    // `String.prototype.codePointAt` method
    // https://tc39.es/ecma262/#sec-string.prototype.codepointat
    codeAt: createMethod$1(false),
    // `String.prototype.at` method
    // https://github.com/mathiasbynens/String.prototype.at
    charAt: createMethod$1(true)
  };

  var charAt$3 = stringMultibyte.charAt;
  var toString$3 = toString$7;
  var InternalStateModule$1 = internalState;
  var defineIterator = iteratorDefine;
  var createIterResultObject = createIterResultObject$2;

  var STRING_ITERATOR = 'String Iterator';
  var setInternalState$1 = InternalStateModule$1.set;
  var getInternalState$1 = InternalStateModule$1.getterFor(STRING_ITERATOR);

  // `String.prototype[@@iterator]` method
  // https://tc39.es/ecma262/#sec-string.prototype-@@iterator
  defineIterator(String, 'String', function (iterated) {
    setInternalState$1(this, {
      type: STRING_ITERATOR,
      string: toString$3(iterated),
      index: 0
    });
  // `%StringIteratorPrototype%.next` method
  // https://tc39.es/ecma262/#sec-%stringiteratorprototype%.next
  }, function next() {
    var state = getInternalState$1(this);
    var string = state.string;
    var index = state.index;
    var point;
    if (index >= string.length) return createIterResultObject(undefined, true);
    point = charAt$3(string, index);
    state.index += point.length;
    return createIterResultObject(point, false);
  });

  var defineBuiltIn$2 = defineBuiltIn$7;

  var defineBuiltIns$2 = function (target, src, options) {
    for (var key in src) defineBuiltIn$2(target, key, src[key], options);
    return target;
  };

  var internalMetadataExports = {};
  var internalMetadata = {
    get exports(){ return internalMetadataExports; },
    set exports(v){ internalMetadataExports = v; },
  };

  var objectGetOwnPropertyNamesExternal = {};

  var toPropertyKey = toPropertyKey$3;
  var definePropertyModule = objectDefineProperty;
  var createPropertyDescriptor = createPropertyDescriptor$4;

  var createProperty$1 = function (object, key, value) {
    var propertyKey = toPropertyKey(key);
    if (propertyKey in object) definePropertyModule.f(object, propertyKey, createPropertyDescriptor(0, value));
    else object[propertyKey] = value;
  };

  var toAbsoluteIndex = toAbsoluteIndex$2;
  var lengthOfArrayLike$2 = lengthOfArrayLike$5;
  var createProperty = createProperty$1;

  var $Array = Array;
  var max$1 = Math.max;

  var arraySliceSimple = function (O, start, end) {
    var length = lengthOfArrayLike$2(O);
    var k = toAbsoluteIndex(start, length);
    var fin = toAbsoluteIndex(end === undefined ? length : end, length);
    var result = $Array(max$1(fin - k, 0));
    for (var n = 0; k < fin; k++, n++) createProperty(result, n, O[k]);
    result.length = n;
    return result;
  };

  /* eslint-disable es/no-object-getownpropertynames -- safe */

  var classof$4 = classofRaw$2;
  var toIndexedObject = toIndexedObject$6;
  var $getOwnPropertyNames = objectGetOwnPropertyNames.f;
  var arraySlice = arraySliceSimple;

  var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
    ? Object.getOwnPropertyNames(window) : [];

  var getWindowNames = function (it) {
    try {
      return $getOwnPropertyNames(it);
    } catch (error) {
      return arraySlice(windowNames);
    }
  };

  // fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
  objectGetOwnPropertyNamesExternal.f = function getOwnPropertyNames(it) {
    return windowNames && classof$4(it) == 'Window'
      ? getWindowNames(it)
      : $getOwnPropertyNames(toIndexedObject(it));
  };

  // FF26- bug: ArrayBuffers are non-extensible, but Object.isExtensible does not report it
  var fails$8 = fails$o;

  var arrayBufferNonExtensible = fails$8(function () {
    if (typeof ArrayBuffer == 'function') {
      var buffer = new ArrayBuffer(8);
      // eslint-disable-next-line es/no-object-isextensible, es/no-object-defineproperty -- safe
      if (Object.isExtensible(buffer)) Object.defineProperty(buffer, 'a', { value: 8 });
    }
  });

  var fails$7 = fails$o;
  var isObject$8 = isObject$g;
  var classof$3 = classofRaw$2;
  var ARRAY_BUFFER_NON_EXTENSIBLE = arrayBufferNonExtensible;

  // eslint-disable-next-line es/no-object-isextensible -- safe
  var $isExtensible = Object.isExtensible;
  var FAILS_ON_PRIMITIVES = fails$7(function () { $isExtensible(1); });

  // `Object.isExtensible` method
  // https://tc39.es/ecma262/#sec-object.isextensible
  var objectIsExtensible = (FAILS_ON_PRIMITIVES || ARRAY_BUFFER_NON_EXTENSIBLE) ? function isExtensible(it) {
    if (!isObject$8(it)) return false;
    if (ARRAY_BUFFER_NON_EXTENSIBLE && classof$3(it) == 'ArrayBuffer') return false;
    return $isExtensible ? $isExtensible(it) : true;
  } : $isExtensible;

  var fails$6 = fails$o;

  var freezing = !fails$6(function () {
    // eslint-disable-next-line es/no-object-isextensible, es/no-object-preventextensions -- required for testing
    return Object.isExtensible(Object.preventExtensions({}));
  });

  var $$3 = _export;
  var uncurryThis$8 = functionUncurryThis;
  var hiddenKeys = hiddenKeys$5;
  var isObject$7 = isObject$g;
  var hasOwn$1 = hasOwnProperty_1;
  var defineProperty$1 = objectDefineProperty.f;
  var getOwnPropertyNamesModule = objectGetOwnPropertyNames;
  var getOwnPropertyNamesExternalModule = objectGetOwnPropertyNamesExternal;
  var isExtensible$1 = objectIsExtensible;
  var uid = uid$3;
  var FREEZING = freezing;

  var REQUIRED = false;
  var METADATA = uid('meta');
  var id$1 = 0;

  var setMetadata = function (it) {
    defineProperty$1(it, METADATA, { value: {
      objectID: 'O' + id$1++, // object ID
      weakData: {}          // weak collections IDs
    } });
  };

  var fastKey = function (it, create) {
    // return a primitive with prefix
    if (!isObject$7(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
    if (!hasOwn$1(it, METADATA)) {
      // can't set metadata to uncaught frozen object
      if (!isExtensible$1(it)) return 'F';
      // not necessary to add metadata
      if (!create) return 'E';
      // add missing metadata
      setMetadata(it);
    // return object ID
    } return it[METADATA].objectID;
  };

  var getWeakData$1 = function (it, create) {
    if (!hasOwn$1(it, METADATA)) {
      // can't set metadata to uncaught frozen object
      if (!isExtensible$1(it)) return true;
      // not necessary to add metadata
      if (!create) return false;
      // add missing metadata
      setMetadata(it);
    // return the store of weak collections IDs
    } return it[METADATA].weakData;
  };

  // add metadata on freeze-family methods calling
  var onFreeze = function (it) {
    if (FREEZING && REQUIRED && isExtensible$1(it) && !hasOwn$1(it, METADATA)) setMetadata(it);
    return it;
  };

  var enable = function () {
    meta.enable = function () { /* empty */ };
    REQUIRED = true;
    var getOwnPropertyNames = getOwnPropertyNamesModule.f;
    var splice = uncurryThis$8([].splice);
    var test = {};
    test[METADATA] = 1;

    // prevent exposing of metadata key
    if (getOwnPropertyNames(test).length) {
      getOwnPropertyNamesModule.f = function (it) {
        var result = getOwnPropertyNames(it);
        for (var i = 0, length = result.length; i < length; i++) {
          if (result[i] === METADATA) {
            splice(result, i, 1);
            break;
          }
        } return result;
      };

      $$3({ target: 'Object', stat: true, forced: true }, {
        getOwnPropertyNames: getOwnPropertyNamesExternalModule.f
      });
    }
  };

  var meta = internalMetadata.exports = {
    enable: enable,
    fastKey: fastKey,
    getWeakData: getWeakData$1,
    onFreeze: onFreeze
  };

  hiddenKeys[METADATA] = true;

  var wellKnownSymbol$5 = wellKnownSymbol$f;
  var Iterators$1 = iterators;

  var ITERATOR$3 = wellKnownSymbol$5('iterator');
  var ArrayPrototype = Array.prototype;

  // check on default Array iterator
  var isArrayIteratorMethod$1 = function (it) {
    return it !== undefined && (Iterators$1.Array === it || ArrayPrototype[ITERATOR$3] === it);
  };

  var classof$2 = classof$a;
  var getMethod$3 = getMethod$5;
  var isNullOrUndefined$4 = isNullOrUndefined$7;
  var Iterators = iterators;
  var wellKnownSymbol$4 = wellKnownSymbol$f;

  var ITERATOR$2 = wellKnownSymbol$4('iterator');

  var getIteratorMethod$2 = function (it) {
    if (!isNullOrUndefined$4(it)) return getMethod$3(it, ITERATOR$2)
      || getMethod$3(it, '@@iterator')
      || Iterators[classof$2(it)];
  };

  var call$7 = functionCall;
  var aCallable$1 = aCallable$4;
  var anObject$7 = anObject$d;
  var tryToString$1 = tryToString$3;
  var getIteratorMethod$1 = getIteratorMethod$2;

  var $TypeError$4 = TypeError;

  var getIterator$1 = function (argument, usingIterator) {
    var iteratorMethod = arguments.length < 2 ? getIteratorMethod$1(argument) : usingIterator;
    if (aCallable$1(iteratorMethod)) return anObject$7(call$7(iteratorMethod, argument));
    throw $TypeError$4(tryToString$1(argument) + ' is not iterable');
  };

  var call$6 = functionCall;
  var anObject$6 = anObject$d;
  var getMethod$2 = getMethod$5;

  var iteratorClose$1 = function (iterator, kind, value) {
    var innerResult, innerError;
    anObject$6(iterator);
    try {
      innerResult = getMethod$2(iterator, 'return');
      if (!innerResult) {
        if (kind === 'throw') throw value;
        return value;
      }
      innerResult = call$6(innerResult, iterator);
    } catch (error) {
      innerError = true;
      innerResult = error;
    }
    if (kind === 'throw') throw value;
    if (innerError) throw innerResult;
    anObject$6(innerResult);
    return value;
  };

  var bind = functionBindContext;
  var call$5 = functionCall;
  var anObject$5 = anObject$d;
  var tryToString = tryToString$3;
  var isArrayIteratorMethod = isArrayIteratorMethod$1;
  var lengthOfArrayLike$1 = lengthOfArrayLike$5;
  var isPrototypeOf$1 = objectIsPrototypeOf;
  var getIterator = getIterator$1;
  var getIteratorMethod = getIteratorMethod$2;
  var iteratorClose = iteratorClose$1;

  var $TypeError$3 = TypeError;

  var Result = function (stopped, result) {
    this.stopped = stopped;
    this.result = result;
  };

  var ResultPrototype = Result.prototype;

  var iterate$2 = function (iterable, unboundFunction, options) {
    var that = options && options.that;
    var AS_ENTRIES = !!(options && options.AS_ENTRIES);
    var IS_RECORD = !!(options && options.IS_RECORD);
    var IS_ITERATOR = !!(options && options.IS_ITERATOR);
    var INTERRUPTED = !!(options && options.INTERRUPTED);
    var fn = bind(unboundFunction, that);
    var iterator, iterFn, index, length, result, next, step;

    var stop = function (condition) {
      if (iterator) iteratorClose(iterator, 'normal', condition);
      return new Result(true, condition);
    };

    var callFn = function (value) {
      if (AS_ENTRIES) {
        anObject$5(value);
        return INTERRUPTED ? fn(value[0], value[1], stop) : fn(value[0], value[1]);
      } return INTERRUPTED ? fn(value, stop) : fn(value);
    };

    if (IS_RECORD) {
      iterator = iterable.iterator;
    } else if (IS_ITERATOR) {
      iterator = iterable;
    } else {
      iterFn = getIteratorMethod(iterable);
      if (!iterFn) throw $TypeError$3(tryToString(iterable) + ' is not iterable');
      // optimisation for array iterators
      if (isArrayIteratorMethod(iterFn)) {
        for (index = 0, length = lengthOfArrayLike$1(iterable); length > index; index++) {
          result = callFn(iterable[index]);
          if (result && isPrototypeOf$1(ResultPrototype, result)) return result;
        } return new Result(false);
      }
      iterator = getIterator(iterable, iterFn);
    }

    next = IS_RECORD ? iterable.next : iterator.next;
    while (!(step = call$5(next, iterator)).done) {
      try {
        result = callFn(step.value);
      } catch (error) {
        iteratorClose(iterator, 'throw', error);
      }
      if (typeof result == 'object' && result && isPrototypeOf$1(ResultPrototype, result)) return result;
    } return new Result(false);
  };

  var isPrototypeOf = objectIsPrototypeOf;

  var $TypeError$2 = TypeError;

  var anInstance$2 = function (it, Prototype) {
    if (isPrototypeOf(Prototype, it)) return it;
    throw $TypeError$2('Incorrect invocation');
  };

  var wellKnownSymbol$3 = wellKnownSymbol$f;

  var ITERATOR$1 = wellKnownSymbol$3('iterator');
  var SAFE_CLOSING = false;

  try {
    var called = 0;
    var iteratorWithReturn = {
      next: function () {
        return { done: !!called++ };
      },
      'return': function () {
        SAFE_CLOSING = true;
      }
    };
    iteratorWithReturn[ITERATOR$1] = function () {
      return this;
    };
    // eslint-disable-next-line es/no-array-from, no-throw-literal -- required for testing
    Array.from(iteratorWithReturn, function () { throw 2; });
  } catch (error) { /* empty */ }

  var checkCorrectnessOfIteration$1 = function (exec, SKIP_CLOSING) {
    if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
    var ITERATION_SUPPORT = false;
    try {
      var object = {};
      object[ITERATOR$1] = function () {
        return {
          next: function () {
            return { done: ITERATION_SUPPORT = true };
          }
        };
      };
      exec(object);
    } catch (error) { /* empty */ }
    return ITERATION_SUPPORT;
  };

  var isCallable$3 = isCallable$k;
  var isObject$6 = isObject$g;
  var setPrototypeOf = objectSetPrototypeOf;

  // makes subclassing work correct for wrapped built-ins
  var inheritIfRequired$1 = function ($this, dummy, Wrapper) {
    var NewTarget, NewTargetPrototype;
    if (
      // it can work only with native `setPrototypeOf`
      setPrototypeOf &&
      // we haven't completely correct pre-ES6 way for getting `new.target`, so use this
      isCallable$3(NewTarget = dummy.constructor) &&
      NewTarget !== Wrapper &&
      isObject$6(NewTargetPrototype = NewTarget.prototype) &&
      NewTargetPrototype !== Wrapper.prototype
    ) setPrototypeOf($this, NewTargetPrototype);
    return $this;
  };

  var $$2 = _export;
  var global$8 = global$k;
  var uncurryThis$7 = functionUncurryThis;
  var isForced = isForced_1;
  var defineBuiltIn$1 = defineBuiltIn$7;
  var InternalMetadataModule$1 = internalMetadataExports;
  var iterate$1 = iterate$2;
  var anInstance$1 = anInstance$2;
  var isCallable$2 = isCallable$k;
  var isNullOrUndefined$3 = isNullOrUndefined$7;
  var isObject$5 = isObject$g;
  var fails$5 = fails$o;
  var checkCorrectnessOfIteration = checkCorrectnessOfIteration$1;
  var setToStringTag = setToStringTag$3;
  var inheritIfRequired = inheritIfRequired$1;

  var collection$1 = function (CONSTRUCTOR_NAME, wrapper, common) {
    var IS_MAP = CONSTRUCTOR_NAME.indexOf('Map') !== -1;
    var IS_WEAK = CONSTRUCTOR_NAME.indexOf('Weak') !== -1;
    var ADDER = IS_MAP ? 'set' : 'add';
    var NativeConstructor = global$8[CONSTRUCTOR_NAME];
    var NativePrototype = NativeConstructor && NativeConstructor.prototype;
    var Constructor = NativeConstructor;
    var exported = {};

    var fixMethod = function (KEY) {
      var uncurriedNativeMethod = uncurryThis$7(NativePrototype[KEY]);
      defineBuiltIn$1(NativePrototype, KEY,
        KEY == 'add' ? function add(value) {
          uncurriedNativeMethod(this, value === 0 ? 0 : value);
          return this;
        } : KEY == 'delete' ? function (key) {
          return IS_WEAK && !isObject$5(key) ? false : uncurriedNativeMethod(this, key === 0 ? 0 : key);
        } : KEY == 'get' ? function get(key) {
          return IS_WEAK && !isObject$5(key) ? undefined : uncurriedNativeMethod(this, key === 0 ? 0 : key);
        } : KEY == 'has' ? function has(key) {
          return IS_WEAK && !isObject$5(key) ? false : uncurriedNativeMethod(this, key === 0 ? 0 : key);
        } : function set(key, value) {
          uncurriedNativeMethod(this, key === 0 ? 0 : key, value);
          return this;
        }
      );
    };

    var REPLACE = isForced(
      CONSTRUCTOR_NAME,
      !isCallable$2(NativeConstructor) || !(IS_WEAK || NativePrototype.forEach && !fails$5(function () {
        new NativeConstructor().entries().next();
      }))
    );

    if (REPLACE) {
      // create collection constructor
      Constructor = common.getConstructor(wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER);
      InternalMetadataModule$1.enable();
    } else if (isForced(CONSTRUCTOR_NAME, true)) {
      var instance = new Constructor();
      // early implementations not supports chaining
      var HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance;
      // V8 ~ Chromium 40- weak-collections throws on primitives, but should return false
      var THROWS_ON_PRIMITIVES = fails$5(function () { instance.has(1); });
      // most early implementations doesn't supports iterables, most modern - not close it correctly
      // eslint-disable-next-line no-new -- required for testing
      var ACCEPT_ITERABLES = checkCorrectnessOfIteration(function (iterable) { new NativeConstructor(iterable); });
      // for early implementations -0 and +0 not the same
      var BUGGY_ZERO = !IS_WEAK && fails$5(function () {
        // V8 ~ Chromium 42- fails only with 5+ elements
        var $instance = new NativeConstructor();
        var index = 5;
        while (index--) $instance[ADDER](index, index);
        return !$instance.has(-0);
      });

      if (!ACCEPT_ITERABLES) {
        Constructor = wrapper(function (dummy, iterable) {
          anInstance$1(dummy, NativePrototype);
          var that = inheritIfRequired(new NativeConstructor(), dummy, Constructor);
          if (!isNullOrUndefined$3(iterable)) iterate$1(iterable, that[ADDER], { that: that, AS_ENTRIES: IS_MAP });
          return that;
        });
        Constructor.prototype = NativePrototype;
        NativePrototype.constructor = Constructor;
      }

      if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
        fixMethod('delete');
        fixMethod('has');
        IS_MAP && fixMethod('get');
      }

      if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);

      // weak collections should not contains .clear method
      if (IS_WEAK && NativePrototype.clear) delete NativePrototype.clear;
    }

    exported[CONSTRUCTOR_NAME] = Constructor;
    $$2({ global: true, constructor: true, forced: Constructor != NativeConstructor }, exported);

    setToStringTag(Constructor, CONSTRUCTOR_NAME);

    if (!IS_WEAK) common.setStrong(Constructor, CONSTRUCTOR_NAME, IS_MAP);

    return Constructor;
  };

  var uncurryThis$6 = functionUncurryThis;
  var defineBuiltIns$1 = defineBuiltIns$2;
  var getWeakData = internalMetadataExports.getWeakData;
  var anInstance = anInstance$2;
  var anObject$4 = anObject$d;
  var isNullOrUndefined$2 = isNullOrUndefined$7;
  var isObject$4 = isObject$g;
  var iterate = iterate$2;
  var ArrayIterationModule = arrayIteration;
  var hasOwn = hasOwnProperty_1;
  var InternalStateModule = internalState;

  var setInternalState = InternalStateModule.set;
  var internalStateGetterFor = InternalStateModule.getterFor;
  var find = ArrayIterationModule.find;
  var findIndex = ArrayIterationModule.findIndex;
  var splice$1 = uncurryThis$6([].splice);
  var id = 0;

  // fallback for uncaught frozen keys
  var uncaughtFrozenStore = function (store) {
    return store.frozen || (store.frozen = new UncaughtFrozenStore());
  };

  var UncaughtFrozenStore = function () {
    this.entries = [];
  };

  var findUncaughtFrozen = function (store, key) {
    return find(store.entries, function (it) {
      return it[0] === key;
    });
  };

  UncaughtFrozenStore.prototype = {
    get: function (key) {
      var entry = findUncaughtFrozen(this, key);
      if (entry) return entry[1];
    },
    has: function (key) {
      return !!findUncaughtFrozen(this, key);
    },
    set: function (key, value) {
      var entry = findUncaughtFrozen(this, key);
      if (entry) entry[1] = value;
      else this.entries.push([key, value]);
    },
    'delete': function (key) {
      var index = findIndex(this.entries, function (it) {
        return it[0] === key;
      });
      if (~index) splice$1(this.entries, index, 1);
      return !!~index;
    }
  };

  var collectionWeak$1 = {
    getConstructor: function (wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER) {
      var Constructor = wrapper(function (that, iterable) {
        anInstance(that, Prototype);
        setInternalState(that, {
          type: CONSTRUCTOR_NAME,
          id: id++,
          frozen: undefined
        });
        if (!isNullOrUndefined$2(iterable)) iterate(iterable, that[ADDER], { that: that, AS_ENTRIES: IS_MAP });
      });

      var Prototype = Constructor.prototype;

      var getInternalState = internalStateGetterFor(CONSTRUCTOR_NAME);

      var define = function (that, key, value) {
        var state = getInternalState(that);
        var data = getWeakData(anObject$4(key), true);
        if (data === true) uncaughtFrozenStore(state).set(key, value);
        else data[state.id] = value;
        return that;
      };

      defineBuiltIns$1(Prototype, {
        // `{ WeakMap, WeakSet }.prototype.delete(key)` methods
        // https://tc39.es/ecma262/#sec-weakmap.prototype.delete
        // https://tc39.es/ecma262/#sec-weakset.prototype.delete
        'delete': function (key) {
          var state = getInternalState(this);
          if (!isObject$4(key)) return false;
          var data = getWeakData(key);
          if (data === true) return uncaughtFrozenStore(state)['delete'](key);
          return data && hasOwn(data, state.id) && delete data[state.id];
        },
        // `{ WeakMap, WeakSet }.prototype.has(key)` methods
        // https://tc39.es/ecma262/#sec-weakmap.prototype.has
        // https://tc39.es/ecma262/#sec-weakset.prototype.has
        has: function has(key) {
          var state = getInternalState(this);
          if (!isObject$4(key)) return false;
          var data = getWeakData(key);
          if (data === true) return uncaughtFrozenStore(state).has(key);
          return data && hasOwn(data, state.id);
        }
      });

      defineBuiltIns$1(Prototype, IS_MAP ? {
        // `WeakMap.prototype.get(key)` method
        // https://tc39.es/ecma262/#sec-weakmap.prototype.get
        get: function get(key) {
          var state = getInternalState(this);
          if (isObject$4(key)) {
            var data = getWeakData(key);
            if (data === true) return uncaughtFrozenStore(state).get(key);
            return data ? data[state.id] : undefined;
          }
        },
        // `WeakMap.prototype.set(key, value)` method
        // https://tc39.es/ecma262/#sec-weakmap.prototype.set
        set: function set(key, value) {
          return define(this, key, value);
        }
      } : {
        // `WeakSet.prototype.add(value)` method
        // https://tc39.es/ecma262/#sec-weakset.prototype.add
        add: function add(value) {
          return define(this, value, true);
        }
      });

      return Constructor;
    }
  };

  var global$7 = global$k;
  var uncurryThis$5 = functionUncurryThis;
  var defineBuiltIns = defineBuiltIns$2;
  var InternalMetadataModule = internalMetadataExports;
  var collection = collection$1;
  var collectionWeak = collectionWeak$1;
  var isObject$3 = isObject$g;
  var isExtensible = objectIsExtensible;
  var enforceInternalState = internalState.enforce;
  var NATIVE_WEAK_MAP = weakMapBasicDetection;

  var IS_IE11 = !global$7.ActiveXObject && 'ActiveXObject' in global$7;
  var InternalWeakMap;

  var wrapper = function (init) {
    return function WeakMap() {
      return init(this, arguments.length ? arguments[0] : undefined);
    };
  };

  // `WeakMap` constructor
  // https://tc39.es/ecma262/#sec-weakmap-constructor
  var $WeakMap = collection('WeakMap', wrapper, collectionWeak);

  // IE11 WeakMap frozen keys fix
  // We can't use feature detection because it crash some old IE builds
  // https://github.com/zloirock/core-js/issues/485
  if (NATIVE_WEAK_MAP && IS_IE11) {
    InternalWeakMap = collectionWeak.getConstructor(wrapper, 'WeakMap', true);
    InternalMetadataModule.enable();
    var WeakMapPrototype = $WeakMap.prototype;
    var nativeDelete = uncurryThis$5(WeakMapPrototype['delete']);
    var nativeHas = uncurryThis$5(WeakMapPrototype.has);
    var nativeGet = uncurryThis$5(WeakMapPrototype.get);
    var nativeSet = uncurryThis$5(WeakMapPrototype.set);
    defineBuiltIns(WeakMapPrototype, {
      'delete': function (key) {
        if (isObject$3(key) && !isExtensible(key)) {
          var state = enforceInternalState(this);
          if (!state.frozen) state.frozen = new InternalWeakMap();
          return nativeDelete(this, key) || state.frozen['delete'](key);
        } return nativeDelete(this, key);
      },
      has: function has(key) {
        if (isObject$3(key) && !isExtensible(key)) {
          var state = enforceInternalState(this);
          if (!state.frozen) state.frozen = new InternalWeakMap();
          return nativeHas(this, key) || state.frozen.has(key);
        } return nativeHas(this, key);
      },
      get: function get(key) {
        if (isObject$3(key) && !isExtensible(key)) {
          var state = enforceInternalState(this);
          if (!state.frozen) state.frozen = new InternalWeakMap();
          return nativeHas(this, key) ? nativeGet(this, key) : state.frozen.get(key);
        } return nativeGet(this, key);
      },
      set: function set(key, value) {
        if (isObject$3(key) && !isExtensible(key)) {
          var state = enforceInternalState(this);
          if (!state.frozen) state.frozen = new InternalWeakMap();
          nativeHas(this, key) ? nativeSet(this, key, value) : state.frozen.set(key, value);
        } else nativeSet(this, key, value);
        return this;
      }
    });
  }

  var global$6 = global$k;
  var DOMIterables = domIterables;
  var DOMTokenListPrototype = domTokenListPrototype;
  var ArrayIteratorMethods = es_array_iterator;
  var createNonEnumerableProperty$1 = createNonEnumerableProperty$6;
  var wellKnownSymbol$2 = wellKnownSymbol$f;

  var ITERATOR = wellKnownSymbol$2('iterator');
  var TO_STRING_TAG = wellKnownSymbol$2('toStringTag');
  var ArrayValues = ArrayIteratorMethods.values;

  var handlePrototype = function (CollectionPrototype, COLLECTION_NAME) {
    if (CollectionPrototype) {
      // some Chrome versions have non-configurable methods on DOMTokenList
      if (CollectionPrototype[ITERATOR] !== ArrayValues) try {
        createNonEnumerableProperty$1(CollectionPrototype, ITERATOR, ArrayValues);
      } catch (error) {
        CollectionPrototype[ITERATOR] = ArrayValues;
      }
      if (!CollectionPrototype[TO_STRING_TAG]) {
        createNonEnumerableProperty$1(CollectionPrototype, TO_STRING_TAG, COLLECTION_NAME);
      }
      if (DOMIterables[COLLECTION_NAME]) for (var METHOD_NAME in ArrayIteratorMethods) {
        // some Chrome versions have non-configurable methods on DOMTokenList
        if (CollectionPrototype[METHOD_NAME] !== ArrayIteratorMethods[METHOD_NAME]) try {
          createNonEnumerableProperty$1(CollectionPrototype, METHOD_NAME, ArrayIteratorMethods[METHOD_NAME]);
        } catch (error) {
          CollectionPrototype[METHOD_NAME] = ArrayIteratorMethods[METHOD_NAME];
        }
      }
    }
  };

  for (var COLLECTION_NAME in DOMIterables) {
    handlePrototype(global$6[COLLECTION_NAME] && global$6[COLLECTION_NAME].prototype, COLLECTION_NAME);
  }

  handlePrototype(DOMTokenListPrototype, 'DOMTokenList');

  /**
   * lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="npm" -o ./`
   * Copyright jQuery Foundation and other contributors <https://jquery.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   */

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT$2 = 'Expected a function';

  /** Used as references for various `Number` constants. */
  var NAN$1 = 0 / 0;

  /** `Object#toString` result references. */
  var symbolTag$1 = '[object Symbol]';

  /** Used to match leading and trailing whitespace. */
  var reTrim$1 = /^\s+|\s+$/g;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex$1 = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary$1 = /^0b[01]+$/i;

  /** Used to detect octal string values. */
  var reIsOctal$1 = /^0o[0-7]+$/i;

  /** Built-in method references without a dependency on `root`. */
  var freeParseInt$1 = parseInt;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal$2 = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

  /** Detect free variable `self`. */
  var freeSelf$2 = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root$2 = freeGlobal$2 || freeSelf$2 || Function('return this')();

  /** Used for built-in method references. */
  var objectProto$2 = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString$2 = objectProto$2.toString;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeMax$1 = Math.max,
      nativeMin$1 = Math.min;

  /**
   * Gets the timestamp of the number of milliseconds that have elapsed since
   * the Unix epoch (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Date
   * @returns {number} Returns the timestamp.
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => Logs the number of milliseconds it took for the deferred invocation.
   */
  var now$1 = function() {
    return root$2.Date.now();
  };

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed `func` invocations and a `flush` method to immediately invoke them.
   * Provide `options` to indicate whether `func` should be invoked on the
   * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
   * with the last arguments provided to the debounced function. Subsequent
   * calls to the debounced function return the result of the last `func`
   * invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is
   * invoked on the trailing edge of the timeout only if the debounced function
   * is invoked more than once during the `wait` timeout.
   *
   * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
   * until to the next tick, similar to `setTimeout` with a timeout of `0`.
   *
   * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.leading=false]
   *  Specify invoking on the leading edge of the timeout.
   * @param {number} [options.maxWait]
   *  The maximum time `func` is allowed to be delayed before it's invoked.
   * @param {boolean} [options.trailing=true]
   *  Specify invoking on the trailing edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // Avoid costly calculations while the window size is in flux.
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // Invoke `sendMail` when clicked, debouncing subsequent calls.
   * jQuery(element).on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
   * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', debounced);
   *
   * // Cancel the trailing debounced invocation.
   * jQuery(window).on('popstate', debounced.cancel);
   */
  function debounce$1(func, wait, options) {
    var lastArgs,
        lastThis,
        maxWait,
        result,
        timerId,
        lastCallTime,
        lastInvokeTime = 0,
        leading = false,
        maxing = false,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT$2);
    }
    wait = toNumber$1(wait) || 0;
    if (isObject$2(options)) {
      leading = !!options.leading;
      maxing = 'maxWait' in options;
      maxWait = maxing ? nativeMax$1(toNumber$1(options.maxWait) || 0, wait) : maxWait;
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function invokeFunc(time) {
      var args = lastArgs,
          thisArg = lastThis;

      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }

    function leadingEdge(time) {
      // Reset any `maxWait` timer.
      lastInvokeTime = time;
      // Start the timer for the trailing edge.
      timerId = setTimeout(timerExpired, wait);
      // Invoke the leading edge.
      return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime,
          result = wait - timeSinceLastCall;

      return maxing ? nativeMin$1(result, maxWait - timeSinceLastInvoke) : result;
    }

    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime;

      // Either this is the first call, activity has stopped and we're at the
      // trailing edge, the system time has gone backwards and we're treating
      // it as the trailing edge, or we've hit the `maxWait` limit.
      return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
        (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
    }

    function timerExpired() {
      var time = now$1();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      // Restart the timer.
      timerId = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge(time) {
      timerId = undefined;

      // Only invoke if we have `lastArgs` which means `func` has been
      // debounced at least once.
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }

    function cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = undefined;
    }

    function flush() {
      return timerId === undefined ? result : trailingEdge(now$1());
    }

    function debounced() {
      var time = now$1(),
          isInvoking = shouldInvoke(time);

      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timerId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          // Handle invocations in a tight loop.
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === undefined) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }

  /**
   * Creates a throttled function that only invokes `func` at most once per
   * every `wait` milliseconds. The throttled function comes with a `cancel`
   * method to cancel delayed `func` invocations and a `flush` method to
   * immediately invoke them. Provide `options` to indicate whether `func`
   * should be invoked on the leading and/or trailing edge of the `wait`
   * timeout. The `func` is invoked with the last arguments provided to the
   * throttled function. Subsequent calls to the throttled function return the
   * result of the last `func` invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is
   * invoked on the trailing edge of the timeout only if the throttled function
   * is invoked more than once during the `wait` timeout.
   *
   * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
   * until to the next tick, similar to `setTimeout` with a timeout of `0`.
   *
   * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
   * for details over the differences between `_.throttle` and `_.debounce`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to throttle.
   * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.leading=true]
   *  Specify invoking on the leading edge of the timeout.
   * @param {boolean} [options.trailing=true]
   *  Specify invoking on the trailing edge of the timeout.
   * @returns {Function} Returns the new throttled function.
   * @example
   *
   * // Avoid excessively updating the position while scrolling.
   * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
   *
   * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
   * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
   * jQuery(element).on('click', throttled);
   *
   * // Cancel the trailing throttled invocation.
   * jQuery(window).on('popstate', throttled.cancel);
   */
  function throttle(func, wait, options) {
    var leading = true,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT$2);
    }
    if (isObject$2(options)) {
      leading = 'leading' in options ? !!options.leading : leading;
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }
    return debounce$1(func, wait, {
      'leading': leading,
      'maxWait': wait,
      'trailing': trailing
    });
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject$2(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike$1(value) {
    return !!value && typeof value == 'object';
  }

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol$1(value) {
    return typeof value == 'symbol' ||
      (isObjectLike$1(value) && objectToString$2.call(value) == symbolTag$1);
  }

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3.2);
   * // => 3.2
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3.2');
   * // => 3.2
   */
  function toNumber$1(value) {
    if (typeof value == 'number') {
      return value;
    }
    if (isSymbol$1(value)) {
      return NAN$1;
    }
    if (isObject$2(value)) {
      var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
      value = isObject$2(other) ? (other + '') : other;
    }
    if (typeof value != 'string') {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim$1, '');
    var isBinary = reIsBinary$1.test(value);
    return (isBinary || reIsOctal$1.test(value))
      ? freeParseInt$1(value.slice(2), isBinary ? 2 : 8)
      : (reIsBadHex$1.test(value) ? NAN$1 : +value);
  }

  var lodash_throttle = throttle;

  /**
   * lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="npm" -o ./`
   * Copyright jQuery Foundation and other contributors <https://jquery.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   */

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT$1 = 'Expected a function';

  /** Used as references for various `Number` constants. */
  var NAN = 0 / 0;

  /** `Object#toString` result references. */
  var symbolTag = '[object Symbol]';

  /** Used to match leading and trailing whitespace. */
  var reTrim = /^\s+|\s+$/g;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Built-in method references without a dependency on `root`. */
  var freeParseInt = parseInt;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal$1 = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

  /** Detect free variable `self`. */
  var freeSelf$1 = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root$1 = freeGlobal$1 || freeSelf$1 || Function('return this')();

  /** Used for built-in method references. */
  var objectProto$1 = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString$1 = objectProto$1.toString;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max,
      nativeMin = Math.min;

  /**
   * Gets the timestamp of the number of milliseconds that have elapsed since
   * the Unix epoch (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Date
   * @returns {number} Returns the timestamp.
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => Logs the number of milliseconds it took for the deferred invocation.
   */
  var now = function() {
    return root$1.Date.now();
  };

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed `func` invocations and a `flush` method to immediately invoke them.
   * Provide `options` to indicate whether `func` should be invoked on the
   * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
   * with the last arguments provided to the debounced function. Subsequent
   * calls to the debounced function return the result of the last `func`
   * invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is
   * invoked on the trailing edge of the timeout only if the debounced function
   * is invoked more than once during the `wait` timeout.
   *
   * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
   * until to the next tick, similar to `setTimeout` with a timeout of `0`.
   *
   * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.leading=false]
   *  Specify invoking on the leading edge of the timeout.
   * @param {number} [options.maxWait]
   *  The maximum time `func` is allowed to be delayed before it's invoked.
   * @param {boolean} [options.trailing=true]
   *  Specify invoking on the trailing edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // Avoid costly calculations while the window size is in flux.
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // Invoke `sendMail` when clicked, debouncing subsequent calls.
   * jQuery(element).on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
   * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', debounced);
   *
   * // Cancel the trailing debounced invocation.
   * jQuery(window).on('popstate', debounced.cancel);
   */
  function debounce(func, wait, options) {
    var lastArgs,
        lastThis,
        maxWait,
        result,
        timerId,
        lastCallTime,
        lastInvokeTime = 0,
        leading = false,
        maxing = false,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT$1);
    }
    wait = toNumber(wait) || 0;
    if (isObject$1(options)) {
      leading = !!options.leading;
      maxing = 'maxWait' in options;
      maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function invokeFunc(time) {
      var args = lastArgs,
          thisArg = lastThis;

      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }

    function leadingEdge(time) {
      // Reset any `maxWait` timer.
      lastInvokeTime = time;
      // Start the timer for the trailing edge.
      timerId = setTimeout(timerExpired, wait);
      // Invoke the leading edge.
      return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime,
          result = wait - timeSinceLastCall;

      return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
    }

    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime;

      // Either this is the first call, activity has stopped and we're at the
      // trailing edge, the system time has gone backwards and we're treating
      // it as the trailing edge, or we've hit the `maxWait` limit.
      return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
        (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
    }

    function timerExpired() {
      var time = now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      // Restart the timer.
      timerId = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge(time) {
      timerId = undefined;

      // Only invoke if we have `lastArgs` which means `func` has been
      // debounced at least once.
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }

    function cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = undefined;
    }

    function flush() {
      return timerId === undefined ? result : trailingEdge(now());
    }

    function debounced() {
      var time = now(),
          isInvoking = shouldInvoke(time);

      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timerId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          // Handle invocations in a tight loop.
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === undefined) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject$1(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == 'symbol' ||
      (isObjectLike(value) && objectToString$1.call(value) == symbolTag);
  }

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3.2);
   * // => 3.2
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3.2');
   * // => 3.2
   */
  function toNumber(value) {
    if (typeof value == 'number') {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject$1(value)) {
      var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
      value = isObject$1(other) ? (other + '') : other;
    }
    if (typeof value != 'string') {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim, '');
    var isBinary = reIsBinary.test(value);
    return (isBinary || reIsOctal.test(value))
      ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
      : (reIsBadHex.test(value) ? NAN : +value);
  }

  var lodash_debounce = debounce;

  /**
   * lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="npm" -o ./`
   * Copyright jQuery Foundation and other contributors <https://jquery.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   */

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = '__lodash_hash_undefined__';

  /** `Object#toString` result references. */
  var funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]';

  /**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

  /** Used to detect host constructors (Safari). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

  /** Detect free variable `self`. */
  var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root = freeGlobal || freeSelf || Function('return this')();

  /**
   * Gets the value at `key` of `object`.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */
  function getValue(object, key) {
    return object == null ? undefined : object[key];
  }

  /**
   * Checks if `value` is a host object in IE < 9.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
   */
  function isHostObject(value) {
    // Many host objects are `Object` objects that can coerce to strings
    // despite having improperly defined `toString` methods.
    var result = false;
    if (value != null && typeof value.toString != 'function') {
      try {
        result = !!(value + '');
      } catch (e) {}
    }
    return result;
  }

  /** Used for built-in method references. */
  var arrayProto = Array.prototype,
      funcProto = Function.prototype,
      objectProto = Object.prototype;

  /** Used to detect overreaching core-js shims. */
  var coreJsData = root['__core-js_shared__'];

  /** Used to detect methods masquerading as native. */
  var maskSrcKey = (function() {
    var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
    return uid ? ('Symbol(src)_1.' + uid) : '';
  }());

  /** Used to resolve the decompiled source of functions. */
  var funcToString = funcProto.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString = objectProto.toString;

  /** Used to detect if a method is native. */
  var reIsNative = RegExp('^' +
    funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
    .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
  );

  /** Built-in value references. */
  var splice = arrayProto.splice;

  /* Built-in method references that are verified to be native. */
  var Map$1 = getNative(root, 'Map'),
      nativeCreate = getNative(Object, 'create');

  /**
   * Creates a hash object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Hash(entries) {
    var index = -1,
        length = entries ? entries.length : 0;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the hash.
   *
   * @private
   * @name clear
   * @memberOf Hash
   */
  function hashClear() {
    this.__data__ = nativeCreate ? nativeCreate(null) : {};
  }

  /**
   * Removes `key` and its value from the hash.
   *
   * @private
   * @name delete
   * @memberOf Hash
   * @param {Object} hash The hash to modify.
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function hashDelete(key) {
    return this.has(key) && delete this.__data__[key];
  }

  /**
   * Gets the hash value for `key`.
   *
   * @private
   * @name get
   * @memberOf Hash
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function hashGet(key) {
    var data = this.__data__;
    if (nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED ? undefined : result;
    }
    return hasOwnProperty.call(data, key) ? data[key] : undefined;
  }

  /**
   * Checks if a hash value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Hash
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function hashHas(key) {
    var data = this.__data__;
    return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
  }

  /**
   * Sets the hash `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Hash
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the hash instance.
   */
  function hashSet(key, value) {
    var data = this.__data__;
    data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
    return this;
  }

  // Add methods to `Hash`.
  Hash.prototype.clear = hashClear;
  Hash.prototype['delete'] = hashDelete;
  Hash.prototype.get = hashGet;
  Hash.prototype.has = hashHas;
  Hash.prototype.set = hashSet;

  /**
   * Creates an list cache object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function ListCache(entries) {
    var index = -1,
        length = entries ? entries.length : 0;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the list cache.
   *
   * @private
   * @name clear
   * @memberOf ListCache
   */
  function listCacheClear() {
    this.__data__ = [];
  }

  /**
   * Removes `key` and its value from the list cache.
   *
   * @private
   * @name delete
   * @memberOf ListCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function listCacheDelete(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }
    return true;
  }

  /**
   * Gets the list cache value for `key`.
   *
   * @private
   * @name get
   * @memberOf ListCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function listCacheGet(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    return index < 0 ? undefined : data[index][1];
  }

  /**
   * Checks if a list cache value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf ListCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function listCacheHas(key) {
    return assocIndexOf(this.__data__, key) > -1;
  }

  /**
   * Sets the list cache `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf ListCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the list cache instance.
   */
  function listCacheSet(key, value) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }
    return this;
  }

  // Add methods to `ListCache`.
  ListCache.prototype.clear = listCacheClear;
  ListCache.prototype['delete'] = listCacheDelete;
  ListCache.prototype.get = listCacheGet;
  ListCache.prototype.has = listCacheHas;
  ListCache.prototype.set = listCacheSet;

  /**
   * Creates a map cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function MapCache(entries) {
    var index = -1,
        length = entries ? entries.length : 0;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the map.
   *
   * @private
   * @name clear
   * @memberOf MapCache
   */
  function mapCacheClear() {
    this.__data__ = {
      'hash': new Hash,
      'map': new (Map$1 || ListCache),
      'string': new Hash
    };
  }

  /**
   * Removes `key` and its value from the map.
   *
   * @private
   * @name delete
   * @memberOf MapCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function mapCacheDelete(key) {
    return getMapData(this, key)['delete'](key);
  }

  /**
   * Gets the map value for `key`.
   *
   * @private
   * @name get
   * @memberOf MapCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function mapCacheGet(key) {
    return getMapData(this, key).get(key);
  }

  /**
   * Checks if a map value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf MapCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function mapCacheHas(key) {
    return getMapData(this, key).has(key);
  }

  /**
   * Sets the map `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf MapCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the map cache instance.
   */
  function mapCacheSet(key, value) {
    getMapData(this, key).set(key, value);
    return this;
  }

  // Add methods to `MapCache`.
  MapCache.prototype.clear = mapCacheClear;
  MapCache.prototype['delete'] = mapCacheDelete;
  MapCache.prototype.get = mapCacheGet;
  MapCache.prototype.has = mapCacheHas;
  MapCache.prototype.set = mapCacheSet;

  /**
   * Gets the index at which the `key` is found in `array` of key-value pairs.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} key The key to search for.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }

  /**
   * The base implementation of `_.isNative` without bad shim checks.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function,
   *  else `false`.
   */
  function baseIsNative(value) {
    if (!isObject(value) || isMasked(value)) {
      return false;
    }
    var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource(value));
  }

  /**
   * Gets the data for `map`.
   *
   * @private
   * @param {Object} map The map to query.
   * @param {string} key The reference key.
   * @returns {*} Returns the map data.
   */
  function getMapData(map, key) {
    var data = map.__data__;
    return isKeyable(key)
      ? data[typeof key == 'string' ? 'string' : 'hash']
      : data.map;
  }

  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */
  function getNative(object, key) {
    var value = getValue(object, key);
    return baseIsNative(value) ? value : undefined;
  }

  /**
   * Checks if `value` is suitable for use as unique object key.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
   */
  function isKeyable(value) {
    var type = typeof value;
    return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
      ? (value !== '__proto__')
      : (value === null);
  }

  /**
   * Checks if `func` has its source masked.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` is masked, else `false`.
   */
  function isMasked(func) {
    return !!maskSrcKey && (maskSrcKey in func);
  }

  /**
   * Converts `func` to its source code.
   *
   * @private
   * @param {Function} func The function to process.
   * @returns {string} Returns the source code.
   */
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString.call(func);
      } catch (e) {}
      try {
        return (func + '');
      } catch (e) {}
    }
    return '';
  }

  /**
   * Creates a function that memoizes the result of `func`. If `resolver` is
   * provided, it determines the cache key for storing the result based on the
   * arguments provided to the memoized function. By default, the first argument
   * provided to the memoized function is used as the map cache key. The `func`
   * is invoked with the `this` binding of the memoized function.
   *
   * **Note:** The cache is exposed as the `cache` property on the memoized
   * function. Its creation may be customized by replacing the `_.memoize.Cache`
   * constructor with one whose instances implement the
   * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
   * method interface of `delete`, `get`, `has`, and `set`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] The function to resolve the cache key.
   * @returns {Function} Returns the new memoized function.
   * @example
   *
   * var object = { 'a': 1, 'b': 2 };
   * var other = { 'c': 3, 'd': 4 };
   *
   * var values = _.memoize(_.values);
   * values(object);
   * // => [1, 2]
   *
   * values(other);
   * // => [3, 4]
   *
   * object.a = 2;
   * values(object);
   * // => [1, 2]
   *
   * // Modify the result cache.
   * values.cache.set(object, ['a', 'b']);
   * values(object);
   * // => ['a', 'b']
   *
   * // Replace `_.memoize.Cache`.
   * _.memoize.Cache = WeakMap;
   */
  function memoize(func, resolver) {
    if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var memoized = function() {
      var args = arguments,
          key = resolver ? resolver.apply(this, args) : args[0],
          cache = memoized.cache;

      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result);
      return result;
    };
    memoized.cache = new (memoize.Cache || MapCache);
    return memoized;
  }

  // Assign cache to `_.memoize`.
  memoize.Cache = MapCache;

  /**
   * Performs a
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * comparison between two values to determine if they are equivalent.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.eq(object, object);
   * // => true
   *
   * _.eq(object, other);
   * // => false
   *
   * _.eq('a', 'a');
   * // => true
   *
   * _.eq('a', Object('a'));
   * // => false
   *
   * _.eq(NaN, NaN);
   * // => true
   */
  function eq(value, other) {
    return value === other || (value !== value && other !== other);
  }

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 8-9 which returns 'object' for typed array and other constructors.
    var tag = isObject(value) ? objectToString.call(value) : '';
    return tag == funcTag || tag == genTag;
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  var lodash_memoize = memoize;

  var resizeObservers = [];

  var hasActiveObservations = function () {
      return resizeObservers.some(function (ro) { return ro.activeTargets.length > 0; });
  };

  var hasSkippedObservations = function () {
      return resizeObservers.some(function (ro) { return ro.skippedTargets.length > 0; });
  };

  var msg = 'ResizeObserver loop completed with undelivered notifications.';
  var deliverResizeLoopError = function () {
      var event;
      if (typeof ErrorEvent === 'function') {
          event = new ErrorEvent('error', {
              message: msg
          });
      }
      else {
          event = document.createEvent('Event');
          event.initEvent('error', false, false);
          event.message = msg;
      }
      window.dispatchEvent(event);
  };

  var ResizeObserverBoxOptions;
  (function (ResizeObserverBoxOptions) {
      ResizeObserverBoxOptions["BORDER_BOX"] = "border-box";
      ResizeObserverBoxOptions["CONTENT_BOX"] = "content-box";
      ResizeObserverBoxOptions["DEVICE_PIXEL_CONTENT_BOX"] = "device-pixel-content-box";
  })(ResizeObserverBoxOptions || (ResizeObserverBoxOptions = {}));

  var freeze = function (obj) { return Object.freeze(obj); };

  var ResizeObserverSize = (function () {
      function ResizeObserverSize(inlineSize, blockSize) {
          this.inlineSize = inlineSize;
          this.blockSize = blockSize;
          freeze(this);
      }
      return ResizeObserverSize;
  }());

  var DOMRectReadOnly = (function () {
      function DOMRectReadOnly(x, y, width, height) {
          this.x = x;
          this.y = y;
          this.width = width;
          this.height = height;
          this.top = this.y;
          this.left = this.x;
          this.bottom = this.top + this.height;
          this.right = this.left + this.width;
          return freeze(this);
      }
      DOMRectReadOnly.prototype.toJSON = function () {
          var _a = this, x = _a.x, y = _a.y, top = _a.top, right = _a.right, bottom = _a.bottom, left = _a.left, width = _a.width, height = _a.height;
          return { x: x, y: y, top: top, right: right, bottom: bottom, left: left, width: width, height: height };
      };
      DOMRectReadOnly.fromRect = function (rectangle) {
          return new DOMRectReadOnly(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
      };
      return DOMRectReadOnly;
  }());

  var isSVG = function (target) { return target instanceof SVGElement && 'getBBox' in target; };
  var isHidden = function (target) {
      if (isSVG(target)) {
          var _a = target.getBBox(), width = _a.width, height = _a.height;
          return !width && !height;
      }
      var _b = target, offsetWidth = _b.offsetWidth, offsetHeight = _b.offsetHeight;
      return !(offsetWidth || offsetHeight || target.getClientRects().length);
  };
  var isElement = function (obj) {
      var _a;
      if (obj instanceof Element) {
          return true;
      }
      var scope = (_a = obj === null || obj === void 0 ? void 0 : obj.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView;
      return !!(scope && obj instanceof scope.Element);
  };
  var isReplacedElement = function (target) {
      switch (target.tagName) {
          case 'INPUT':
              if (target.type !== 'image') {
                  break;
              }
          case 'VIDEO':
          case 'AUDIO':
          case 'EMBED':
          case 'OBJECT':
          case 'CANVAS':
          case 'IFRAME':
          case 'IMG':
              return true;
      }
      return false;
  };

  var global$5 = typeof window !== 'undefined' ? window : {};

  var cache = new WeakMap();
  var scrollRegexp = /auto|scroll/;
  var verticalRegexp = /^tb|vertical/;
  var IE = (/msie|trident/i).test(global$5.navigator && global$5.navigator.userAgent);
  var parseDimension = function (pixel) { return parseFloat(pixel || '0'); };
  var size = function (inlineSize, blockSize, switchSizes) {
      if (inlineSize === void 0) { inlineSize = 0; }
      if (blockSize === void 0) { blockSize = 0; }
      if (switchSizes === void 0) { switchSizes = false; }
      return new ResizeObserverSize((switchSizes ? blockSize : inlineSize) || 0, (switchSizes ? inlineSize : blockSize) || 0);
  };
  var zeroBoxes = freeze({
      devicePixelContentBoxSize: size(),
      borderBoxSize: size(),
      contentBoxSize: size(),
      contentRect: new DOMRectReadOnly(0, 0, 0, 0)
  });
  var calculateBoxSizes = function (target, forceRecalculation) {
      if (forceRecalculation === void 0) { forceRecalculation = false; }
      if (cache.has(target) && !forceRecalculation) {
          return cache.get(target);
      }
      if (isHidden(target)) {
          cache.set(target, zeroBoxes);
          return zeroBoxes;
      }
      var cs = getComputedStyle(target);
      var svg = isSVG(target) && target.ownerSVGElement && target.getBBox();
      var removePadding = !IE && cs.boxSizing === 'border-box';
      var switchSizes = verticalRegexp.test(cs.writingMode || '');
      var canScrollVertically = !svg && scrollRegexp.test(cs.overflowY || '');
      var canScrollHorizontally = !svg && scrollRegexp.test(cs.overflowX || '');
      var paddingTop = svg ? 0 : parseDimension(cs.paddingTop);
      var paddingRight = svg ? 0 : parseDimension(cs.paddingRight);
      var paddingBottom = svg ? 0 : parseDimension(cs.paddingBottom);
      var paddingLeft = svg ? 0 : parseDimension(cs.paddingLeft);
      var borderTop = svg ? 0 : parseDimension(cs.borderTopWidth);
      var borderRight = svg ? 0 : parseDimension(cs.borderRightWidth);
      var borderBottom = svg ? 0 : parseDimension(cs.borderBottomWidth);
      var borderLeft = svg ? 0 : parseDimension(cs.borderLeftWidth);
      var horizontalPadding = paddingLeft + paddingRight;
      var verticalPadding = paddingTop + paddingBottom;
      var horizontalBorderArea = borderLeft + borderRight;
      var verticalBorderArea = borderTop + borderBottom;
      var horizontalScrollbarThickness = !canScrollHorizontally ? 0 : target.offsetHeight - verticalBorderArea - target.clientHeight;
      var verticalScrollbarThickness = !canScrollVertically ? 0 : target.offsetWidth - horizontalBorderArea - target.clientWidth;
      var widthReduction = removePadding ? horizontalPadding + horizontalBorderArea : 0;
      var heightReduction = removePadding ? verticalPadding + verticalBorderArea : 0;
      var contentWidth = svg ? svg.width : parseDimension(cs.width) - widthReduction - verticalScrollbarThickness;
      var contentHeight = svg ? svg.height : parseDimension(cs.height) - heightReduction - horizontalScrollbarThickness;
      var borderBoxWidth = contentWidth + horizontalPadding + verticalScrollbarThickness + horizontalBorderArea;
      var borderBoxHeight = contentHeight + verticalPadding + horizontalScrollbarThickness + verticalBorderArea;
      var boxes = freeze({
          devicePixelContentBoxSize: size(Math.round(contentWidth * devicePixelRatio), Math.round(contentHeight * devicePixelRatio), switchSizes),
          borderBoxSize: size(borderBoxWidth, borderBoxHeight, switchSizes),
          contentBoxSize: size(contentWidth, contentHeight, switchSizes),
          contentRect: new DOMRectReadOnly(paddingLeft, paddingTop, contentWidth, contentHeight)
      });
      cache.set(target, boxes);
      return boxes;
  };
  var calculateBoxSize = function (target, observedBox, forceRecalculation) {
      var _a = calculateBoxSizes(target, forceRecalculation), borderBoxSize = _a.borderBoxSize, contentBoxSize = _a.contentBoxSize, devicePixelContentBoxSize = _a.devicePixelContentBoxSize;
      switch (observedBox) {
          case ResizeObserverBoxOptions.DEVICE_PIXEL_CONTENT_BOX:
              return devicePixelContentBoxSize;
          case ResizeObserverBoxOptions.BORDER_BOX:
              return borderBoxSize;
          default:
              return contentBoxSize;
      }
  };

  var ResizeObserverEntry = (function () {
      function ResizeObserverEntry(target) {
          var boxes = calculateBoxSizes(target);
          this.target = target;
          this.contentRect = boxes.contentRect;
          this.borderBoxSize = freeze([boxes.borderBoxSize]);
          this.contentBoxSize = freeze([boxes.contentBoxSize]);
          this.devicePixelContentBoxSize = freeze([boxes.devicePixelContentBoxSize]);
      }
      return ResizeObserverEntry;
  }());

  var calculateDepthForNode = function (node) {
      if (isHidden(node)) {
          return Infinity;
      }
      var depth = 0;
      var parent = node.parentNode;
      while (parent) {
          depth += 1;
          parent = parent.parentNode;
      }
      return depth;
  };

  var broadcastActiveObservations = function () {
      var shallowestDepth = Infinity;
      var callbacks = [];
      resizeObservers.forEach(function processObserver(ro) {
          if (ro.activeTargets.length === 0) {
              return;
          }
          var entries = [];
          ro.activeTargets.forEach(function processTarget(ot) {
              var entry = new ResizeObserverEntry(ot.target);
              var targetDepth = calculateDepthForNode(ot.target);
              entries.push(entry);
              ot.lastReportedSize = calculateBoxSize(ot.target, ot.observedBox);
              if (targetDepth < shallowestDepth) {
                  shallowestDepth = targetDepth;
              }
          });
          callbacks.push(function resizeObserverCallback() {
              ro.callback.call(ro.observer, entries, ro.observer);
          });
          ro.activeTargets.splice(0, ro.activeTargets.length);
      });
      for (var _i = 0, callbacks_1 = callbacks; _i < callbacks_1.length; _i++) {
          var callback = callbacks_1[_i];
          callback();
      }
      return shallowestDepth;
  };

  var gatherActiveObservationsAtDepth = function (depth) {
      resizeObservers.forEach(function processObserver(ro) {
          ro.activeTargets.splice(0, ro.activeTargets.length);
          ro.skippedTargets.splice(0, ro.skippedTargets.length);
          ro.observationTargets.forEach(function processTarget(ot) {
              if (ot.isActive()) {
                  if (calculateDepthForNode(ot.target) > depth) {
                      ro.activeTargets.push(ot);
                  }
                  else {
                      ro.skippedTargets.push(ot);
                  }
              }
          });
      });
  };

  var process = function () {
      var depth = 0;
      gatherActiveObservationsAtDepth(depth);
      while (hasActiveObservations()) {
          depth = broadcastActiveObservations();
          gatherActiveObservationsAtDepth(depth);
      }
      if (hasSkippedObservations()) {
          deliverResizeLoopError();
      }
      return depth > 0;
  };

  var trigger;
  var callbacks = [];
  var notify = function () { return callbacks.splice(0).forEach(function (cb) { return cb(); }); };
  var queueMicroTask = function (callback) {
      if (!trigger) {
          var toggle_1 = 0;
          var el_1 = document.createTextNode('');
          var config = { characterData: true };
          new MutationObserver(function () { return notify(); }).observe(el_1, config);
          trigger = function () { el_1.textContent = "".concat(toggle_1 ? toggle_1-- : toggle_1++); };
      }
      callbacks.push(callback);
      trigger();
  };

  var queueResizeObserver = function (cb) {
      queueMicroTask(function ResizeObserver() {
          requestAnimationFrame(cb);
      });
  };

  var watching = 0;
  var isWatching = function () { return !!watching; };
  var CATCH_PERIOD = 250;
  var observerConfig = { attributes: true, characterData: true, childList: true, subtree: true };
  var events = [
      'resize',
      'load',
      'transitionend',
      'animationend',
      'animationstart',
      'animationiteration',
      'keyup',
      'keydown',
      'mouseup',
      'mousedown',
      'mouseover',
      'mouseout',
      'blur',
      'focus'
  ];
  var time = function (timeout) {
      if (timeout === void 0) { timeout = 0; }
      return Date.now() + timeout;
  };
  var scheduled = false;
  var Scheduler = (function () {
      function Scheduler() {
          var _this = this;
          this.stopped = true;
          this.listener = function () { return _this.schedule(); };
      }
      Scheduler.prototype.run = function (timeout) {
          var _this = this;
          if (timeout === void 0) { timeout = CATCH_PERIOD; }
          if (scheduled) {
              return;
          }
          scheduled = true;
          var until = time(timeout);
          queueResizeObserver(function () {
              var elementsHaveResized = false;
              try {
                  elementsHaveResized = process();
              }
              finally {
                  scheduled = false;
                  timeout = until - time();
                  if (!isWatching()) {
                      return;
                  }
                  if (elementsHaveResized) {
                      _this.run(1000);
                  }
                  else if (timeout > 0) {
                      _this.run(timeout);
                  }
                  else {
                      _this.start();
                  }
              }
          });
      };
      Scheduler.prototype.schedule = function () {
          this.stop();
          this.run();
      };
      Scheduler.prototype.observe = function () {
          var _this = this;
          var cb = function () { return _this.observer && _this.observer.observe(document.body, observerConfig); };
          document.body ? cb() : global$5.addEventListener('DOMContentLoaded', cb);
      };
      Scheduler.prototype.start = function () {
          var _this = this;
          if (this.stopped) {
              this.stopped = false;
              this.observer = new MutationObserver(this.listener);
              this.observe();
              events.forEach(function (name) { return global$5.addEventListener(name, _this.listener, true); });
          }
      };
      Scheduler.prototype.stop = function () {
          var _this = this;
          if (!this.stopped) {
              this.observer && this.observer.disconnect();
              events.forEach(function (name) { return global$5.removeEventListener(name, _this.listener, true); });
              this.stopped = true;
          }
      };
      return Scheduler;
  }());
  var scheduler = new Scheduler();
  var updateCount = function (n) {
      !watching && n > 0 && scheduler.start();
      watching += n;
      !watching && scheduler.stop();
  };

  var skipNotifyOnElement = function (target) {
      return !isSVG(target)
          && !isReplacedElement(target)
          && getComputedStyle(target).display === 'inline';
  };
  var ResizeObservation = (function () {
      function ResizeObservation(target, observedBox) {
          this.target = target;
          this.observedBox = observedBox || ResizeObserverBoxOptions.CONTENT_BOX;
          this.lastReportedSize = {
              inlineSize: 0,
              blockSize: 0
          };
      }
      ResizeObservation.prototype.isActive = function () {
          var size = calculateBoxSize(this.target, this.observedBox, true);
          if (skipNotifyOnElement(this.target)) {
              this.lastReportedSize = size;
          }
          if (this.lastReportedSize.inlineSize !== size.inlineSize
              || this.lastReportedSize.blockSize !== size.blockSize) {
              return true;
          }
          return false;
      };
      return ResizeObservation;
  }());

  var ResizeObserverDetail = (function () {
      function ResizeObserverDetail(resizeObserver, callback) {
          this.activeTargets = [];
          this.skippedTargets = [];
          this.observationTargets = [];
          this.observer = resizeObserver;
          this.callback = callback;
      }
      return ResizeObserverDetail;
  }());

  var observerMap = new WeakMap();
  var getObservationIndex = function (observationTargets, target) {
      for (var i = 0; i < observationTargets.length; i += 1) {
          if (observationTargets[i].target === target) {
              return i;
          }
      }
      return -1;
  };
  var ResizeObserverController = (function () {
      function ResizeObserverController() {
      }
      ResizeObserverController.connect = function (resizeObserver, callback) {
          var detail = new ResizeObserverDetail(resizeObserver, callback);
          observerMap.set(resizeObserver, detail);
      };
      ResizeObserverController.observe = function (resizeObserver, target, options) {
          var detail = observerMap.get(resizeObserver);
          var firstObservation = detail.observationTargets.length === 0;
          if (getObservationIndex(detail.observationTargets, target) < 0) {
              firstObservation && resizeObservers.push(detail);
              detail.observationTargets.push(new ResizeObservation(target, options && options.box));
              updateCount(1);
              scheduler.schedule();
          }
      };
      ResizeObserverController.unobserve = function (resizeObserver, target) {
          var detail = observerMap.get(resizeObserver);
          var index = getObservationIndex(detail.observationTargets, target);
          var lastObservation = detail.observationTargets.length === 1;
          if (index >= 0) {
              lastObservation && resizeObservers.splice(resizeObservers.indexOf(detail), 1);
              detail.observationTargets.splice(index, 1);
              updateCount(-1);
          }
      };
      ResizeObserverController.disconnect = function (resizeObserver) {
          var _this = this;
          var detail = observerMap.get(resizeObserver);
          detail.observationTargets.slice().forEach(function (ot) { return _this.unobserve(resizeObserver, ot.target); });
          detail.activeTargets.splice(0, detail.activeTargets.length);
      };
      return ResizeObserverController;
  }());

  var ResizeObserver = (function () {
      function ResizeObserver(callback) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (typeof callback !== 'function') {
              throw new TypeError("Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.");
          }
          ResizeObserverController.connect(this, callback);
      }
      ResizeObserver.prototype.observe = function (target, options) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (!isElement(target)) {
              throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element");
          }
          ResizeObserverController.observe(this, target, options);
      };
      ResizeObserver.prototype.unobserve = function (target) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (!isElement(target)) {
              throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element");
          }
          ResizeObserverController.unobserve(this, target);
      };
      ResizeObserver.prototype.disconnect = function () {
          ResizeObserverController.disconnect(this);
      };
      ResizeObserver.toString = function () {
          return 'function ResizeObserver () { [polyfill code] }';
      };
      return ResizeObserver;
  }());

  var aCallable = aCallable$4;
  var toObject$1 = toObject$6;
  var IndexedObject = indexedObject;
  var lengthOfArrayLike = lengthOfArrayLike$5;

  var $TypeError$1 = TypeError;

  // `Array.prototype.{ reduce, reduceRight }` methods implementation
  var createMethod = function (IS_RIGHT) {
    return function (that, callbackfn, argumentsLength, memo) {
      aCallable(callbackfn);
      var O = toObject$1(that);
      var self = IndexedObject(O);
      var length = lengthOfArrayLike(O);
      var index = IS_RIGHT ? length - 1 : 0;
      var i = IS_RIGHT ? -1 : 1;
      if (argumentsLength < 2) while (true) {
        if (index in self) {
          memo = self[index];
          index += i;
          break;
        }
        index += i;
        if (IS_RIGHT ? index < 0 : length <= index) {
          throw $TypeError$1('Reduce of empty array with no initial value');
        }
      }
      for (;IS_RIGHT ? index >= 0 : length > index; index += i) if (index in self) {
        memo = callbackfn(memo, self[index], index, O);
      }
      return memo;
    };
  };

  var arrayReduce = {
    // `Array.prototype.reduce` method
    // https://tc39.es/ecma262/#sec-array.prototype.reduce
    left: createMethod(false),
    // `Array.prototype.reduceRight` method
    // https://tc39.es/ecma262/#sec-array.prototype.reduceright
    right: createMethod(true)
  };

  var classof$1 = classofRaw$2;
  var global$4 = global$k;

  var engineIsNode = classof$1(global$4.process) == 'process';

  var $$1 = _export;
  var $reduce = arrayReduce.left;
  var arrayMethodIsStrict = arrayMethodIsStrict$2;
  var CHROME_VERSION = engineV8Version;
  var IS_NODE = engineIsNode;

  var STRICT_METHOD = arrayMethodIsStrict('reduce');
  // Chrome 80-82 has a critical bug
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1049982
  var CHROME_BUG = !IS_NODE && CHROME_VERSION > 79 && CHROME_VERSION < 83;

  // `Array.prototype.reduce` method
  // https://tc39.es/ecma262/#sec-array.prototype.reduce
  $$1({ target: 'Array', proto: true, forced: !STRICT_METHOD || CHROME_BUG }, {
    reduce: function reduce(callbackfn /* , initialValue */) {
      var length = arguments.length;
      return $reduce(this, callbackfn, length, length > 1 ? arguments[1] : undefined);
    }
  });

  var anObject$3 = anObject$d;

  // `RegExp.prototype.flags` getter implementation
  // https://tc39.es/ecma262/#sec-get-regexp.prototype.flags
  var regexpFlags$1 = function () {
    var that = anObject$3(this);
    var result = '';
    if (that.hasIndices) result += 'd';
    if (that.global) result += 'g';
    if (that.ignoreCase) result += 'i';
    if (that.multiline) result += 'm';
    if (that.dotAll) result += 's';
    if (that.unicode) result += 'u';
    if (that.unicodeSets) result += 'v';
    if (that.sticky) result += 'y';
    return result;
  };

  var fails$4 = fails$o;
  var global$3 = global$k;

  // babel-minify and Closure Compiler transpiles RegExp('a', 'y') -> /a/y and it causes SyntaxError
  var $RegExp$2 = global$3.RegExp;

  var UNSUPPORTED_Y$1 = fails$4(function () {
    var re = $RegExp$2('a', 'y');
    re.lastIndex = 2;
    return re.exec('abcd') != null;
  });

  // UC Browser bug
  // https://github.com/zloirock/core-js/issues/1008
  var MISSED_STICKY = UNSUPPORTED_Y$1 || fails$4(function () {
    return !$RegExp$2('a', 'y').sticky;
  });

  var BROKEN_CARET = UNSUPPORTED_Y$1 || fails$4(function () {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=773687
    var re = $RegExp$2('^r', 'gy');
    re.lastIndex = 2;
    return re.exec('str') != null;
  });

  var regexpStickyHelpers = {
    BROKEN_CARET: BROKEN_CARET,
    MISSED_STICKY: MISSED_STICKY,
    UNSUPPORTED_Y: UNSUPPORTED_Y$1
  };

  var fails$3 = fails$o;
  var global$2 = global$k;

  // babel-minify and Closure Compiler transpiles RegExp('.', 's') -> /./s and it causes SyntaxError
  var $RegExp$1 = global$2.RegExp;

  var regexpUnsupportedDotAll = fails$3(function () {
    var re = $RegExp$1('.', 's');
    return !(re.dotAll && re.exec('\n') && re.flags === 's');
  });

  var fails$2 = fails$o;
  var global$1 = global$k;

  // babel-minify and Closure Compiler transpiles RegExp('(?<a>b)', 'g') -> /(?<a>b)/g and it causes SyntaxError
  var $RegExp = global$1.RegExp;

  var regexpUnsupportedNcg = fails$2(function () {
    var re = $RegExp('(?<a>b)', 'g');
    return re.exec('b').groups.a !== 'b' ||
      'b'.replace(re, '$<a>c') !== 'bc';
  });

  /* eslint-disable regexp/no-empty-capturing-group, regexp/no-empty-group, regexp/no-lazy-ends -- testing */
  /* eslint-disable regexp/no-useless-quantifier -- testing */
  var call$4 = functionCall;
  var uncurryThis$4 = functionUncurryThis;
  var toString$2 = toString$7;
  var regexpFlags = regexpFlags$1;
  var stickyHelpers = regexpStickyHelpers;
  var shared = sharedExports;
  var create = objectCreate;
  var getInternalState = internalState.get;
  var UNSUPPORTED_DOT_ALL = regexpUnsupportedDotAll;
  var UNSUPPORTED_NCG = regexpUnsupportedNcg;

  var nativeReplace = shared('native-string-replace', String.prototype.replace);
  var nativeExec = RegExp.prototype.exec;
  var patchedExec = nativeExec;
  var charAt$2 = uncurryThis$4(''.charAt);
  var indexOf = uncurryThis$4(''.indexOf);
  var replace$1 = uncurryThis$4(''.replace);
  var stringSlice$2 = uncurryThis$4(''.slice);

  var UPDATES_LAST_INDEX_WRONG = (function () {
    var re1 = /a/;
    var re2 = /b*/g;
    call$4(nativeExec, re1, 'a');
    call$4(nativeExec, re2, 'a');
    return re1.lastIndex !== 0 || re2.lastIndex !== 0;
  })();

  var UNSUPPORTED_Y = stickyHelpers.BROKEN_CARET;

  // nonparticipating capturing group, copied from es5-shim's String#split patch.
  var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;

  var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED || UNSUPPORTED_Y || UNSUPPORTED_DOT_ALL || UNSUPPORTED_NCG;

  if (PATCH) {
    patchedExec = function exec(string) {
      var re = this;
      var state = getInternalState(re);
      var str = toString$2(string);
      var raw = state.raw;
      var result, reCopy, lastIndex, match, i, object, group;

      if (raw) {
        raw.lastIndex = re.lastIndex;
        result = call$4(patchedExec, raw, str);
        re.lastIndex = raw.lastIndex;
        return result;
      }

      var groups = state.groups;
      var sticky = UNSUPPORTED_Y && re.sticky;
      var flags = call$4(regexpFlags, re);
      var source = re.source;
      var charsAdded = 0;
      var strCopy = str;

      if (sticky) {
        flags = replace$1(flags, 'y', '');
        if (indexOf(flags, 'g') === -1) {
          flags += 'g';
        }

        strCopy = stringSlice$2(str, re.lastIndex);
        // Support anchored sticky behavior.
        if (re.lastIndex > 0 && (!re.multiline || re.multiline && charAt$2(str, re.lastIndex - 1) !== '\n')) {
          source = '(?: ' + source + ')';
          strCopy = ' ' + strCopy;
          charsAdded++;
        }
        // ^(? + rx + ) is needed, in combination with some str slicing, to
        // simulate the 'y' flag.
        reCopy = new RegExp('^(?:' + source + ')', flags);
      }

      if (NPCG_INCLUDED) {
        reCopy = new RegExp('^' + source + '$(?!\\s)', flags);
      }
      if (UPDATES_LAST_INDEX_WRONG) lastIndex = re.lastIndex;

      match = call$4(nativeExec, sticky ? reCopy : re, strCopy);

      if (sticky) {
        if (match) {
          match.input = stringSlice$2(match.input, charsAdded);
          match[0] = stringSlice$2(match[0], charsAdded);
          match.index = re.lastIndex;
          re.lastIndex += match[0].length;
        } else re.lastIndex = 0;
      } else if (UPDATES_LAST_INDEX_WRONG && match) {
        re.lastIndex = re.global ? match.index + match[0].length : lastIndex;
      }
      if (NPCG_INCLUDED && match && match.length > 1) {
        // Fix browsers whose `exec` methods don't consistently return `undefined`
        // for NPCG, like IE8. NOTE: This doesn't work for /(.?)?/
        call$4(nativeReplace, match[0], reCopy, function () {
          for (i = 1; i < arguments.length - 2; i++) {
            if (arguments[i] === undefined) match[i] = undefined;
          }
        });
      }

      if (match && groups) {
        match.groups = object = create(null);
        for (i = 0; i < groups.length; i++) {
          group = groups[i];
          object[group[0]] = match[group[1]];
        }
      }

      return match;
    };
  }

  var regexpExec$2 = patchedExec;

  var $ = _export;
  var exec = regexpExec$2;

  // `RegExp.prototype.exec` method
  // https://tc39.es/ecma262/#sec-regexp.prototype.exec
  $({ target: 'RegExp', proto: true, forced: /./.exec !== exec }, {
    exec: exec
  });

  // TODO: Remove from `core-js@4` since it's moved to entry points

  var uncurryThis$3 = functionUncurryThisClause;
  var defineBuiltIn = defineBuiltIn$7;
  var regexpExec$1 = regexpExec$2;
  var fails$1 = fails$o;
  var wellKnownSymbol$1 = wellKnownSymbol$f;
  var createNonEnumerableProperty = createNonEnumerableProperty$6;

  var SPECIES = wellKnownSymbol$1('species');
  var RegExpPrototype = RegExp.prototype;

  var fixRegexpWellKnownSymbolLogic = function (KEY, exec, FORCED, SHAM) {
    var SYMBOL = wellKnownSymbol$1(KEY);

    var DELEGATES_TO_SYMBOL = !fails$1(function () {
      // String methods call symbol-named RegEp methods
      var O = {};
      O[SYMBOL] = function () { return 7; };
      return ''[KEY](O) != 7;
    });

    var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL && !fails$1(function () {
      // Symbol-named RegExp methods call .exec
      var execCalled = false;
      var re = /a/;

      if (KEY === 'split') {
        // We can't use real regex here since it causes deoptimization
        // and serious performance degradation in V8
        // https://github.com/zloirock/core-js/issues/306
        re = {};
        // RegExp[@@split] doesn't call the regex's exec method, but first creates
        // a new one. We need to return the patched regex when creating the new one.
        re.constructor = {};
        re.constructor[SPECIES] = function () { return re; };
        re.flags = '';
        re[SYMBOL] = /./[SYMBOL];
      }

      re.exec = function () { execCalled = true; return null; };

      re[SYMBOL]('');
      return !execCalled;
    });

    if (
      !DELEGATES_TO_SYMBOL ||
      !DELEGATES_TO_EXEC ||
      FORCED
    ) {
      var uncurriedNativeRegExpMethod = uncurryThis$3(/./[SYMBOL]);
      var methods = exec(SYMBOL, ''[KEY], function (nativeMethod, regexp, str, arg2, forceStringMethod) {
        var uncurriedNativeMethod = uncurryThis$3(nativeMethod);
        var $exec = regexp.exec;
        if ($exec === regexpExec$1 || $exec === RegExpPrototype.exec) {
          if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
            // The native String method already delegates to @@method (this
            // polyfilled function), leasing to infinite recursion.
            // We avoid it by directly calling the native @@method method.
            return { done: true, value: uncurriedNativeRegExpMethod(regexp, str, arg2) };
          }
          return { done: true, value: uncurriedNativeMethod(str, regexp, arg2) };
        }
        return { done: false };
      });

      defineBuiltIn(String.prototype, KEY, methods[0]);
      defineBuiltIn(RegExpPrototype, SYMBOL, methods[1]);
    }

    if (SHAM) createNonEnumerableProperty(RegExpPrototype[SYMBOL], 'sham', true);
  };

  var charAt$1 = stringMultibyte.charAt;

  // `AdvanceStringIndex` abstract operation
  // https://tc39.es/ecma262/#sec-advancestringindex
  var advanceStringIndex$2 = function (S, index, unicode) {
    return index + (unicode ? charAt$1(S, index).length : 1);
  };

  var call$3 = functionCall;
  var anObject$2 = anObject$d;
  var isCallable$1 = isCallable$k;
  var classof = classofRaw$2;
  var regexpExec = regexpExec$2;

  var $TypeError = TypeError;

  // `RegExpExec` abstract operation
  // https://tc39.es/ecma262/#sec-regexpexec
  var regexpExecAbstract = function (R, S) {
    var exec = R.exec;
    if (isCallable$1(exec)) {
      var result = call$3(exec, R, S);
      if (result !== null) anObject$2(result);
      return result;
    }
    if (classof(R) === 'RegExp') return call$3(regexpExec, R, S);
    throw $TypeError('RegExp#exec called on incompatible receiver');
  };

  var call$2 = functionCall;
  var fixRegExpWellKnownSymbolLogic$1 = fixRegexpWellKnownSymbolLogic;
  var anObject$1 = anObject$d;
  var isNullOrUndefined$1 = isNullOrUndefined$7;
  var toLength$1 = toLength$3;
  var toString$1 = toString$7;
  var requireObjectCoercible$1 = requireObjectCoercible$6;
  var getMethod$1 = getMethod$5;
  var advanceStringIndex$1 = advanceStringIndex$2;
  var regExpExec$2 = regexpExecAbstract;

  // @@match logic
  fixRegExpWellKnownSymbolLogic$1('match', function (MATCH, nativeMatch, maybeCallNative) {
    return [
      // `String.prototype.match` method
      // https://tc39.es/ecma262/#sec-string.prototype.match
      function match(regexp) {
        var O = requireObjectCoercible$1(this);
        var matcher = isNullOrUndefined$1(regexp) ? undefined : getMethod$1(regexp, MATCH);
        return matcher ? call$2(matcher, regexp, O) : new RegExp(regexp)[MATCH](toString$1(O));
      },
      // `RegExp.prototype[@@match]` method
      // https://tc39.es/ecma262/#sec-regexp.prototype-@@match
      function (string) {
        var rx = anObject$1(this);
        var S = toString$1(string);
        var res = maybeCallNative(nativeMatch, rx, S);

        if (res.done) return res.value;

        if (!rx.global) return regExpExec$2(rx, S);

        var fullUnicode = rx.unicode;
        rx.lastIndex = 0;
        var A = [];
        var n = 0;
        var result;
        while ((result = regExpExec$2(rx, S)) !== null) {
          var matchStr = toString$1(result[0]);
          A[n] = matchStr;
          if (matchStr === '') rx.lastIndex = advanceStringIndex$1(S, toLength$1(rx.lastIndex), fullUnicode);
          n++;
        }
        return n === 0 ? null : A;
      }
    ];
  });

  var DESCRIPTORS = descriptors;
  var FUNCTION_NAME_EXISTS = functionName.EXISTS;
  var uncurryThis$2 = functionUncurryThis;
  var defineProperty = objectDefineProperty.f;

  var FunctionPrototype$1 = Function.prototype;
  var functionToString = uncurryThis$2(FunctionPrototype$1.toString);
  var nameRE = /function\b(?:\s|\/\*[\S\s]*?\*\/|\/\/[^\n\r]*[\n\r]+)*([^\s(/]*)/;
  var regExpExec$1 = uncurryThis$2(nameRE.exec);
  var NAME = 'name';

  // Function instances `.name` property
  // https://tc39.es/ecma262/#sec-function-instances-name
  if (DESCRIPTORS && !FUNCTION_NAME_EXISTS) {
    defineProperty(FunctionPrototype$1, NAME, {
      configurable: true,
      get: function () {
        try {
          return regExpExec$1(nameRE, functionToString(this))[1];
        } catch (error) {
          return '';
        }
      }
    });
  }

  var NATIVE_BIND = functionBindNative;

  var FunctionPrototype = Function.prototype;
  var apply$1 = FunctionPrototype.apply;
  var call$1 = FunctionPrototype.call;

  // eslint-disable-next-line es/no-reflect -- safe
  var functionApply = typeof Reflect == 'object' && Reflect.apply || (NATIVE_BIND ? call$1.bind(apply$1) : function () {
    return call$1.apply(apply$1, arguments);
  });

  var uncurryThis$1 = functionUncurryThis;
  var toObject = toObject$6;

  var floor = Math.floor;
  var charAt = uncurryThis$1(''.charAt);
  var replace = uncurryThis$1(''.replace);
  var stringSlice$1 = uncurryThis$1(''.slice);
  var SUBSTITUTION_SYMBOLS = /\$([$&'`]|\d{1,2}|<[^>]*>)/g;
  var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&'`]|\d{1,2})/g;

  // `GetSubstitution` abstract operation
  // https://tc39.es/ecma262/#sec-getsubstitution
  var getSubstitution$1 = function (matched, str, position, captures, namedCaptures, replacement) {
    var tailPos = position + matched.length;
    var m = captures.length;
    var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;
    if (namedCaptures !== undefined) {
      namedCaptures = toObject(namedCaptures);
      symbols = SUBSTITUTION_SYMBOLS;
    }
    return replace(replacement, symbols, function (match, ch) {
      var capture;
      switch (charAt(ch, 0)) {
        case '$': return '$';
        case '&': return matched;
        case '`': return stringSlice$1(str, 0, position);
        case "'": return stringSlice$1(str, tailPos);
        case '<':
          capture = namedCaptures[stringSlice$1(ch, 1, -1)];
          break;
        default: // \d\d?
          var n = +ch;
          if (n === 0) return match;
          if (n > m) {
            var f = floor(n / 10);
            if (f === 0) return match;
            if (f <= m) return captures[f - 1] === undefined ? charAt(ch, 1) : captures[f - 1] + charAt(ch, 1);
            return match;
          }
          capture = captures[n - 1];
      }
      return capture === undefined ? '' : capture;
    });
  };

  var apply = functionApply;
  var call = functionCall;
  var uncurryThis = functionUncurryThis;
  var fixRegExpWellKnownSymbolLogic = fixRegexpWellKnownSymbolLogic;
  var fails = fails$o;
  var anObject = anObject$d;
  var isCallable = isCallable$k;
  var isNullOrUndefined = isNullOrUndefined$7;
  var toIntegerOrInfinity = toIntegerOrInfinity$4;
  var toLength = toLength$3;
  var toString = toString$7;
  var requireObjectCoercible = requireObjectCoercible$6;
  var advanceStringIndex = advanceStringIndex$2;
  var getMethod = getMethod$5;
  var getSubstitution = getSubstitution$1;
  var regExpExec = regexpExecAbstract;
  var wellKnownSymbol = wellKnownSymbol$f;

  var REPLACE = wellKnownSymbol('replace');
  var max = Math.max;
  var min = Math.min;
  var concat$1 = uncurryThis([].concat);
  var push = uncurryThis([].push);
  var stringIndexOf = uncurryThis(''.indexOf);
  var stringSlice = uncurryThis(''.slice);

  var maybeToString = function (it) {
    return it === undefined ? it : String(it);
  };

  // IE <= 11 replaces $0 with the whole match, as if it was $&
  // https://stackoverflow.com/questions/6024666/getting-ie-to-replace-a-regex-with-the-literal-string-0
  var REPLACE_KEEPS_$0 = (function () {
    // eslint-disable-next-line regexp/prefer-escape-replacement-dollar-char -- required for testing
    return 'a'.replace(/./, '$0') === '$0';
  })();

  // Safari <= 13.0.3(?) substitutes nth capture where n>m with an empty string
  var REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE = (function () {
    if (/./[REPLACE]) {
      return /./[REPLACE]('a', '$0') === '';
    }
    return false;
  })();

  var REPLACE_SUPPORTS_NAMED_GROUPS = !fails(function () {
    var re = /./;
    re.exec = function () {
      var result = [];
      result.groups = { a: '7' };
      return result;
    };
    // eslint-disable-next-line regexp/no-useless-dollar-replacements -- false positive
    return ''.replace(re, '$<a>') !== '7';
  });

  // @@replace logic
  fixRegExpWellKnownSymbolLogic('replace', function (_, nativeReplace, maybeCallNative) {
    var UNSAFE_SUBSTITUTE = REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE ? '$' : '$0';

    return [
      // `String.prototype.replace` method
      // https://tc39.es/ecma262/#sec-string.prototype.replace
      function replace(searchValue, replaceValue) {
        var O = requireObjectCoercible(this);
        var replacer = isNullOrUndefined(searchValue) ? undefined : getMethod(searchValue, REPLACE);
        return replacer
          ? call(replacer, searchValue, O, replaceValue)
          : call(nativeReplace, toString(O), searchValue, replaceValue);
      },
      // `RegExp.prototype[@@replace]` method
      // https://tc39.es/ecma262/#sec-regexp.prototype-@@replace
      function (string, replaceValue) {
        var rx = anObject(this);
        var S = toString(string);

        if (
          typeof replaceValue == 'string' &&
          stringIndexOf(replaceValue, UNSAFE_SUBSTITUTE) === -1 &&
          stringIndexOf(replaceValue, '$<') === -1
        ) {
          var res = maybeCallNative(nativeReplace, rx, S, replaceValue);
          if (res.done) return res.value;
        }

        var functionalReplace = isCallable(replaceValue);
        if (!functionalReplace) replaceValue = toString(replaceValue);

        var global = rx.global;
        if (global) {
          var fullUnicode = rx.unicode;
          rx.lastIndex = 0;
        }
        var results = [];
        while (true) {
          var result = regExpExec(rx, S);
          if (result === null) break;

          push(results, result);
          if (!global) break;

          var matchStr = toString(result[0]);
          if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
        }

        var accumulatedResult = '';
        var nextSourcePosition = 0;
        for (var i = 0; i < results.length; i++) {
          result = results[i];

          var matched = toString(result[0]);
          var position = max(min(toIntegerOrInfinity(result.index), S.length), 0);
          var captures = [];
          // NOTE: This is equivalent to
          //   captures = result.slice(1).map(maybeToString)
          // but for some reason `nativeSlice.call(result, 1, result.length)` (called in
          // the slice polyfill when slicing native arrays) "doesn't work" in safari 9 and
          // causes a crash (https://pastebin.com/N21QzeQA) when trying to debug it.
          for (var j = 1; j < result.length; j++) push(captures, maybeToString(result[j]));
          var namedCaptures = result.groups;
          if (functionalReplace) {
            var replacerArgs = concat$1([matched], captures, position, S);
            if (namedCaptures !== undefined) push(replacerArgs, namedCaptures);
            var replacement = toString(apply(replaceValue, undefined, replacerArgs));
          } else {
            replacement = getSubstitution(matched, S, position, captures, namedCaptures, replaceValue);
          }
          if (position >= nextSourcePosition) {
            accumulatedResult += stringSlice(S, nextSourcePosition, position) + replacement;
            nextSourcePosition = position + matched.length;
          }
        }
        return accumulatedResult + stringSlice(S, nextSourcePosition);
      }
    ];
  }, !REPLACE_SUPPORTS_NAMED_GROUPS || !REPLACE_KEEPS_$0 || REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE);

  /**
   * SimpleBar.js - v5.3.9
   * Scrollbars, simpler.
   * https://grsmto.github.io/simplebar/
   *
   * Made by Adrien Denat from a fork by Jonathan Nicol
   * Under MIT License
   */

  // Helper function to retrieve options from element attributes
  var getOptions = function getOptions(obj) {
    var options = Array.prototype.reduce.call(obj, function (acc, attribute) {
      var option = attribute.name.match(/data-simplebar-(.+)/);

      if (option) {
        var key = option[1].replace(/\W+(.)/g, function (x, chr) {
          return chr.toUpperCase();
        });

        switch (attribute.value) {
          case 'true':
            acc[key] = true;
            break;

          case 'false':
            acc[key] = false;
            break;

          case undefined:
            acc[key] = true;
            break;

          default:
            acc[key] = attribute.value;
        }
      }

      return acc;
    }, {});
    return options;
  };
  function getElementWindow(element) {
    if (!element || !element.ownerDocument || !element.ownerDocument.defaultView) {
      return window;
    }

    return element.ownerDocument.defaultView;
  }
  function getElementDocument(element) {
    if (!element || !element.ownerDocument) {
      return document;
    }

    return element.ownerDocument;
  }

  var cachedScrollbarWidth = null;
  var cachedDevicePixelRatio = null;

  if (canUseDom) {
    window.addEventListener('resize', function () {
      if (cachedDevicePixelRatio !== window.devicePixelRatio) {
        cachedDevicePixelRatio = window.devicePixelRatio;
        cachedScrollbarWidth = null;
      }
    });
  }

  function scrollbarWidth(el) {
    if (cachedScrollbarWidth === null) {
      var document = getElementDocument(el);

      if (typeof document === 'undefined') {
        cachedScrollbarWidth = 0;
        return cachedScrollbarWidth;
      }

      var body = document.body;
      var box = document.createElement('div');
      box.classList.add('simplebar-hide-scrollbar');
      body.appendChild(box);
      var width = box.getBoundingClientRect().right;
      body.removeChild(box);
      cachedScrollbarWidth = width;
    }

    return cachedScrollbarWidth;
  }

  var SimpleBar = /*#__PURE__*/function () {
    function SimpleBar(element, options) {
      var _this = this;

      this.onScroll = function () {
        var elWindow = getElementWindow(_this.el);

        if (!_this.scrollXTicking) {
          elWindow.requestAnimationFrame(_this.scrollX);
          _this.scrollXTicking = true;
        }

        if (!_this.scrollYTicking) {
          elWindow.requestAnimationFrame(_this.scrollY);
          _this.scrollYTicking = true;
        }
      };

      this.scrollX = function () {
        if (_this.axis.x.isOverflowing) {
          _this.showScrollbar('x');

          _this.positionScrollbar('x');
        }

        _this.scrollXTicking = false;
      };

      this.scrollY = function () {
        if (_this.axis.y.isOverflowing) {
          _this.showScrollbar('y');

          _this.positionScrollbar('y');
        }

        _this.scrollYTicking = false;
      };

      this.onMouseEnter = function () {
        _this.showScrollbar('x');

        _this.showScrollbar('y');
      };

      this.onMouseMove = function (e) {
        _this.mouseX = e.clientX;
        _this.mouseY = e.clientY;

        if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
          _this.onMouseMoveForAxis('x');
        }

        if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
          _this.onMouseMoveForAxis('y');
        }
      };

      this.onMouseLeave = function () {
        _this.onMouseMove.cancel();

        if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
          _this.onMouseLeaveForAxis('x');
        }

        if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
          _this.onMouseLeaveForAxis('y');
        }

        _this.mouseX = -1;
        _this.mouseY = -1;
      };

      this.onWindowResize = function () {
        // Recalculate scrollbarWidth in case it's a zoom
        _this.scrollbarWidth = _this.getScrollbarWidth();

        _this.hideNativeScrollbar();
      };

      this.hideScrollbars = function () {
        _this.axis.x.track.rect = _this.axis.x.track.el.getBoundingClientRect();
        _this.axis.y.track.rect = _this.axis.y.track.el.getBoundingClientRect();

        if (!_this.isWithinBounds(_this.axis.y.track.rect)) {
          _this.axis.y.scrollbar.el.classList.remove(_this.classNames.visible);

          _this.axis.y.isVisible = false;
        }

        if (!_this.isWithinBounds(_this.axis.x.track.rect)) {
          _this.axis.x.scrollbar.el.classList.remove(_this.classNames.visible);

          _this.axis.x.isVisible = false;
        }
      };

      this.onPointerEvent = function (e) {
        var isWithinTrackXBounds, isWithinTrackYBounds;
        _this.axis.x.track.rect = _this.axis.x.track.el.getBoundingClientRect();
        _this.axis.y.track.rect = _this.axis.y.track.el.getBoundingClientRect();

        if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
          isWithinTrackXBounds = _this.isWithinBounds(_this.axis.x.track.rect);
        }

        if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
          isWithinTrackYBounds = _this.isWithinBounds(_this.axis.y.track.rect);
        } // If any pointer event is called on the scrollbar


        if (isWithinTrackXBounds || isWithinTrackYBounds) {
          // Preventing the event's default action stops text being
          // selectable during the drag.
          e.preventDefault(); // Prevent event leaking

          e.stopPropagation();

          if (e.type === 'mousedown') {
            if (isWithinTrackXBounds) {
              _this.axis.x.scrollbar.rect = _this.axis.x.scrollbar.el.getBoundingClientRect();

              if (_this.isWithinBounds(_this.axis.x.scrollbar.rect)) {
                _this.onDragStart(e, 'x');
              } else {
                _this.onTrackClick(e, 'x');
              }
            }

            if (isWithinTrackYBounds) {
              _this.axis.y.scrollbar.rect = _this.axis.y.scrollbar.el.getBoundingClientRect();

              if (_this.isWithinBounds(_this.axis.y.scrollbar.rect)) {
                _this.onDragStart(e, 'y');
              } else {
                _this.onTrackClick(e, 'y');
              }
            }
          }
        }
      };

      this.drag = function (e) {
        var eventOffset;
        var track = _this.axis[_this.draggedAxis].track;
        var trackSize = track.rect[_this.axis[_this.draggedAxis].sizeAttr];
        var scrollbar = _this.axis[_this.draggedAxis].scrollbar;
        var contentSize = _this.contentWrapperEl[_this.axis[_this.draggedAxis].scrollSizeAttr];
        var hostSize = parseInt(_this.elStyles[_this.axis[_this.draggedAxis].sizeAttr], 10);
        e.preventDefault();
        e.stopPropagation();

        if (_this.draggedAxis === 'y') {
          eventOffset = e.pageY;
        } else {
          eventOffset = e.pageX;
        } // Calculate how far the user's mouse is from the top/left of the scrollbar (minus the dragOffset).


        var dragPos = eventOffset - track.rect[_this.axis[_this.draggedAxis].offsetAttr] - _this.axis[_this.draggedAxis].dragOffset; // Convert the mouse position into a percentage of the scrollbar height/width.

        var dragPerc = dragPos / (trackSize - scrollbar.size); // Scroll the content by the same percentage.

        var scrollPos = dragPerc * (contentSize - hostSize); // Fix browsers inconsistency on RTL

        if (_this.draggedAxis === 'x') {
          scrollPos = _this.isRtl && SimpleBar.getRtlHelpers().isRtlScrollbarInverted ? scrollPos - (trackSize + scrollbar.size) : scrollPos;
          scrollPos = _this.isRtl && SimpleBar.getRtlHelpers().isRtlScrollingInverted ? -scrollPos : scrollPos;
        }

        _this.contentWrapperEl[_this.axis[_this.draggedAxis].scrollOffsetAttr] = scrollPos;
      };

      this.onEndDrag = function (e) {
        var elDocument = getElementDocument(_this.el);
        var elWindow = getElementWindow(_this.el);
        e.preventDefault();
        e.stopPropagation();

        _this.el.classList.remove(_this.classNames.dragging);

        elDocument.removeEventListener('mousemove', _this.drag, true);
        elDocument.removeEventListener('mouseup', _this.onEndDrag, true);
        _this.removePreventClickId = elWindow.setTimeout(function () {
          // Remove these asynchronously so we still suppress click events
          // generated simultaneously with mouseup.
          elDocument.removeEventListener('click', _this.preventClick, true);
          elDocument.removeEventListener('dblclick', _this.preventClick, true);
          _this.removePreventClickId = null;
        });
      };

      this.preventClick = function (e) {
        e.preventDefault();
        e.stopPropagation();
      };

      this.el = element;
      this.minScrollbarWidth = 20;
      this.options = Object.assign({}, SimpleBar.defaultOptions, options);
      this.classNames = Object.assign({}, SimpleBar.defaultOptions.classNames, this.options.classNames);
      this.axis = {
        x: {
          scrollOffsetAttr: 'scrollLeft',
          sizeAttr: 'width',
          scrollSizeAttr: 'scrollWidth',
          offsetSizeAttr: 'offsetWidth',
          offsetAttr: 'left',
          overflowAttr: 'overflowX',
          dragOffset: 0,
          isOverflowing: true,
          isVisible: false,
          forceVisible: false,
          track: {},
          scrollbar: {}
        },
        y: {
          scrollOffsetAttr: 'scrollTop',
          sizeAttr: 'height',
          scrollSizeAttr: 'scrollHeight',
          offsetSizeAttr: 'offsetHeight',
          offsetAttr: 'top',
          overflowAttr: 'overflowY',
          dragOffset: 0,
          isOverflowing: true,
          isVisible: false,
          forceVisible: false,
          track: {},
          scrollbar: {}
        }
      };
      this.removePreventClickId = null; // Don't re-instantiate over an existing one

      if (SimpleBar.instances.has(this.el)) {
        return;
      }

      this.recalculate = lodash_throttle(this.recalculate.bind(this), 64);
      this.onMouseMove = lodash_throttle(this.onMouseMove.bind(this), 64);
      this.hideScrollbars = lodash_debounce(this.hideScrollbars.bind(this), this.options.timeout);
      this.onWindowResize = lodash_debounce(this.onWindowResize.bind(this), 64, {
        leading: true
      });
      SimpleBar.getRtlHelpers = lodash_memoize(SimpleBar.getRtlHelpers);
      this.init();
    }
    /**
     * Static properties
     */

    /**
     * Helper to fix browsers inconsistency on RTL:
     *  - Firefox inverts the scrollbar initial position
     *  - IE11 inverts both scrollbar position and scrolling offset
     * Directly inspired by @KingSora's OverlayScrollbars https://github.com/KingSora/OverlayScrollbars/blob/master/js/OverlayScrollbars.js#L1634
     */


    SimpleBar.getRtlHelpers = function getRtlHelpers() {
      var dummyDiv = document.createElement('div');
      dummyDiv.innerHTML = '<div class="hs-dummy-scrollbar-size"><div style="height: 200%; width: 200%; margin: 10px 0;"></div></div>';
      var scrollbarDummyEl = dummyDiv.firstElementChild;
      document.body.appendChild(scrollbarDummyEl);
      var dummyContainerChild = scrollbarDummyEl.firstElementChild;
      scrollbarDummyEl.scrollLeft = 0;
      var dummyContainerOffset = SimpleBar.getOffset(scrollbarDummyEl);
      var dummyContainerChildOffset = SimpleBar.getOffset(dummyContainerChild);
      scrollbarDummyEl.scrollLeft = 999;
      var dummyContainerScrollOffsetAfterScroll = SimpleBar.getOffset(dummyContainerChild);
      return {
        // determines if the scrolling is responding with negative values
        isRtlScrollingInverted: dummyContainerOffset.left !== dummyContainerChildOffset.left && dummyContainerChildOffset.left - dummyContainerScrollOffsetAfterScroll.left !== 0,
        // determines if the origin scrollbar position is inverted or not (positioned on left or right)
        isRtlScrollbarInverted: dummyContainerOffset.left !== dummyContainerChildOffset.left
      };
    };

    SimpleBar.getOffset = function getOffset(el) {
      var rect = el.getBoundingClientRect();
      var elDocument = getElementDocument(el);
      var elWindow = getElementWindow(el);
      return {
        top: rect.top + (elWindow.pageYOffset || elDocument.documentElement.scrollTop),
        left: rect.left + (elWindow.pageXOffset || elDocument.documentElement.scrollLeft)
      };
    };

    var _proto = SimpleBar.prototype;

    _proto.init = function init() {
      // Save a reference to the instance, so we know this DOM node has already been instancied
      SimpleBar.instances.set(this.el, this); // We stop here on server-side

      if (canUseDom) {
        this.initDOM();
        this.setAccessibilityAttributes();
        this.scrollbarWidth = this.getScrollbarWidth();
        this.recalculate();
        this.initListeners();
      }
    };

    _proto.initDOM = function initDOM() {
      var _this2 = this;

      // make sure this element doesn't have the elements yet
      if (Array.prototype.filter.call(this.el.children, function (child) {
        return child.classList.contains(_this2.classNames.wrapper);
      }).length) {
        // assume that element has his DOM already initiated
        this.wrapperEl = this.el.querySelector("." + this.classNames.wrapper);
        this.contentWrapperEl = this.options.scrollableNode || this.el.querySelector("." + this.classNames.contentWrapper);
        this.contentEl = this.options.contentNode || this.el.querySelector("." + this.classNames.contentEl);
        this.offsetEl = this.el.querySelector("." + this.classNames.offset);
        this.maskEl = this.el.querySelector("." + this.classNames.mask);
        this.placeholderEl = this.findChild(this.wrapperEl, "." + this.classNames.placeholder);
        this.heightAutoObserverWrapperEl = this.el.querySelector("." + this.classNames.heightAutoObserverWrapperEl);
        this.heightAutoObserverEl = this.el.querySelector("." + this.classNames.heightAutoObserverEl);
        this.axis.x.track.el = this.findChild(this.el, "." + this.classNames.track + "." + this.classNames.horizontal);
        this.axis.y.track.el = this.findChild(this.el, "." + this.classNames.track + "." + this.classNames.vertical);
      } else {
        // Prepare DOM
        this.wrapperEl = document.createElement('div');
        this.contentWrapperEl = document.createElement('div');
        this.offsetEl = document.createElement('div');
        this.maskEl = document.createElement('div');
        this.contentEl = document.createElement('div');
        this.placeholderEl = document.createElement('div');
        this.heightAutoObserverWrapperEl = document.createElement('div');
        this.heightAutoObserverEl = document.createElement('div');
        this.wrapperEl.classList.add(this.classNames.wrapper);
        this.contentWrapperEl.classList.add(this.classNames.contentWrapper);
        this.offsetEl.classList.add(this.classNames.offset);
        this.maskEl.classList.add(this.classNames.mask);
        this.contentEl.classList.add(this.classNames.contentEl);
        this.placeholderEl.classList.add(this.classNames.placeholder);
        this.heightAutoObserverWrapperEl.classList.add(this.classNames.heightAutoObserverWrapperEl);
        this.heightAutoObserverEl.classList.add(this.classNames.heightAutoObserverEl);

        while (this.el.firstChild) {
          this.contentEl.appendChild(this.el.firstChild);
        }

        this.contentWrapperEl.appendChild(this.contentEl);
        this.offsetEl.appendChild(this.contentWrapperEl);
        this.maskEl.appendChild(this.offsetEl);
        this.heightAutoObserverWrapperEl.appendChild(this.heightAutoObserverEl);
        this.wrapperEl.appendChild(this.heightAutoObserverWrapperEl);
        this.wrapperEl.appendChild(this.maskEl);
        this.wrapperEl.appendChild(this.placeholderEl);
        this.el.appendChild(this.wrapperEl);
      }

      if (!this.axis.x.track.el || !this.axis.y.track.el) {
        var track = document.createElement('div');
        var scrollbar = document.createElement('div');
        track.classList.add(this.classNames.track);
        scrollbar.classList.add(this.classNames.scrollbar);
        track.appendChild(scrollbar);
        this.axis.x.track.el = track.cloneNode(true);
        this.axis.x.track.el.classList.add(this.classNames.horizontal);
        this.axis.y.track.el = track.cloneNode(true);
        this.axis.y.track.el.classList.add(this.classNames.vertical);
        this.el.appendChild(this.axis.x.track.el);
        this.el.appendChild(this.axis.y.track.el);
      }

      this.axis.x.scrollbar.el = this.axis.x.track.el.querySelector("." + this.classNames.scrollbar);
      this.axis.y.scrollbar.el = this.axis.y.track.el.querySelector("." + this.classNames.scrollbar);

      if (!this.options.autoHide) {
        this.axis.x.scrollbar.el.classList.add(this.classNames.visible);
        this.axis.y.scrollbar.el.classList.add(this.classNames.visible);
      }

      this.el.setAttribute('data-simplebar', 'init');
    };

    _proto.setAccessibilityAttributes = function setAccessibilityAttributes() {
      var ariaLabel = this.options.ariaLabel || 'scrollable content';
      this.contentWrapperEl.setAttribute('tabindex', '0');
      this.contentWrapperEl.setAttribute('role', 'region');
      this.contentWrapperEl.setAttribute('aria-label', ariaLabel);
    };

    _proto.initListeners = function initListeners() {
      var _this3 = this;

      var elWindow = getElementWindow(this.el); // Event listeners

      if (this.options.autoHide) {
        this.el.addEventListener('mouseenter', this.onMouseEnter);
      }

      ['mousedown', 'click', 'dblclick'].forEach(function (e) {
        _this3.el.addEventListener(e, _this3.onPointerEvent, true);
      });
      ['touchstart', 'touchend', 'touchmove'].forEach(function (e) {
        _this3.el.addEventListener(e, _this3.onPointerEvent, {
          capture: true,
          passive: true
        });
      });
      this.el.addEventListener('mousemove', this.onMouseMove);
      this.el.addEventListener('mouseleave', this.onMouseLeave);
      this.contentWrapperEl.addEventListener('scroll', this.onScroll); // Browser zoom triggers a window resize

      elWindow.addEventListener('resize', this.onWindowResize); // Hack for https://github.com/WICG/ResizeObserver/issues/38

      var resizeObserverStarted = false;
      var resizeAnimationFrameId = null;
      var resizeObserver = elWindow.ResizeObserver || ResizeObserver;
      this.resizeObserver = new resizeObserver(function () {
        if (!resizeObserverStarted || resizeAnimationFrameId !== null) return;
        resizeAnimationFrameId = elWindow.requestAnimationFrame(function () {
          _this3.recalculate();

          resizeAnimationFrameId = null;
        });
      });
      this.resizeObserver.observe(this.el);
      this.resizeObserver.observe(this.contentEl);
      elWindow.requestAnimationFrame(function () {
        resizeObserverStarted = true;
      }); // This is required to detect horizontal scroll. Vertical scroll only needs the resizeObserver.

      this.mutationObserver = new elWindow.MutationObserver(this.recalculate);
      this.mutationObserver.observe(this.contentEl, {
        childList: true,
        subtree: true,
        characterData: true
      });
    };

    _proto.recalculate = function recalculate() {
      var elWindow = getElementWindow(this.el);
      this.elStyles = elWindow.getComputedStyle(this.el);
      this.isRtl = this.elStyles.direction === 'rtl';
      var isHeightAuto = this.heightAutoObserverEl.offsetHeight <= 1;
      var isWidthAuto = this.heightAutoObserverEl.offsetWidth <= 1;
      var contentElOffsetWidth = this.contentEl.offsetWidth;
      var contentWrapperElOffsetWidth = this.contentWrapperEl.offsetWidth;
      var elOverflowX = this.elStyles.overflowX;
      var elOverflowY = this.elStyles.overflowY;
      this.contentEl.style.padding = this.elStyles.paddingTop + " " + this.elStyles.paddingRight + " " + this.elStyles.paddingBottom + " " + this.elStyles.paddingLeft;
      this.wrapperEl.style.margin = "-" + this.elStyles.paddingTop + " -" + this.elStyles.paddingRight + " -" + this.elStyles.paddingBottom + " -" + this.elStyles.paddingLeft;
      var contentElScrollHeight = this.contentEl.scrollHeight;
      var contentElScrollWidth = this.contentEl.scrollWidth;
      this.contentWrapperEl.style.height = isHeightAuto ? 'auto' : '100%'; // Determine placeholder size

      this.placeholderEl.style.width = isWidthAuto ? contentElOffsetWidth + "px" : 'auto';
      this.placeholderEl.style.height = contentElScrollHeight + "px";
      var contentWrapperElOffsetHeight = this.contentWrapperEl.offsetHeight;
      this.axis.x.isOverflowing = contentElScrollWidth > contentElOffsetWidth;
      this.axis.y.isOverflowing = contentElScrollHeight > contentWrapperElOffsetHeight; // Set isOverflowing to false if user explicitely set hidden overflow

      this.axis.x.isOverflowing = elOverflowX === 'hidden' ? false : this.axis.x.isOverflowing;
      this.axis.y.isOverflowing = elOverflowY === 'hidden' ? false : this.axis.y.isOverflowing;
      this.axis.x.forceVisible = this.options.forceVisible === 'x' || this.options.forceVisible === true;
      this.axis.y.forceVisible = this.options.forceVisible === 'y' || this.options.forceVisible === true;
      this.hideNativeScrollbar(); // Set isOverflowing to false if scrollbar is not necessary (content is shorter than offset)

      var offsetForXScrollbar = this.axis.x.isOverflowing ? this.scrollbarWidth : 0;
      var offsetForYScrollbar = this.axis.y.isOverflowing ? this.scrollbarWidth : 0;
      this.axis.x.isOverflowing = this.axis.x.isOverflowing && contentElScrollWidth > contentWrapperElOffsetWidth - offsetForYScrollbar;
      this.axis.y.isOverflowing = this.axis.y.isOverflowing && contentElScrollHeight > contentWrapperElOffsetHeight - offsetForXScrollbar;
      this.axis.x.scrollbar.size = this.getScrollbarSize('x');
      this.axis.y.scrollbar.size = this.getScrollbarSize('y');
      this.axis.x.scrollbar.el.style.width = this.axis.x.scrollbar.size + "px";
      this.axis.y.scrollbar.el.style.height = this.axis.y.scrollbar.size + "px";
      this.positionScrollbar('x');
      this.positionScrollbar('y');
      this.toggleTrackVisibility('x');
      this.toggleTrackVisibility('y');
    }
    /**
     * Calculate scrollbar size
     */
    ;

    _proto.getScrollbarSize = function getScrollbarSize(axis) {
      if (axis === void 0) {
        axis = 'y';
      }

      if (!this.axis[axis].isOverflowing) {
        return 0;
      }

      var contentSize = this.contentEl[this.axis[axis].scrollSizeAttr];
      var trackSize = this.axis[axis].track.el[this.axis[axis].offsetSizeAttr];
      var scrollbarSize;
      var scrollbarRatio = trackSize / contentSize; // Calculate new height/position of drag handle.

      scrollbarSize = Math.max(~~(scrollbarRatio * trackSize), this.options.scrollbarMinSize);

      if (this.options.scrollbarMaxSize) {
        scrollbarSize = Math.min(scrollbarSize, this.options.scrollbarMaxSize);
      }

      return scrollbarSize;
    };

    _proto.positionScrollbar = function positionScrollbar(axis) {
      if (axis === void 0) {
        axis = 'y';
      }

      if (!this.axis[axis].isOverflowing) {
        return;
      }

      var contentSize = this.contentWrapperEl[this.axis[axis].scrollSizeAttr];
      var trackSize = this.axis[axis].track.el[this.axis[axis].offsetSizeAttr];
      var hostSize = parseInt(this.elStyles[this.axis[axis].sizeAttr], 10);
      var scrollbar = this.axis[axis].scrollbar;
      var scrollOffset = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
      scrollOffset = axis === 'x' && this.isRtl && SimpleBar.getRtlHelpers().isRtlScrollingInverted ? -scrollOffset : scrollOffset;
      var scrollPourcent = scrollOffset / (contentSize - hostSize);
      var handleOffset = ~~((trackSize - scrollbar.size) * scrollPourcent);
      handleOffset = axis === 'x' && this.isRtl && SimpleBar.getRtlHelpers().isRtlScrollbarInverted ? handleOffset + (trackSize - scrollbar.size) : handleOffset;
      scrollbar.el.style.transform = axis === 'x' ? "translate3d(" + handleOffset + "px, 0, 0)" : "translate3d(0, " + handleOffset + "px, 0)";
    };

    _proto.toggleTrackVisibility = function toggleTrackVisibility(axis) {
      if (axis === void 0) {
        axis = 'y';
      }

      var track = this.axis[axis].track.el;
      var scrollbar = this.axis[axis].scrollbar.el;

      if (this.axis[axis].isOverflowing || this.axis[axis].forceVisible) {
        track.style.visibility = 'visible';
        this.contentWrapperEl.style[this.axis[axis].overflowAttr] = 'scroll';
      } else {
        track.style.visibility = 'hidden';
        this.contentWrapperEl.style[this.axis[axis].overflowAttr] = 'hidden';
      } // Even if forceVisible is enabled, scrollbar itself should be hidden


      if (this.axis[axis].isOverflowing) {
        scrollbar.style.display = 'block';
      } else {
        scrollbar.style.display = 'none';
      }
    };

    _proto.hideNativeScrollbar = function hideNativeScrollbar() {
      this.offsetEl.style[this.isRtl ? 'left' : 'right'] = this.axis.y.isOverflowing || this.axis.y.forceVisible ? "-" + this.scrollbarWidth + "px" : 0;
      this.offsetEl.style.bottom = this.axis.x.isOverflowing || this.axis.x.forceVisible ? "-" + this.scrollbarWidth + "px" : 0;
    }
    /**
     * On scroll event handling
     */
    ;

    _proto.onMouseMoveForAxis = function onMouseMoveForAxis(axis) {
      if (axis === void 0) {
        axis = 'y';
      }

      this.axis[axis].track.rect = this.axis[axis].track.el.getBoundingClientRect();
      this.axis[axis].scrollbar.rect = this.axis[axis].scrollbar.el.getBoundingClientRect();
      var isWithinScrollbarBoundsX = this.isWithinBounds(this.axis[axis].scrollbar.rect);

      if (isWithinScrollbarBoundsX) {
        this.axis[axis].scrollbar.el.classList.add(this.classNames.hover);
      } else {
        this.axis[axis].scrollbar.el.classList.remove(this.classNames.hover);
      }

      if (this.isWithinBounds(this.axis[axis].track.rect)) {
        this.showScrollbar(axis);
        this.axis[axis].track.el.classList.add(this.classNames.hover);
      } else {
        this.axis[axis].track.el.classList.remove(this.classNames.hover);
      }
    };

    _proto.onMouseLeaveForAxis = function onMouseLeaveForAxis(axis) {
      if (axis === void 0) {
        axis = 'y';
      }

      this.axis[axis].track.el.classList.remove(this.classNames.hover);
      this.axis[axis].scrollbar.el.classList.remove(this.classNames.hover);
    };

    /**
     * Show scrollbar
     */
    _proto.showScrollbar = function showScrollbar(axis) {
      if (axis === void 0) {
        axis = 'y';
      }

      var scrollbar = this.axis[axis].scrollbar.el;

      if (!this.axis[axis].isVisible) {
        scrollbar.classList.add(this.classNames.visible);
        this.axis[axis].isVisible = true;
      }

      if (this.options.autoHide) {
        this.hideScrollbars();
      }
    }
    /**
     * Hide Scrollbar
     */
    ;

    /**
     * on scrollbar handle drag movement starts
     */
    _proto.onDragStart = function onDragStart(e, axis) {
      if (axis === void 0) {
        axis = 'y';
      }

      var elDocument = getElementDocument(this.el);
      var elWindow = getElementWindow(this.el);
      var scrollbar = this.axis[axis].scrollbar; // Measure how far the user's mouse is from the top of the scrollbar drag handle.

      var eventOffset = axis === 'y' ? e.pageY : e.pageX;
      this.axis[axis].dragOffset = eventOffset - scrollbar.rect[this.axis[axis].offsetAttr];
      this.draggedAxis = axis;
      this.el.classList.add(this.classNames.dragging);
      elDocument.addEventListener('mousemove', this.drag, true);
      elDocument.addEventListener('mouseup', this.onEndDrag, true);

      if (this.removePreventClickId === null) {
        elDocument.addEventListener('click', this.preventClick, true);
        elDocument.addEventListener('dblclick', this.preventClick, true);
      } else {
        elWindow.clearTimeout(this.removePreventClickId);
        this.removePreventClickId = null;
      }
    }
    /**
     * Drag scrollbar handle
     */
    ;

    _proto.onTrackClick = function onTrackClick(e, axis) {
      var _this4 = this;

      if (axis === void 0) {
        axis = 'y';
      }

      if (!this.options.clickOnTrack) return;
      var elWindow = getElementWindow(this.el);
      this.axis[axis].scrollbar.rect = this.axis[axis].scrollbar.el.getBoundingClientRect();
      var scrollbar = this.axis[axis].scrollbar;
      var scrollbarOffset = scrollbar.rect[this.axis[axis].offsetAttr];
      var hostSize = parseInt(this.elStyles[this.axis[axis].sizeAttr], 10);
      var scrolled = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
      var t = axis === 'y' ? this.mouseY - scrollbarOffset : this.mouseX - scrollbarOffset;
      var dir = t < 0 ? -1 : 1;
      var scrollSize = dir === -1 ? scrolled - hostSize : scrolled + hostSize;

      var scrollTo = function scrollTo() {
        if (dir === -1) {
          if (scrolled > scrollSize) {
            var _this4$contentWrapper;

            scrolled -= _this4.options.clickOnTrackSpeed;

            _this4.contentWrapperEl.scrollTo((_this4$contentWrapper = {}, _this4$contentWrapper[_this4.axis[axis].offsetAttr] = scrolled, _this4$contentWrapper));

            elWindow.requestAnimationFrame(scrollTo);
          }
        } else {
          if (scrolled < scrollSize) {
            var _this4$contentWrapper2;

            scrolled += _this4.options.clickOnTrackSpeed;

            _this4.contentWrapperEl.scrollTo((_this4$contentWrapper2 = {}, _this4$contentWrapper2[_this4.axis[axis].offsetAttr] = scrolled, _this4$contentWrapper2));

            elWindow.requestAnimationFrame(scrollTo);
          }
        }
      };

      scrollTo();
    }
    /**
     * Getter for content element
     */
    ;

    _proto.getContentElement = function getContentElement() {
      return this.contentEl;
    }
    /**
     * Getter for original scrolling element
     */
    ;

    _proto.getScrollElement = function getScrollElement() {
      return this.contentWrapperEl;
    };

    _proto.getScrollbarWidth = function getScrollbarWidth() {
      // Try/catch for FF 56 throwing on undefined computedStyles
      try {
        // Detect browsers supporting CSS scrollbar styling and do not calculate
        if (getComputedStyle(this.contentWrapperEl, '::-webkit-scrollbar').display === 'none' || 'scrollbarWidth' in document.documentElement.style || '-ms-overflow-style' in document.documentElement.style) {
          return 0;
        } else {
          return scrollbarWidth(this.el);
        }
      } catch (e) {
        return scrollbarWidth(this.el);
      }
    };

    _proto.removeListeners = function removeListeners() {
      var _this5 = this;

      var elWindow = getElementWindow(this.el); // Event listeners

      if (this.options.autoHide) {
        this.el.removeEventListener('mouseenter', this.onMouseEnter);
      }

      ['mousedown', 'click', 'dblclick'].forEach(function (e) {
        _this5.el.removeEventListener(e, _this5.onPointerEvent, true);
      });
      ['touchstart', 'touchend', 'touchmove'].forEach(function (e) {
        _this5.el.removeEventListener(e, _this5.onPointerEvent, {
          capture: true,
          passive: true
        });
      });
      this.el.removeEventListener('mousemove', this.onMouseMove);
      this.el.removeEventListener('mouseleave', this.onMouseLeave);

      if (this.contentWrapperEl) {
        this.contentWrapperEl.removeEventListener('scroll', this.onScroll);
      }

      elWindow.removeEventListener('resize', this.onWindowResize);

      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      } // Cancel all debounced functions


      this.recalculate.cancel();
      this.onMouseMove.cancel();
      this.hideScrollbars.cancel();
      this.onWindowResize.cancel();
    }
    /**
     * UnMount mutation observer and delete SimpleBar instance from DOM element
     */
    ;

    _proto.unMount = function unMount() {
      this.removeListeners();
      SimpleBar.instances.delete(this.el);
    }
    /**
     * Check if mouse is within bounds
     */
    ;

    _proto.isWithinBounds = function isWithinBounds(bbox) {
      return this.mouseX >= bbox.left && this.mouseX <= bbox.left + bbox.width && this.mouseY >= bbox.top && this.mouseY <= bbox.top + bbox.height;
    }
    /**
     * Find element children matches query
     */
    ;

    _proto.findChild = function findChild(el, query) {
      var matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
      return Array.prototype.filter.call(el.children, function (child) {
        return matches.call(child, query);
      })[0];
    };

    return SimpleBar;
  }();

  SimpleBar.defaultOptions = {
    autoHide: true,
    forceVisible: false,
    clickOnTrack: true,
    clickOnTrackSpeed: 40,
    classNames: {
      contentEl: 'simplebar-content',
      contentWrapper: 'simplebar-content-wrapper',
      offset: 'simplebar-offset',
      mask: 'simplebar-mask',
      wrapper: 'simplebar-wrapper',
      placeholder: 'simplebar-placeholder',
      scrollbar: 'simplebar-scrollbar',
      track: 'simplebar-track',
      heightAutoObserverWrapperEl: 'simplebar-height-auto-observer-wrapper',
      heightAutoObserverEl: 'simplebar-height-auto-observer',
      visible: 'simplebar-visible',
      horizontal: 'simplebar-horizontal',
      vertical: 'simplebar-vertical',
      hover: 'simplebar-hover',
      dragging: 'simplebar-dragging'
    },
    scrollbarMinSize: 25,
    scrollbarMaxSize: 0,
    timeout: 1000
  };
  SimpleBar.instances = new WeakMap();

  SimpleBar.initDOMLoadedElements = function () {
    document.removeEventListener('DOMContentLoaded', this.initDOMLoadedElements);
    window.removeEventListener('load', this.initDOMLoadedElements);
    Array.prototype.forEach.call(document.querySelectorAll('[data-simplebar]'), function (el) {
      if (el.getAttribute('data-simplebar') !== 'init' && !SimpleBar.instances.has(el)) new SimpleBar(el, getOptions(el.attributes));
    });
  };

  SimpleBar.removeObserver = function () {
    this.globalObserver.disconnect();
  };

  SimpleBar.initHtmlApi = function () {
    this.initDOMLoadedElements = this.initDOMLoadedElements.bind(this); // MutationObserver is IE11+

    if (typeof MutationObserver !== 'undefined') {
      // Mutation observer to observe dynamically added elements
      this.globalObserver = new MutationObserver(SimpleBar.handleMutations);
      this.globalObserver.observe(document, {
        childList: true,
        subtree: true
      });
    } // Taken from jQuery `ready` function
    // Instantiate elements already present on the page


    if (document.readyState === 'complete' || document.readyState !== 'loading' && !document.documentElement.doScroll) {
      // Handle it asynchronously to allow scripts the opportunity to delay init
      window.setTimeout(this.initDOMLoadedElements);
    } else {
      document.addEventListener('DOMContentLoaded', this.initDOMLoadedElements);
      window.addEventListener('load', this.initDOMLoadedElements);
    }
  };

  SimpleBar.handleMutations = function (mutations) {
    mutations.forEach(function (mutation) {
      Array.prototype.forEach.call(mutation.addedNodes, function (addedNode) {
        if (addedNode.nodeType === 1) {
          if (addedNode.hasAttribute('data-simplebar')) {
            !SimpleBar.instances.has(addedNode) && document.documentElement.contains(addedNode) && new SimpleBar(addedNode, getOptions(addedNode.attributes));
          } else {
            Array.prototype.forEach.call(addedNode.querySelectorAll('[data-simplebar]'), function (el) {
              if (el.getAttribute('data-simplebar') !== 'init' && !SimpleBar.instances.has(el) && document.documentElement.contains(el)) new SimpleBar(el, getOptions(el.attributes));
            });
          }
        }
      });
      Array.prototype.forEach.call(mutation.removedNodes, function (removedNode) {
        if (removedNode.nodeType === 1) {
          if (removedNode.getAttribute('data-simplebar') === 'init') {
            SimpleBar.instances.has(removedNode) && !document.documentElement.contains(removedNode) && SimpleBar.instances.get(removedNode).unMount();
          } else {
            Array.prototype.forEach.call(removedNode.querySelectorAll('[data-simplebar="init"]'), function (el) {
              SimpleBar.instances.has(el) && !document.documentElement.contains(el) && SimpleBar.instances.get(el).unMount();
            });
          }
        }
      });
    });
  };

  SimpleBar.getOptions = getOptions;
  /**
   * HTML API
   * Called only in a browser env.
   */

  if (canUseDom) {
    SimpleBar.initHtmlApi();
  }

  var deepFreezeEs6 = {exports: {}};

  function deepFreeze(obj) {
      if (obj instanceof Map) {
          obj.clear = obj.delete = obj.set = function () {
              throw new Error('map is read-only');
          };
      } else if (obj instanceof Set) {
          obj.add = obj.clear = obj.delete = function () {
              throw new Error('set is read-only');
          };
      }

      // Freeze self
      Object.freeze(obj);

      Object.getOwnPropertyNames(obj).forEach(function (name) {
          var prop = obj[name];

          // Freeze prop if it is an object
          if (typeof prop == 'object' && !Object.isFrozen(prop)) {
              deepFreeze(prop);
          }
      });

      return obj;
  }

  deepFreezeEs6.exports = deepFreeze;
  deepFreezeEs6.exports.default = deepFreeze;

  /** @typedef {import('highlight.js').CallbackResponse} CallbackResponse */
  /** @typedef {import('highlight.js').CompiledMode} CompiledMode */
  /** @implements CallbackResponse */

  class Response {
    /**
     * @param {CompiledMode} mode
     */
    constructor(mode) {
      // eslint-disable-next-line no-undefined
      if (mode.data === undefined) mode.data = {};

      this.data = mode.data;
      this.isMatchIgnored = false;
    }

    ignoreMatch() {
      this.isMatchIgnored = true;
    }
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function escapeHTML(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * performs a shallow merge of multiple objects into one
   *
   * @template T
   * @param {T} original
   * @param {Record<string,any>[]} objects
   * @returns {T} a single new object
   */
  function inherit$1(original, ...objects) {
    /** @type Record<string,any> */
    const result = Object.create(null);

    for (const key in original) {
      result[key] = original[key];
    }
    objects.forEach(function(obj) {
      for (const key in obj) {
        result[key] = obj[key];
      }
    });
    return /** @type {T} */ (result);
  }

  /**
   * @typedef {object} Renderer
   * @property {(text: string) => void} addText
   * @property {(node: Node) => void} openNode
   * @property {(node: Node) => void} closeNode
   * @property {() => string} value
   */

  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean}} Node */
  /** @typedef {{walk: (r: Renderer) => void}} Tree */
  /** */

  const SPAN_CLOSE = '</span>';

  /**
   * Determines if a node needs to be wrapped in <span>
   *
   * @param {Node} node */
  const emitsWrappingTags = (node) => {
    // rarely we can have a sublanguage where language is undefined
    // TODO: track down why
    return !!node.scope || (node.sublanguage && node.language);
  };

  /**
   *
   * @param {string} name
   * @param {{prefix:string}} options
   */
  const scopeToCSSClass = (name, { prefix }) => {
    if (name.includes(".")) {
      const pieces = name.split(".");
      return [
        `${prefix}${pieces.shift()}`,
        ...(pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`))
      ].join(" ");
    }
    return `${prefix}${name}`;
  };

  /** @type {Renderer} */
  class HTMLRenderer {
    /**
     * Creates a new HTMLRenderer
     *
     * @param {Tree} parseTree - the parse tree (must support `walk` API)
     * @param {{classPrefix: string}} options
     */
    constructor(parseTree, options) {
      this.buffer = "";
      this.classPrefix = options.classPrefix;
      parseTree.walk(this);
    }

    /**
     * Adds texts to the output stream
     *
     * @param {string} text */
    addText(text) {
      this.buffer += escapeHTML(text);
    }

    /**
     * Adds a node open to the output stream (if needed)
     *
     * @param {Node} node */
    openNode(node) {
      if (!emitsWrappingTags(node)) return;

      let className = "";
      if (node.sublanguage) {
        className = `language-${node.language}`;
      } else {
        className = scopeToCSSClass(node.scope, { prefix: this.classPrefix });
      }
      this.span(className);
    }

    /**
     * Adds a node close to the output stream (if needed)
     *
     * @param {Node} node */
    closeNode(node) {
      if (!emitsWrappingTags(node)) return;

      this.buffer += SPAN_CLOSE;
    }

    /**
     * returns the accumulated buffer
    */
    value() {
      return this.buffer;
    }

    // helpers

    /**
     * Builds a span element
     *
     * @param {string} className */
    span(className) {
      this.buffer += `<span class="${className}">`;
    }
  }

  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean, children: Node[]} | string} Node */
  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean, children: Node[]} } DataNode */
  /** @typedef {import('highlight.js').Emitter} Emitter */
  /**  */

  /** @returns {DataNode} */
  const newNode = (opts = {}) => {
    /** @type DataNode */
    const result = { children: [] };
    Object.assign(result, opts);
    return result;
  };

  class TokenTree {
    constructor() {
      /** @type DataNode */
      this.rootNode = newNode();
      this.stack = [this.rootNode];
    }

    get top() {
      return this.stack[this.stack.length - 1];
    }

    get root() { return this.rootNode; }

    /** @param {Node} node */
    add(node) {
      this.top.children.push(node);
    }

    /** @param {string} scope */
    openNode(scope) {
      /** @type Node */
      const node = newNode({ scope });
      this.add(node);
      this.stack.push(node);
    }

    closeNode() {
      if (this.stack.length > 1) {
        return this.stack.pop();
      }
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    closeAllNodes() {
      while (this.closeNode());
    }

    toJSON() {
      return JSON.stringify(this.rootNode, null, 4);
    }

    /**
     * @typedef { import("./html_renderer").Renderer } Renderer
     * @param {Renderer} builder
     */
    walk(builder) {
      // this does not
      return this.constructor._walk(builder, this.rootNode);
      // this works
      // return TokenTree._walk(builder, this.rootNode);
    }

    /**
     * @param {Renderer} builder
     * @param {Node} node
     */
    static _walk(builder, node) {
      if (typeof node === "string") {
        builder.addText(node);
      } else if (node.children) {
        builder.openNode(node);
        node.children.forEach((child) => this._walk(builder, child));
        builder.closeNode(node);
      }
      return builder;
    }

    /**
     * @param {Node} node
     */
    static _collapse(node) {
      if (typeof node === "string") return;
      if (!node.children) return;

      if (node.children.every(el => typeof el === "string")) {
        // node.text = node.children.join("");
        // delete node.children;
        node.children = [node.children.join("")];
      } else {
        node.children.forEach((child) => {
          TokenTree._collapse(child);
        });
      }
    }
  }

  /**
    Currently this is all private API, but this is the minimal API necessary
    that an Emitter must implement to fully support the parser.

    Minimal interface:

    - addKeyword(text, scope)
    - addText(text)
    - addSublanguage(emitter, subLanguageName)
    - finalize()
    - openNode(scope)
    - closeNode()
    - closeAllNodes()
    - toHTML()

  */

  /**
   * @implements {Emitter}
   */
  class TokenTreeEmitter extends TokenTree {
    /**
     * @param {*} options
     */
    constructor(options) {
      super();
      this.options = options;
    }

    /**
     * @param {string} text
     * @param {string} scope
     */
    addKeyword(text, scope) {
      if (text === "") { return; }

      this.openNode(scope);
      this.addText(text);
      this.closeNode();
    }

    /**
     * @param {string} text
     */
    addText(text) {
      if (text === "") { return; }

      this.add(text);
    }

    /**
     * @param {Emitter & {root: DataNode}} emitter
     * @param {string} name
     */
    addSublanguage(emitter, name) {
      /** @type DataNode */
      const node = emitter.root;
      node.sublanguage = true;
      node.language = name;
      this.add(node);
    }

    toHTML() {
      const renderer = new HTMLRenderer(this, this.options);
      return renderer.value();
    }

    finalize() {
      return true;
    }
  }

  /**
   * @param {string} value
   * @returns {RegExp}
   * */

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;

    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function anyNumberOfTimes(re) {
    return concat('(?:', re, ')*');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function optional(re) {
    return concat('(?:', re, ')?');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];

    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '('
      + (opts.capture ? "" : "?:")
      + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }

  /**
   * @param {RegExp | string} re
   * @returns {number}
   */
  function countMatchGroups(re) {
    return (new RegExp(re.toString() + '|')).exec('').length - 1;
  }

  /**
   * Does lexeme start with a regular expression match at the beginning
   * @param {RegExp} re
   * @param {string} lexeme
   */
  function startsWith(re, lexeme) {
    const match = re && re.exec(lexeme);
    return match && match.index === 0;
  }

  // BACKREF_RE matches an open parenthesis or backreference. To avoid
  // an incorrect parse, it additionally matches the following:
  // - [...] elements, where the meaning of parentheses and escapes change
  // - other escape sequences, so we do not misparse escape sequences as
  //   interesting elements
  // - non-matching or lookahead parentheses, which do not capture. These
  //   follow the '(' with a '?'.
  const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

  // **INTERNAL** Not intended for outside usage
  // join logically computes regexps.join(separator), but fixes the
  // backreferences so they continue to match.
  // it also places each individual regular expression into it's own
  // match group, keeping track of the sequencing of those match groups
  // is currently an exercise for the caller. :-)
  /**
   * @param {(string | RegExp)[]} regexps
   * @param {{joinWith: string}} opts
   * @returns {string}
   */
  function _rewriteBackreferences(regexps, { joinWith }) {
    let numCaptures = 0;

    return regexps.map((regex) => {
      numCaptures += 1;
      const offset = numCaptures;
      let re = source(regex);
      let out = '';

      while (re.length > 0) {
        const match = BACKREF_RE.exec(re);
        if (!match) {
          out += re;
          break;
        }
        out += re.substring(0, match.index);
        re = re.substring(match.index + match[0].length);
        if (match[0][0] === '\\' && match[1]) {
          // Adjust the backreference.
          out += '\\' + String(Number(match[1]) + offset);
        } else {
          out += match[0];
          if (match[0] === '(') {
            numCaptures++;
          }
        }
      }
      return out;
    }).map(re => `(${re})`).join(joinWith);
  }

  /** @typedef {import('highlight.js').Mode} Mode */
  /** @typedef {import('highlight.js').ModeCallback} ModeCallback */

  // Common regexps
  const MATCH_NOTHING_RE = /\b\B/;
  const IDENT_RE$2 = '[a-zA-Z]\\w*';
  const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  /**
  * @param { Partial<Mode> & {binary?: string | RegExp} } opts
  */
  const SHEBANG = (opts = {}) => {
    const beginShebang = /^#![ ]*\//;
    if (opts.binary) {
      opts.begin = concat(
        beginShebang,
        /.*\b/,
        opts.binary,
        /\b.*/);
    }
    return inherit$1({
      scope: 'meta',
      begin: beginShebang,
      end: /$/,
      relevance: 0,
      /** @type {ModeCallback} */
      "on:begin": (m, resp) => {
        if (m.index !== 0) resp.ignoreMatch();
      }
    }, opts);
  };

  // Common modes
  const BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  const APOS_STRING_MODE = {
    scope: 'string',
    begin: '\'',
    end: '\'',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const QUOTE_STRING_MODE = {
    scope: 'string',
    begin: '"',
    end: '"',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
  };
  /**
   * Creates a comment mode
   *
   * @param {string | RegExp} begin
   * @param {string | RegExp} end
   * @param {Mode | {}} [modeOptions]
   * @returns {Partial<Mode>}
   */
  const COMMENT = function(begin, end, modeOptions = {}) {
    const mode = inherit$1(
      {
        scope: 'comment',
        begin,
        end,
        contains: []
      },
      modeOptions
    );
    mode.contains.push({
      scope: 'doctag',
      // hack to avoid the space from being included. the space is necessary to
      // match here to prevent the plain text rule below from gobbling up doctags
      begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
      end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
      excludeBegin: true,
      relevance: 0
    });
    const ENGLISH_WORD = either(
      // list of common 1 and 2 letter words in English
      "I",
      "a",
      "is",
      "so",
      "us",
      "to",
      "at",
      "if",
      "in",
      "it",
      "on",
      // note: this is not an exhaustive list of contractions, just popular ones
      /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, // contractions - can't we'd they're let's, etc
      /[A-Za-z]+[-][a-z]+/, // `no-way`, etc.
      /[A-Za-z][a-z]{2,}/ // allow capitalized words at beginning of sentences
    );
    // looking like plain text, more likely to be a comment
    mode.contains.push(
      {
        // TODO: how to include ", (, ) without breaking grammars that use these for
        // comment delimiters?
        // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
        // ---

        // this tries to find sequences of 3 english words in a row (without any
        // "programming" type syntax) this gives us a strong signal that we've
        // TRULY found a comment - vs perhaps scanning with the wrong language.
        // It's possible to find something that LOOKS like the start of the
        // comment - but then if there is no readable text - good chance it is a
        // false match and not a comment.
        //
        // for a visual example please see:
        // https://github.com/highlightjs/highlight.js/issues/2827

        begin: concat(
          /[ ]+/, // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
          '(',
          ENGLISH_WORD,
          /[.]?[:]?([.][ ]|[ ])/,
          '){3}') // look for 3 words in a row
      }
    );
    return mode;
  };
  const C_LINE_COMMENT_MODE = COMMENT('//', '$');
  const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
  const HASH_COMMENT_MODE = COMMENT('#', '$');
  const NUMBER_MODE = {
    scope: 'number',
    begin: NUMBER_RE,
    relevance: 0
  };
  const C_NUMBER_MODE = {
    scope: 'number',
    begin: C_NUMBER_RE,
    relevance: 0
  };
  const BINARY_NUMBER_MODE = {
    scope: 'number',
    begin: BINARY_NUMBER_RE,
    relevance: 0
  };
  const REGEXP_MODE = {
    // this outer rule makes sure we actually have a WHOLE regex and not simply
    // an expression such as:
    //
    //     3 / something
    //
    // (which will then blow up when regex's `illegal` sees the newline)
    begin: /(?=\/[^/\n]*\/)/,
    contains: [{
      scope: 'regexp',
      begin: /\//,
      end: /\/[gimuy]*/,
      illegal: /\n/,
      contains: [
        BACKSLASH_ESCAPE,
        {
          begin: /\[/,
          end: /\]/,
          relevance: 0,
          contains: [BACKSLASH_ESCAPE]
        }
      ]
    }]
  };
  const TITLE_MODE = {
    scope: 'title',
    begin: IDENT_RE$2,
    relevance: 0
  };
  const UNDERSCORE_TITLE_MODE = {
    scope: 'title',
    begin: UNDERSCORE_IDENT_RE,
    relevance: 0
  };
  const METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  /**
   * Adds end same as begin mechanics to a mode
   *
   * Your mode must include at least a single () match group as that first match
   * group is what is used for comparison
   * @param {Partial<Mode>} mode
   */
  const END_SAME_AS_BEGIN = function(mode) {
    return Object.assign(mode,
      {
        /** @type {ModeCallback} */
        'on:begin': (m, resp) => { resp.data._beginMatch = m[1]; },
        /** @type {ModeCallback} */
        'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); }
      });
  };

  var MODES$1 = /*#__PURE__*/Object.freeze({
      __proto__: null,
      MATCH_NOTHING_RE: MATCH_NOTHING_RE,
      IDENT_RE: IDENT_RE$2,
      UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
      NUMBER_RE: NUMBER_RE,
      C_NUMBER_RE: C_NUMBER_RE,
      BINARY_NUMBER_RE: BINARY_NUMBER_RE,
      RE_STARTERS_RE: RE_STARTERS_RE,
      SHEBANG: SHEBANG,
      BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
      APOS_STRING_MODE: APOS_STRING_MODE,
      QUOTE_STRING_MODE: QUOTE_STRING_MODE,
      PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
      COMMENT: COMMENT,
      C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
      C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
      HASH_COMMENT_MODE: HASH_COMMENT_MODE,
      NUMBER_MODE: NUMBER_MODE,
      C_NUMBER_MODE: C_NUMBER_MODE,
      BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
      REGEXP_MODE: REGEXP_MODE,
      TITLE_MODE: TITLE_MODE,
      UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE,
      METHOD_GUARD: METHOD_GUARD,
      END_SAME_AS_BEGIN: END_SAME_AS_BEGIN
  });

  /**
  @typedef {import('highlight.js').CallbackResponse} CallbackResponse
  @typedef {import('highlight.js').CompilerExt} CompilerExt
  */

  // Grammar extensions / plugins
  // See: https://github.com/highlightjs/highlight.js/issues/2833

  // Grammar extensions allow "syntactic sugar" to be added to the grammar modes
  // without requiring any underlying changes to the compiler internals.

  // `compileMatch` being the perfect small example of now allowing a grammar
  // author to write `match` when they desire to match a single expression rather
  // than being forced to use `begin`.  The extension then just moves `match` into
  // `begin` when it runs.  Ie, no features have been added, but we've just made
  // the experience of writing (and reading grammars) a little bit nicer.

  // ------

  // TODO: We need negative look-behind support to do this properly
  /**
   * Skip a match if it has a preceding dot
   *
   * This is used for `beginKeywords` to prevent matching expressions such as
   * `bob.keyword.do()`. The mode compiler automatically wires this up as a
   * special _internal_ 'on:begin' callback for modes with `beginKeywords`
   * @param {RegExpMatchArray} match
   * @param {CallbackResponse} response
   */
  function skipIfHasPrecedingDot(match, response) {
    const before = match.input[match.index - 1];
    if (before === ".") {
      response.ignoreMatch();
    }
  }

  /**
   *
   * @type {CompilerExt}
   */
  function scopeClassName(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.className !== undefined) {
      mode.scope = mode.className;
      delete mode.className;
    }
  }

  /**
   * `beginKeywords` syntactic sugar
   * @type {CompilerExt}
   */
  function beginKeywords(mode, parent) {
    if (!parent) return;
    if (!mode.beginKeywords) return;

    // for languages with keywords that include non-word characters checking for
    // a word boundary is not sufficient, so instead we check for a word boundary
    // or whitespace - this does no harm in any case since our keyword engine
    // doesn't allow spaces in keywords anyways and we still check for the boundary
    // first
    mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?!\\.)(?=\\b|\\s)';
    mode.__beforeBegin = skipIfHasPrecedingDot;
    mode.keywords = mode.keywords || mode.beginKeywords;
    delete mode.beginKeywords;

    // prevents double relevance, the keywords themselves provide
    // relevance, the mode doesn't need to double it
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 0;
  }

  /**
   * Allow `illegal` to contain an array of illegal values
   * @type {CompilerExt}
   */
  function compileIllegal(mode, _parent) {
    if (!Array.isArray(mode.illegal)) return;

    mode.illegal = either(...mode.illegal);
  }

  /**
   * `match` to match a single expression for readability
   * @type {CompilerExt}
   */
  function compileMatch(mode, _parent) {
    if (!mode.match) return;
    if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");

    mode.begin = mode.match;
    delete mode.match;
  }

  /**
   * provides the default 1 relevance to all modes
   * @type {CompilerExt}
   */
  function compileRelevance(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 1;
  }

  // allow beforeMatch to act as a "qualifier" for the match
  // the full match begin must be [beforeMatch][begin]
  const beforeMatchExt = (mode, parent) => {
    if (!mode.beforeMatch) return;
    // starts conflicts with endsParent which we need to make sure the child
    // rule is not matched multiple times
    if (mode.starts) throw new Error("beforeMatch cannot be used with starts");

    const originalMode = Object.assign({}, mode);
    Object.keys(mode).forEach((key) => { delete mode[key]; });

    mode.keywords = originalMode.keywords;
    mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
    mode.starts = {
      relevance: 0,
      contains: [
        Object.assign(originalMode, { endsParent: true })
      ]
    };
    mode.relevance = 0;

    delete originalMode.beforeMatch;
  };

  // keywords that should have no default relevance value
  const COMMON_KEYWORDS = [
    'of',
    'and',
    'for',
    'in',
    'not',
    'or',
    'if',
    'then',
    'parent', // common variable name
    'list', // common variable name
    'value' // common variable name
  ];

  const DEFAULT_KEYWORD_SCOPE = "keyword";

  /**
   * Given raw keywords from a language definition, compile them.
   *
   * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
   * @param {boolean} caseInsensitive
   */
  function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
    /** @type {import("highlight.js/private").KeywordDict} */
    const compiledKeywords = Object.create(null);

    // input can be a string of keywords, an array of keywords, or a object with
    // named keys representing scopeName (which can then point to a string or array)
    if (typeof rawKeywords === 'string') {
      compileList(scopeName, rawKeywords.split(" "));
    } else if (Array.isArray(rawKeywords)) {
      compileList(scopeName, rawKeywords);
    } else {
      Object.keys(rawKeywords).forEach(function(scopeName) {
        // collapse all our objects back into the parent object
        Object.assign(
          compiledKeywords,
          compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName)
        );
      });
    }
    return compiledKeywords;

    // ---

    /**
     * Compiles an individual list of keywords
     *
     * Ex: "for if when while|5"
     *
     * @param {string} scopeName
     * @param {Array<string>} keywordList
     */
    function compileList(scopeName, keywordList) {
      if (caseInsensitive) {
        keywordList = keywordList.map(x => x.toLowerCase());
      }
      keywordList.forEach(function(keyword) {
        const pair = keyword.split('|');
        compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
      });
    }
  }

  /**
   * Returns the proper score for a given keyword
   *
   * Also takes into account comment keywords, which will be scored 0 UNLESS
   * another score has been manually assigned.
   * @param {string} keyword
   * @param {string} [providedScore]
   */
  function scoreForKeyword(keyword, providedScore) {
    // manual scores always win over common keywords
    // so you can force a score of 1 if you really insist
    if (providedScore) {
      return Number(providedScore);
    }

    return commonKeyword(keyword) ? 0 : 1;
  }

  /**
   * Determines if a given keyword is common or not
   *
   * @param {string} keyword */
  function commonKeyword(keyword) {
    return COMMON_KEYWORDS.includes(keyword.toLowerCase());
  }

  /*

  For the reasoning behind this please see:
  https://github.com/highlightjs/highlight.js/issues/2880#issuecomment-747275419

  */

  /**
   * @type {Record<string, boolean>}
   */
  const seenDeprecations = {};

  /**
   * @param {string} message
   */
  const error = (message) => {
    console.error(message);
  };

  /**
   * @param {string} message
   * @param {any} args
   */
  const warn = (message, ...args) => {
    console.log(`WARN: ${message}`, ...args);
  };

  /**
   * @param {string} version
   * @param {string} message
   */
  const deprecated = (version, message) => {
    if (seenDeprecations[`${version}/${message}`]) return;

    console.log(`Deprecated as of ${version}. ${message}`);
    seenDeprecations[`${version}/${message}`] = true;
  };

  /* eslint-disable no-throw-literal */

  /**
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  */

  const MultiClassError = new Error();

  /**
   * Renumbers labeled scope names to account for additional inner match
   * groups that otherwise would break everything.
   *
   * Lets say we 3 match scopes:
   *
   *   { 1 => ..., 2 => ..., 3 => ... }
   *
   * So what we need is a clean match like this:
   *
   *   (a)(b)(c) => [ "a", "b", "c" ]
   *
   * But this falls apart with inner match groups:
   *
   * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
   *
   * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
   * What needs to happen is the numbers are remapped:
   *
   *   { 1 => ..., 2 => ..., 5 => ... }
   *
   * We also need to know that the ONLY groups that should be output
   * are 1, 2, and 5.  This function handles this behavior.
   *
   * @param {CompiledMode} mode
   * @param {Array<RegExp | string>} regexes
   * @param {{key: "beginScope"|"endScope"}} opts
   */
  function remapScopeNames(mode, regexes, { key }) {
    let offset = 0;
    const scopeNames = mode[key];
    /** @type Record<number,boolean> */
    const emit = {};
    /** @type Record<number,string> */
    const positions = {};

    for (let i = 1; i <= regexes.length; i++) {
      positions[i + offset] = scopeNames[i];
      emit[i + offset] = true;
      offset += countMatchGroups(regexes[i - 1]);
    }
    // we use _emit to keep track of which match groups are "top-level" to avoid double
    // output from inside match groups
    mode[key] = positions;
    mode[key]._emit = emit;
    mode[key]._multi = true;
  }

  /**
   * @param {CompiledMode} mode
   */
  function beginMultiClass(mode) {
    if (!Array.isArray(mode.begin)) return;

    if (mode.skip || mode.excludeBegin || mode.returnBegin) {
      error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
      error("beginScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.begin, { key: "beginScope" });
    mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
  }

  /**
   * @param {CompiledMode} mode
   */
  function endMultiClass(mode) {
    if (!Array.isArray(mode.end)) return;

    if (mode.skip || mode.excludeEnd || mode.returnEnd) {
      error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.endScope !== "object" || mode.endScope === null) {
      error("endScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.end, { key: "endScope" });
    mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
  }

  /**
   * this exists only to allow `scope: {}` to be used beside `match:`
   * Otherwise `beginScope` would necessary and that would look weird

    {
      match: [ /def/, /\w+/ ]
      scope: { 1: "keyword" , 2: "title" }
    }

   * @param {CompiledMode} mode
   */
  function scopeSugar(mode) {
    if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
      mode.beginScope = mode.scope;
      delete mode.scope;
    }
  }

  /**
   * @param {CompiledMode} mode
   */
  function MultiClass(mode) {
    scopeSugar(mode);

    if (typeof mode.beginScope === "string") {
      mode.beginScope = { _wrap: mode.beginScope };
    }
    if (typeof mode.endScope === "string") {
      mode.endScope = { _wrap: mode.endScope };
    }

    beginMultiClass(mode);
    endMultiClass(mode);
  }

  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').CompiledLanguage} CompiledLanguage
  */

  // compilation

  /**
   * Compiles a language definition result
   *
   * Given the raw result of a language definition (Language), compiles this so
   * that it is ready for highlighting code.
   * @param {Language} language
   * @returns {CompiledLanguage}
   */
  function compileLanguage(language) {
    /**
     * Builds a regex with the case sensitivity of the current language
     *
     * @param {RegExp | string} value
     * @param {boolean} [global]
     */
    function langRe(value, global) {
      return new RegExp(
        source(value),
        'm'
        + (language.case_insensitive ? 'i' : '')
        + (language.unicodeRegex ? 'u' : '')
        + (global ? 'g' : '')
      );
    }

    /**
      Stores multiple regular expressions and allows you to quickly search for
      them all in a string simultaneously - returning the first match.  It does
      this by creating a huge (a|b|c) regex - each individual item wrapped with ()
      and joined by `|` - using match groups to track position.  When a match is
      found checking which position in the array has content allows us to figure
      out which of the original regexes / match groups triggered the match.

      The match object itself (the result of `Regex.exec`) is returned but also
      enhanced by merging in any meta-data that was registered with the regex.
      This is how we keep track of which mode matched, and what type of rule
      (`illegal`, `begin`, end, etc).
    */
    class MultiRegex {
      constructor() {
        this.matchIndexes = {};
        // @ts-ignore
        this.regexes = [];
        this.matchAt = 1;
        this.position = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        opts.position = this.position++;
        // @ts-ignore
        this.matchIndexes[this.matchAt] = opts;
        this.regexes.push([opts, re]);
        this.matchAt += countMatchGroups(re) + 1;
      }

      compile() {
        if (this.regexes.length === 0) {
          // avoids the need to check length every time exec is called
          // @ts-ignore
          this.exec = () => null;
        }
        const terminators = this.regexes.map(el => el[1]);
        this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: '|' }), true);
        this.lastIndex = 0;
      }

      /** @param {string} s */
      exec(s) {
        this.matcherRe.lastIndex = this.lastIndex;
        const match = this.matcherRe.exec(s);
        if (!match) { return null; }

        // eslint-disable-next-line no-undefined
        const i = match.findIndex((el, i) => i > 0 && el !== undefined);
        // @ts-ignore
        const matchData = this.matchIndexes[i];
        // trim off any earlier non-relevant match groups (ie, the other regex
        // match groups that make up the multi-matcher)
        match.splice(0, i);

        return Object.assign(match, matchData);
      }
    }

    /*
      Created to solve the key deficiently with MultiRegex - there is no way to
      test for multiple matches at a single location.  Why would we need to do
      that?  In the future a more dynamic engine will allow certain matches to be
      ignored.  An example: if we matched say the 3rd regex in a large group but
      decided to ignore it - we'd need to started testing again at the 4th
      regex... but MultiRegex itself gives us no real way to do that.

      So what this class creates MultiRegexs on the fly for whatever search
      position they are needed.

      NOTE: These additional MultiRegex objects are created dynamically.  For most
      grammars most of the time we will never actually need anything more than the
      first MultiRegex - so this shouldn't have too much overhead.

      Say this is our search group, and we match regex3, but wish to ignore it.

        regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

      What we need is a new MultiRegex that only includes the remaining
      possibilities:

        regex4 | regex5                               ' ie, startAt = 3

      This class wraps all that complexity up in a simple API... `startAt` decides
      where in the array of expressions to start doing the matching. It
      auto-increments, so if a match is found at position 2, then startAt will be
      set to 3.  If the end is reached startAt will return to 0.

      MOST of the time the parser will be setting startAt manually to 0.
    */
    class ResumableMultiRegex {
      constructor() {
        // @ts-ignore
        this.rules = [];
        // @ts-ignore
        this.multiRegexes = [];
        this.count = 0;

        this.lastIndex = 0;
        this.regexIndex = 0;
      }

      // @ts-ignore
      getMatcher(index) {
        if (this.multiRegexes[index]) return this.multiRegexes[index];

        const matcher = new MultiRegex();
        this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
        matcher.compile();
        this.multiRegexes[index] = matcher;
        return matcher;
      }

      resumingScanAtSamePosition() {
        return this.regexIndex !== 0;
      }

      considerAll() {
        this.regexIndex = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        this.rules.push([re, opts]);
        if (opts.type === "begin") this.count++;
      }

      /** @param {string} s */
      exec(s) {
        const m = this.getMatcher(this.regexIndex);
        m.lastIndex = this.lastIndex;
        let result = m.exec(s);

        // The following is because we have no easy way to say "resume scanning at the
        // existing position but also skip the current rule ONLY". What happens is
        // all prior rules are also skipped which can result in matching the wrong
        // thing. Example of matching "booger":

        // our matcher is [string, "booger", number]
        //
        // ....booger....

        // if "booger" is ignored then we'd really need a regex to scan from the
        // SAME position for only: [string, number] but ignoring "booger" (if it
        // was the first match), a simple resume would scan ahead who knows how
        // far looking only for "number", ignoring potential string matches (or
        // future "booger" matches that might be valid.)

        // So what we do: We execute two matchers, one resuming at the same
        // position, but the second full matcher starting at the position after:

        //     /--- resume first regex match here (for [number])
        //     |/---- full match here for [string, "booger", number]
        //     vv
        // ....booger....

        // Which ever results in a match first is then used. So this 3-4 step
        // process essentially allows us to say "match at this position, excluding
        // a prior rule that was ignored".
        //
        // 1. Match "booger" first, ignore. Also proves that [string] does non match.
        // 2. Resume matching for [number]
        // 3. Match at index + 1 for [string, "booger", number]
        // 4. If #2 and #3 result in matches, which came first?
        if (this.resumingScanAtSamePosition()) {
          if (result && result.index === this.lastIndex) ; else { // use the second matcher result
            const m2 = this.getMatcher(0);
            m2.lastIndex = this.lastIndex + 1;
            result = m2.exec(s);
          }
        }

        if (result) {
          this.regexIndex += result.position + 1;
          if (this.regexIndex === this.count) {
            // wrap-around to considering all matches again
            this.considerAll();
          }
        }

        return result;
      }
    }

    /**
     * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
     * the content and find matches.
     *
     * @param {CompiledMode} mode
     * @returns {ResumableMultiRegex}
     */
    function buildModeRegex(mode) {
      const mm = new ResumableMultiRegex();

      mode.contains.forEach(term => mm.addRule(term.begin, { rule: term, type: "begin" }));

      if (mode.terminatorEnd) {
        mm.addRule(mode.terminatorEnd, { type: "end" });
      }
      if (mode.illegal) {
        mm.addRule(mode.illegal, { type: "illegal" });
      }

      return mm;
    }

    /** skip vs abort vs ignore
     *
     * @skip   - The mode is still entered and exited normally (and contains rules apply),
     *           but all content is held and added to the parent buffer rather than being
     *           output when the mode ends.  Mostly used with `sublanguage` to build up
     *           a single large buffer than can be parsed by sublanguage.
     *
     *             - The mode begin ands ends normally.
     *             - Content matched is added to the parent mode buffer.
     *             - The parser cursor is moved forward normally.
     *
     * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
     *           never matched) but DOES NOT continue to match subsequent `contains`
     *           modes.  Abort is bad/suboptimal because it can result in modes
     *           farther down not getting applied because an earlier rule eats the
     *           content but then aborts.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is added to the mode buffer.
     *             - The parser cursor is moved forward accordingly.
     *
     * @ignore - Ignores the mode (as if it never matched) and continues to match any
     *           subsequent `contains` modes.  Ignore isn't technically possible with
     *           the current parser implementation.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is ignored.
     *             - The parser cursor is not moved forward.
     */

    /**
     * Compiles an individual mode
     *
     * This can raise an error if the mode contains certain detectable known logic
     * issues.
     * @param {Mode} mode
     * @param {CompiledMode | null} [parent]
     * @returns {CompiledMode | never}
     */
    function compileMode(mode, parent) {
      const cmode = /** @type CompiledMode */ (mode);
      if (mode.isCompiled) return cmode;

      [
        scopeClassName,
        // do this early so compiler extensions generally don't have to worry about
        // the distinction between match/begin
        compileMatch,
        MultiClass,
        beforeMatchExt
      ].forEach(ext => ext(mode, parent));

      language.compilerExtensions.forEach(ext => ext(mode, parent));

      // __beforeBegin is considered private API, internal use only
      mode.__beforeBegin = null;

      [
        beginKeywords,
        // do this later so compiler extensions that come earlier have access to the
        // raw array if they wanted to perhaps manipulate it, etc.
        compileIllegal,
        // default to 1 relevance if not specified
        compileRelevance
      ].forEach(ext => ext(mode, parent));

      mode.isCompiled = true;

      let keywordPattern = null;
      if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
        // we need a copy because keywords might be compiled multiple times
        // so we can't go deleting $pattern from the original on the first
        // pass
        mode.keywords = Object.assign({}, mode.keywords);
        keywordPattern = mode.keywords.$pattern;
        delete mode.keywords.$pattern;
      }
      keywordPattern = keywordPattern || /\w+/;

      if (mode.keywords) {
        mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
      }

      cmode.keywordPatternRe = langRe(keywordPattern, true);

      if (parent) {
        if (!mode.begin) mode.begin = /\B|\b/;
        cmode.beginRe = langRe(cmode.begin);
        if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
        if (mode.end) cmode.endRe = langRe(cmode.end);
        cmode.terminatorEnd = source(cmode.end) || '';
        if (mode.endsWithParent && parent.terminatorEnd) {
          cmode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
        }
      }
      if (mode.illegal) cmode.illegalRe = langRe(/** @type {RegExp | string} */ (mode.illegal));
      if (!mode.contains) mode.contains = [];

      mode.contains = [].concat(...mode.contains.map(function(c) {
        return expandOrCloneMode(c === 'self' ? mode : c);
      }));
      mode.contains.forEach(function(c) { compileMode(/** @type Mode */ (c), cmode); });

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      cmode.matcher = buildModeRegex(cmode);
      return cmode;
    }

    if (!language.compilerExtensions) language.compilerExtensions = [];

    // self is not valid at the top-level
    if (language.contains && language.contains.includes('self')) {
      throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
    }

    // we need a null object, which inherit will guarantee
    language.classNameAliases = inherit$1(language.classNameAliases || {});

    return compileMode(/** @type Mode */ (language));
  }

  /**
   * Determines if a mode has a dependency on it's parent or not
   *
   * If a mode does have a parent dependency then often we need to clone it if
   * it's used in multiple places so that each copy points to the correct parent,
   * where-as modes without a parent can often safely be re-used at the bottom of
   * a mode chain.
   *
   * @param {Mode | null} mode
   * @returns {boolean} - is there a dependency on the parent?
   * */
  function dependencyOnParent(mode) {
    if (!mode) return false;

    return mode.endsWithParent || dependencyOnParent(mode.starts);
  }

  /**
   * Expands a mode or clones it if necessary
   *
   * This is necessary for modes with parental dependenceis (see notes on
   * `dependencyOnParent`) and for nodes that have `variants` - which must then be
   * exploded into their own individual modes at compile time.
   *
   * @param {Mode} mode
   * @returns {Mode | Mode[]}
   * */
  function expandOrCloneMode(mode) {
    if (mode.variants && !mode.cachedVariants) {
      mode.cachedVariants = mode.variants.map(function(variant) {
        return inherit$1(mode, { variants: null }, variant);
      });
    }

    // EXPAND
    // if we have variants then essentially "replace" the mode with the variants
    // this happens in compileMode, where this function is called from
    if (mode.cachedVariants) {
      return mode.cachedVariants;
    }

    // CLONE
    // if we have dependencies on parents then we need a unique
    // instance of ourselves, so we can be reused with many
    // different parents without issue
    if (dependencyOnParent(mode)) {
      return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
    }

    if (Object.isFrozen(mode)) {
      return inherit$1(mode);
    }

    // no special dependency issues, just return ourselves
    return mode;
  }

  var version = "11.7.0";

  class HTMLInjectionError extends Error {
    constructor(reason, html) {
      super(reason);
      this.name = "HTMLInjectionError";
      this.html = html;
    }
  }

  /*
  Syntax highlighting with language autodetection.
  https://highlightjs.org/
  */

  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').CompiledScope} CompiledScope
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSApi} HLJSApi
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').PluginEvent} PluginEvent
  @typedef {import('highlight.js').HLJSOptions} HLJSOptions
  @typedef {import('highlight.js').LanguageFn} LanguageFn
  @typedef {import('highlight.js').HighlightedHTMLElement} HighlightedHTMLElement
  @typedef {import('highlight.js').BeforeHighlightContext} BeforeHighlightContext
  @typedef {import('highlight.js/private').MatchType} MatchType
  @typedef {import('highlight.js/private').KeywordData} KeywordData
  @typedef {import('highlight.js/private').EnhancedMatch} EnhancedMatch
  @typedef {import('highlight.js/private').AnnotatedError} AnnotatedError
  @typedef {import('highlight.js').AutoHighlightResult} AutoHighlightResult
  @typedef {import('highlight.js').HighlightOptions} HighlightOptions
  @typedef {import('highlight.js').HighlightResult} HighlightResult
  */


  const escape = escapeHTML;
  const inherit = inherit$1;
  const NO_MATCH = Symbol("nomatch");
  const MAX_KEYWORD_HITS = 7;

  /**
   * @param {any} hljs - object that is extended (legacy)
   * @returns {HLJSApi}
   */
  const HLJS = function(hljs) {
    // Global internal variables used within the highlight.js library.
    /** @type {Record<string, Language>} */
    const languages = Object.create(null);
    /** @type {Record<string, string>} */
    const aliases = Object.create(null);
    /** @type {HLJSPlugin[]} */
    const plugins = [];

    // safe/production mode - swallows more errors, tries to keep running
    // even if a single syntax or parse hits a fatal error
    let SAFE_MODE = true;
    const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
    /** @type {Language} */
    const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text', contains: [] };

    // Global options used when within external APIs. This is modified when
    // calling the `hljs.configure` function.
    /** @type HLJSOptions */
    let options = {
      ignoreUnescapedHTML: false,
      throwUnescapedHTML: false,
      noHighlightRe: /^(no-?highlight)$/i,
      languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
      classPrefix: 'hljs-',
      cssSelector: 'pre code',
      languages: null,
      // beta configuration options, subject to change, welcome to discuss
      // https://github.com/highlightjs/highlight.js/issues/1086
      __emitter: TokenTreeEmitter
    };

    /* Utility functions */

    /**
     * Tests a language name to see if highlighting should be skipped
     * @param {string} languageName
     */
    function shouldNotHighlight(languageName) {
      return options.noHighlightRe.test(languageName);
    }

    /**
     * @param {HighlightedHTMLElement} block - the HTML element to determine language for
     */
    function blockLanguage(block) {
      let classes = block.className + ' ';

      classes += block.parentNode ? block.parentNode.className : '';

      // language-* takes precedence over non-prefixed class names.
      const match = options.languageDetectRe.exec(classes);
      if (match) {
        const language = getLanguage(match[1]);
        if (!language) {
          warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
          warn("Falling back to no-highlight mode for this block.", block);
        }
        return language ? match[1] : 'no-highlight';
      }

      return classes
        .split(/\s+/)
        .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
    }

    /**
     * Core highlighting function.
     *
     * OLD API
     * highlight(lang, code, ignoreIllegals, continuation)
     *
     * NEW API
     * highlight(code, {lang, ignoreIllegals})
     *
     * @param {string} codeOrLanguageName - the language to use for highlighting
     * @param {string | HighlightOptions} optionsOrCode - the code to highlight
     * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     *
     * @returns {HighlightResult} Result - an object that represents the result
     * @property {string} language - the language name
     * @property {number} relevance - the relevance score
     * @property {string} value - the highlighted HTML code
     * @property {string} code - the original raw code
     * @property {CompiledMode} top - top of the current mode stack
     * @property {boolean} illegal - indicates whether any illegal matches were found
    */
    function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
      let code = "";
      let languageName = "";
      if (typeof optionsOrCode === "object") {
        code = codeOrLanguageName;
        ignoreIllegals = optionsOrCode.ignoreIllegals;
        languageName = optionsOrCode.language;
      } else {
        // old API
        deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
        deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
        languageName = codeOrLanguageName;
        code = optionsOrCode;
      }

      // https://github.com/highlightjs/highlight.js/issues/3149
      // eslint-disable-next-line no-undefined
      if (ignoreIllegals === undefined) { ignoreIllegals = true; }

      /** @type {BeforeHighlightContext} */
      const context = {
        code,
        language: languageName
      };
      // the plugin can change the desired language or the code to be highlighted
      // just be changing the object it was passed
      fire("before:highlight", context);

      // a before plugin can usurp the result completely by providing it's own
      // in which case we don't even need to call highlight
      const result = context.result
        ? context.result
        : _highlight(context.language, context.code, ignoreIllegals);

      result.code = context.code;
      // the plugin can change anything in result to suite it
      fire("after:highlight", result);

      return result;
    }

    /**
     * private highlight that's used internally and does not fire callbacks
     *
     * @param {string} languageName - the language to use for highlighting
     * @param {string} codeToHighlight - the code to highlight
     * @param {boolean?} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     * @param {CompiledMode?} [continuation] - current continuation mode, if any
     * @returns {HighlightResult} - result of the highlight operation
    */
    function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
      const keywordHits = Object.create(null);

      /**
       * Return keyword data if a match is a keyword
       * @param {CompiledMode} mode - current mode
       * @param {string} matchText - the textual match
       * @returns {KeywordData | false}
       */
      function keywordData(mode, matchText) {
        return mode.keywords[matchText];
      }

      function processKeywords() {
        if (!top.keywords) {
          emitter.addText(modeBuffer);
          return;
        }

        let lastIndex = 0;
        top.keywordPatternRe.lastIndex = 0;
        let match = top.keywordPatternRe.exec(modeBuffer);
        let buf = "";

        while (match) {
          buf += modeBuffer.substring(lastIndex, match.index);
          const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
          const data = keywordData(top, word);
          if (data) {
            const [kind, keywordRelevance] = data;
            emitter.addText(buf);
            buf = "";

            keywordHits[word] = (keywordHits[word] || 0) + 1;
            if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
            if (kind.startsWith("_")) {
              // _ implied for relevance only, do not highlight
              // by applying a class name
              buf += match[0];
            } else {
              const cssClass = language.classNameAliases[kind] || kind;
              emitter.addKeyword(match[0], cssClass);
            }
          } else {
            buf += match[0];
          }
          lastIndex = top.keywordPatternRe.lastIndex;
          match = top.keywordPatternRe.exec(modeBuffer);
        }
        buf += modeBuffer.substring(lastIndex);
        emitter.addText(buf);
      }

      function processSubLanguage() {
        if (modeBuffer === "") return;
        /** @type HighlightResult */
        let result = null;

        if (typeof top.subLanguage === 'string') {
          if (!languages[top.subLanguage]) {
            emitter.addText(modeBuffer);
            return;
          }
          result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
          continuations[top.subLanguage] = /** @type {CompiledMode} */ (result._top);
        } else {
          result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
        }

        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Use case in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if (top.relevance > 0) {
          relevance += result.relevance;
        }
        emitter.addSublanguage(result._emitter, result.language);
      }

      function processBuffer() {
        if (top.subLanguage != null) {
          processSubLanguage();
        } else {
          processKeywords();
        }
        modeBuffer = '';
      }

      /**
       * @param {CompiledScope} scope
       * @param {RegExpMatchArray} match
       */
      function emitMultiClass(scope, match) {
        let i = 1;
        const max = match.length - 1;
        while (i <= max) {
          if (!scope._emit[i]) { i++; continue; }
          const klass = language.classNameAliases[scope[i]] || scope[i];
          const text = match[i];
          if (klass) {
            emitter.addKeyword(text, klass);
          } else {
            modeBuffer = text;
            processKeywords();
            modeBuffer = "";
          }
          i++;
        }
      }

      /**
       * @param {CompiledMode} mode - new mode to start
       * @param {RegExpMatchArray} match
       */
      function startNewMode(mode, match) {
        if (mode.scope && typeof mode.scope === "string") {
          emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
        }
        if (mode.beginScope) {
          // beginScope just wraps the begin match itself in a scope
          if (mode.beginScope._wrap) {
            emitter.addKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
            modeBuffer = "";
          } else if (mode.beginScope._multi) {
            // at this point modeBuffer should just be the match
            emitMultiClass(mode.beginScope, match);
            modeBuffer = "";
          }
        }

        top = Object.create(mode, { parent: { value: top } });
        return top;
      }

      /**
       * @param {CompiledMode } mode - the mode to potentially end
       * @param {RegExpMatchArray} match - the latest match
       * @param {string} matchPlusRemainder - match plus remainder of content
       * @returns {CompiledMode | void} - the next mode, or if void continue on in current mode
       */
      function endOfMode(mode, match, matchPlusRemainder) {
        let matched = startsWith(mode.endRe, matchPlusRemainder);

        if (matched) {
          if (mode["on:end"]) {
            const resp = new Response(mode);
            mode["on:end"](match, resp);
            if (resp.isMatchIgnored) matched = false;
          }

          if (matched) {
            while (mode.endsParent && mode.parent) {
              mode = mode.parent;
            }
            return mode;
          }
        }
        // even if on:end fires an `ignore` it's still possible
        // that we might trigger the end node because of a parent mode
        if (mode.endsWithParent) {
          return endOfMode(mode.parent, match, matchPlusRemainder);
        }
      }

      /**
       * Handle matching but then ignoring a sequence of text
       *
       * @param {string} lexeme - string containing full match text
       */
      function doIgnore(lexeme) {
        if (top.matcher.regexIndex === 0) {
          // no more regexes to potentially match here, so we move the cursor forward one
          // space
          modeBuffer += lexeme[0];
          return 1;
        } else {
          // no need to move the cursor, we still have additional regexes to try and
          // match at this very spot
          resumeScanAtSamePosition = true;
          return 0;
        }
      }

      /**
       * Handle the start of a new potential mode match
       *
       * @param {EnhancedMatch} match - the current match
       * @returns {number} how far to advance the parse cursor
       */
      function doBeginMatch(match) {
        const lexeme = match[0];
        const newMode = match.rule;

        const resp = new Response(newMode);
        // first internal before callbacks, then the public ones
        const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
        for (const cb of beforeCallbacks) {
          if (!cb) continue;
          cb(match, resp);
          if (resp.isMatchIgnored) return doIgnore(lexeme);
        }

        if (newMode.skip) {
          modeBuffer += lexeme;
        } else {
          if (newMode.excludeBegin) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (!newMode.returnBegin && !newMode.excludeBegin) {
            modeBuffer = lexeme;
          }
        }
        startNewMode(newMode, match);
        return newMode.returnBegin ? 0 : lexeme.length;
      }

      /**
       * Handle the potential end of mode
       *
       * @param {RegExpMatchArray} match - the current match
       */
      function doEndMatch(match) {
        const lexeme = match[0];
        const matchPlusRemainder = codeToHighlight.substring(match.index);

        const endMode = endOfMode(top, match, matchPlusRemainder);
        if (!endMode) { return NO_MATCH; }

        const origin = top;
        if (top.endScope && top.endScope._wrap) {
          processBuffer();
          emitter.addKeyword(lexeme, top.endScope._wrap);
        } else if (top.endScope && top.endScope._multi) {
          processBuffer();
          emitMultiClass(top.endScope, match);
        } else if (origin.skip) {
          modeBuffer += lexeme;
        } else {
          if (!(origin.returnEnd || origin.excludeEnd)) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (origin.excludeEnd) {
            modeBuffer = lexeme;
          }
        }
        do {
          if (top.scope) {
            emitter.closeNode();
          }
          if (!top.skip && !top.subLanguage) {
            relevance += top.relevance;
          }
          top = top.parent;
        } while (top !== endMode.parent);
        if (endMode.starts) {
          startNewMode(endMode.starts, match);
        }
        return origin.returnEnd ? 0 : lexeme.length;
      }

      function processContinuations() {
        const list = [];
        for (let current = top; current !== language; current = current.parent) {
          if (current.scope) {
            list.unshift(current.scope);
          }
        }
        list.forEach(item => emitter.openNode(item));
      }

      /** @type {{type?: MatchType, index?: number, rule?: Mode}}} */
      let lastMatch = {};

      /**
       *  Process an individual match
       *
       * @param {string} textBeforeMatch - text preceding the match (since the last match)
       * @param {EnhancedMatch} [match] - the match itself
       */
      function processLexeme(textBeforeMatch, match) {
        const lexeme = match && match[0];

        // add non-matched text to the current mode buffer
        modeBuffer += textBeforeMatch;

        if (lexeme == null) {
          processBuffer();
          return 0;
        }

        // we've found a 0 width match and we're stuck, so we need to advance
        // this happens when we have badly behaved rules that have optional matchers to the degree that
        // sometimes they can end up matching nothing at all
        // Ref: https://github.com/highlightjs/highlight.js/issues/2140
        if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
          // spit the "skipped" character that our regex choked on back into the output sequence
          modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
          if (!SAFE_MODE) {
            /** @type {AnnotatedError} */
            const err = new Error(`0 width match regex (${languageName})`);
            err.languageName = languageName;
            err.badRule = lastMatch.rule;
            throw err;
          }
          return 1;
        }
        lastMatch = match;

        if (match.type === "begin") {
          return doBeginMatch(match);
        } else if (match.type === "illegal" && !ignoreIllegals) {
          // illegal match, we do not continue processing
          /** @type {AnnotatedError} */
          const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || '<unnamed>') + '"');
          err.mode = top;
          throw err;
        } else if (match.type === "end") {
          const processed = doEndMatch(match);
          if (processed !== NO_MATCH) {
            return processed;
          }
        }

        // edge case for when illegal matches $ (end of line) which is technically
        // a 0 width match but not a begin/end match so it's not caught by the
        // first handler (when ignoreIllegals is true)
        if (match.type === "illegal" && lexeme === "") {
          // advance so we aren't stuck in an infinite loop
          return 1;
        }

        // infinite loops are BAD, this is a last ditch catch all. if we have a
        // decent number of iterations yet our index (cursor position in our
        // parsing) still 3x behind our index then something is very wrong
        // so we bail
        if (iterations > 100000 && iterations > match.index * 3) {
          const err = new Error('potential infinite loop, way more iterations than matches');
          throw err;
        }

        /*
        Why might be find ourselves here?  An potential end match that was
        triggered but could not be completed.  IE, `doEndMatch` returned NO_MATCH.
        (this could be because a callback requests the match be ignored, etc)

        This causes no real harm other than stopping a few times too many.
        */

        modeBuffer += lexeme;
        return lexeme.length;
      }

      const language = getLanguage(languageName);
      if (!language) {
        error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
        throw new Error('Unknown language: "' + languageName + '"');
      }

      const md = compileLanguage(language);
      let result = '';
      /** @type {CompiledMode} */
      let top = continuation || md;
      /** @type Record<string,CompiledMode> */
      const continuations = {}; // keep continuations for sub-languages
      const emitter = new options.__emitter(options);
      processContinuations();
      let modeBuffer = '';
      let relevance = 0;
      let index = 0;
      let iterations = 0;
      let resumeScanAtSamePosition = false;

      try {
        top.matcher.considerAll();

        for (;;) {
          iterations++;
          if (resumeScanAtSamePosition) {
            // only regexes not matched previously will now be
            // considered for a potential match
            resumeScanAtSamePosition = false;
          } else {
            top.matcher.considerAll();
          }
          top.matcher.lastIndex = index;

          const match = top.matcher.exec(codeToHighlight);
          // console.log("match", match[0], match.rule && match.rule.begin)

          if (!match) break;

          const beforeMatch = codeToHighlight.substring(index, match.index);
          const processedCount = processLexeme(beforeMatch, match);
          index = match.index + processedCount;
        }
        processLexeme(codeToHighlight.substring(index));
        emitter.closeAllNodes();
        emitter.finalize();
        result = emitter.toHTML();

        return {
          language: languageName,
          value: result,
          relevance: relevance,
          illegal: false,
          _emitter: emitter,
          _top: top
        };
      } catch (err) {
        if (err.message && err.message.includes('Illegal')) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: true,
            relevance: 0,
            _illegalBy: {
              message: err.message,
              index: index,
              context: codeToHighlight.slice(index - 100, index + 100),
              mode: err.mode,
              resultSoFar: result
            },
            _emitter: emitter
          };
        } else if (SAFE_MODE) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: false,
            relevance: 0,
            errorRaised: err,
            _emitter: emitter,
            _top: top
          };
        } else {
          throw err;
        }
      }
    }

    /**
     * returns a valid highlight result, without actually doing any actual work,
     * auto highlight starts with this and it's possible for small snippets that
     * auto-detection may not find a better match
     * @param {string} code
     * @returns {HighlightResult}
     */
    function justTextHighlightResult(code) {
      const result = {
        value: escape(code),
        illegal: false,
        relevance: 0,
        _top: PLAINTEXT_LANGUAGE,
        _emitter: new options.__emitter(options)
      };
      result._emitter.addText(code);
      return result;
    }

    /**
    Highlighting with language detection. Accepts a string with the code to
    highlight. Returns an object with the following properties:

    - language (detected language)
    - relevance (int)
    - value (an HTML string with highlighting markup)
    - secondBest (object with the same structure for second-best heuristically
      detected language, may be absent)

      @param {string} code
      @param {Array<string>} [languageSubset]
      @returns {AutoHighlightResult}
    */
    function highlightAuto(code, languageSubset) {
      languageSubset = languageSubset || options.languages || Object.keys(languages);
      const plaintext = justTextHighlightResult(code);

      const results = languageSubset.filter(getLanguage).filter(autoDetection).map(name =>
        _highlight(name, code, false)
      );
      results.unshift(plaintext); // plaintext is always an option

      const sorted = results.sort((a, b) => {
        // sort base on relevance
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;

        // always award the tie to the base language
        // ie if C++ and Arduino are tied, it's more likely to be C++
        if (a.language && b.language) {
          if (getLanguage(a.language).supersetOf === b.language) {
            return 1;
          } else if (getLanguage(b.language).supersetOf === a.language) {
            return -1;
          }
        }

        // otherwise say they are equal, which has the effect of sorting on
        // relevance while preserving the original ordering - which is how ties
        // have historically been settled, ie the language that comes first always
        // wins in the case of a tie
        return 0;
      });

      const [best, secondBest] = sorted;

      /** @type {AutoHighlightResult} */
      const result = best;
      result.secondBest = secondBest;

      return result;
    }

    /**
     * Builds new class name for block given the language name
     *
     * @param {HTMLElement} element
     * @param {string} [currentLang]
     * @param {string} [resultLang]
     */
    function updateClassName(element, currentLang, resultLang) {
      const language = (currentLang && aliases[currentLang]) || resultLang;

      element.classList.add("hljs");
      element.classList.add(`language-${language}`);
    }

    /**
     * Applies highlighting to a DOM node containing code.
     *
     * @param {HighlightedHTMLElement} element - the HTML element to highlight
    */
    function highlightElement(element) {
      /** @type HTMLElement */
      let node = null;
      const language = blockLanguage(element);

      if (shouldNotHighlight(language)) return;

      fire("before:highlightElement",
        { el: element, language: language });

      // we should be all text, no child nodes (unescaped HTML) - this is possibly
      // an HTML injection attack - it's likely too late if this is already in
      // production (the code has likely already done its damage by the time
      // we're seeing it)... but we yell loudly about this so that hopefully it's
      // more likely to be caught in development before making it to production
      if (element.children.length > 0) {
        if (!options.ignoreUnescapedHTML) {
          console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
          console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
          console.warn("The element with unescaped HTML:");
          console.warn(element);
        }
        if (options.throwUnescapedHTML) {
          const err = new HTMLInjectionError(
            "One of your code blocks includes unescaped HTML.",
            element.innerHTML
          );
          throw err;
        }
      }

      node = element;
      const text = node.textContent;
      const result = language ? highlight(text, { language, ignoreIllegals: true }) : highlightAuto(text);

      element.innerHTML = result.value;
      updateClassName(element, language, result.language);
      element.result = {
        language: result.language,
        // TODO: remove with version 11.0
        re: result.relevance,
        relevance: result.relevance
      };
      if (result.secondBest) {
        element.secondBest = {
          language: result.secondBest.language,
          relevance: result.secondBest.relevance
        };
      }

      fire("after:highlightElement", { el: element, result, text });
    }

    /**
     * Updates highlight.js global options with the passed options
     *
     * @param {Partial<HLJSOptions>} userOptions
     */
    function configure(userOptions) {
      options = inherit(options, userOptions);
    }

    // TODO: remove v12, deprecated
    const initHighlighting = () => {
      highlightAll();
      deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
    };

    // TODO: remove v12, deprecated
    function initHighlightingOnLoad() {
      highlightAll();
      deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
    }

    let wantsHighlight = false;

    /**
     * auto-highlights all pre>code elements on the page
     */
    function highlightAll() {
      // if we are called too early in the loading process
      if (document.readyState === "loading") {
        wantsHighlight = true;
        return;
      }

      const blocks = document.querySelectorAll(options.cssSelector);
      blocks.forEach(highlightElement);
    }

    function boot() {
      // if a highlight was requested before DOM was loaded, do now
      if (wantsHighlight) highlightAll();
    }

    // make sure we are in the browser environment
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('DOMContentLoaded', boot, false);
    }

    /**
     * Register a language grammar module
     *
     * @param {string} languageName
     * @param {LanguageFn} languageDefinition
     */
    function registerLanguage(languageName, languageDefinition) {
      let lang = null;
      try {
        lang = languageDefinition(hljs);
      } catch (error$1) {
        error("Language definition for '{}' could not be registered.".replace("{}", languageName));
        // hard or soft error
        if (!SAFE_MODE) { throw error$1; } else { error(error$1); }
        // languages that have serious errors are replaced with essentially a
        // "plaintext" stand-in so that the code blocks will still get normal
        // css classes applied to them - and one bad language won't break the
        // entire highlighter
        lang = PLAINTEXT_LANGUAGE;
      }
      // give it a temporary name if it doesn't have one in the meta-data
      if (!lang.name) lang.name = languageName;
      languages[languageName] = lang;
      lang.rawDefinition = languageDefinition.bind(null, hljs);

      if (lang.aliases) {
        registerAliases(lang.aliases, { languageName });
      }
    }

    /**
     * Remove a language grammar module
     *
     * @param {string} languageName
     */
    function unregisterLanguage(languageName) {
      delete languages[languageName];
      for (const alias of Object.keys(aliases)) {
        if (aliases[alias] === languageName) {
          delete aliases[alias];
        }
      }
    }

    /**
     * @returns {string[]} List of language internal names
     */
    function listLanguages() {
      return Object.keys(languages);
    }

    /**
     * @param {string} name - name of the language to retrieve
     * @returns {Language | undefined}
     */
    function getLanguage(name) {
      name = (name || '').toLowerCase();
      return languages[name] || languages[aliases[name]];
    }

    /**
     *
     * @param {string|string[]} aliasList - single alias or list of aliases
     * @param {{languageName: string}} opts
     */
    function registerAliases(aliasList, { languageName }) {
      if (typeof aliasList === 'string') {
        aliasList = [aliasList];
      }
      aliasList.forEach(alias => { aliases[alias.toLowerCase()] = languageName; });
    }

    /**
     * Determines if a given language has auto-detection enabled
     * @param {string} name - name of the language
     */
    function autoDetection(name) {
      const lang = getLanguage(name);
      return lang && !lang.disableAutodetect;
    }

    /**
     * Upgrades the old highlightBlock plugins to the new
     * highlightElement API
     * @param {HLJSPlugin} plugin
     */
    function upgradePluginAPI(plugin) {
      // TODO: remove with v12
      if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
        plugin["before:highlightElement"] = (data) => {
          plugin["before:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
      if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
        plugin["after:highlightElement"] = (data) => {
          plugin["after:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function addPlugin(plugin) {
      upgradePluginAPI(plugin);
      plugins.push(plugin);
    }

    /**
     *
     * @param {PluginEvent} event
     * @param {any} args
     */
    function fire(event, args) {
      const cb = event;
      plugins.forEach(function(plugin) {
        if (plugin[cb]) {
          plugin[cb](args);
        }
      });
    }

    /**
     * DEPRECATED
     * @param {HighlightedHTMLElement} el
     */
    function deprecateHighlightBlock(el) {
      deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
      deprecated("10.7.0", "Please use highlightElement now.");

      return highlightElement(el);
    }

    /* Interface definition */
    Object.assign(hljs, {
      highlight,
      highlightAuto,
      highlightAll,
      highlightElement,
      // TODO: Remove with v12 API
      highlightBlock: deprecateHighlightBlock,
      configure,
      initHighlighting,
      initHighlightingOnLoad,
      registerLanguage,
      unregisterLanguage,
      listLanguages,
      getLanguage,
      registerAliases,
      autoDetection,
      inherit,
      addPlugin
    });

    hljs.debugMode = function() { SAFE_MODE = false; };
    hljs.safeMode = function() { SAFE_MODE = true; };
    hljs.versionString = version;

    hljs.regex = {
      concat: concat,
      lookahead: lookahead,
      either: either,
      optional: optional,
      anyNumberOfTimes: anyNumberOfTimes
    };

    for (const key in MODES$1) {
      // @ts-ignore
      if (typeof MODES$1[key] === "object") {
        // @ts-ignore
        deepFreezeEs6.exports(MODES$1[key]);
      }
    }

    // merge all the modes/regexes into our main object
    Object.assign(hljs, MODES$1);

    return hljs;
  };

  // export an "instance" of the highlighter
  var highlight = HLJS({});

  var core = highlight;
  highlight.HighlightJS = highlight;
  highlight.default = highlight;

  var HighlightJS = core;

  const IDENT_RE$1 = '[A-Za-z$_][0-9A-Za-z$_]*';
  const KEYWORDS$1 = [
    "as", // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  const LITERALS$1 = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
  const TYPES$1 = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];

  const ERROR_TYPES$1 = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];

  const BUILT_IN_GLOBALS$1 = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",

    "require",
    "exports",

    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];

  const BUILT_IN_VARIABLES$1 = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "module",
    "global" // Node.js
  ];

  const BUILT_INS$1 = [].concat(
    BUILT_IN_GLOBALS$1,
    TYPES$1,
    ERROR_TYPES$1
  );

  /*
  Language: JavaScript
  Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
  Category: common, scripting, web
  Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
  */

  /** @type LanguageFn */
  function javascript$1(hljs) {
    const regex = hljs.regex;
    /**
     * Takes a string like "<Booger" and checks to see
     * if we can find a matching "</Booger" later in the
     * content.
     * @param {RegExpMatchArray} match
     * @param {{after:number}} param1
     */
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };

    const IDENT_RE$1$1 = IDENT_RE$1;
    const FRAGMENT = {
      begin: '<>',
      end: '</>'
    };
    // to avoid some special cases inside isTrulyOpeningTag
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
          ) {
          response.ignoreMatch();
          return;
        }

        // `<something>`
        // Quite possibly a tag, lets look for a matching closing tag...
        if (nextChar === ">") {
          // if we cannot find a matching closing tag, then we
          // will ignore it
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }

        // `<blah />` (self-closing)
        // handled by simpleSelfClosing rule

        let m;
        const afterMatch = match.input.substring(afterMatchIndex);

        // some more template typing stuff
        //  <T = any>(key?: string) => Modify<
        if ((m = afterMatch.match(/^\s*=/))) {
          response.ignoreMatch();
          return;
        }

        // `<From extends string>`
        // technically this could be HTML, but it smells like a type
        // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
        if ((m = afterMatch.match(/^\s+extends\s+/))) {
          if (m.index === 0) {
            response.ignoreMatch();
            // eslint-disable-next-line no-useless-return
            return;
          }
        }
      }
    };
    const KEYWORDS$1$1 = {
      $pattern: IDENT_RE$1,
      keyword: KEYWORDS$1,
      literal: LITERALS$1,
      built_in: BUILT_INS$1,
      "variable.language": BUILT_IN_VARIABLES$1
    };

    // https://tc39.es/ecma262/#sec-literals-numeric-literals
    const decimalDigits = '[0-9](_?[0-9])*';
    const frac = `\\.(${decimalDigits})`;
    // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
    // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: 'number',
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
          `[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },

        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },

        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },

        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" },
      ],
      relevance: 0
    };

    const SUBST = {
      className: 'subst',
      begin: '\\$\\{',
      end: '\\}',
      keywords: KEYWORDS$1$1,
      contains: [] // defined later
    };
    const HTML_TEMPLATE = {
      begin: 'html`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'xml'
      }
    };
    const CSS_TEMPLATE = {
      begin: 'css`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'css'
      }
    };
    const TEMPLATE_STRING = {
      className: 'string',
      begin: '`',
      end: '`',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      '\\*/',
      {
        relevance: 0,
        contains: [
          {
            begin: '(?=@[A-Za-z]+)',
            relevance: 0,
            contains: [
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              },
              {
                className: 'type',
                begin: '\\{',
                end: '\\}',
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: 'variable',
                begin: IDENT_RE$1$1 + '(?=\\s*(-)|$)',
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS
      .concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1$1,
        contains: [
          "self"
        ].concat(SUBST_INTERNALS)
      });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: 'params',
      begin: /\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1$1,
      contains: PARAMS_CONTAINS
    };

    // ES6 classes
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1$1, "(", regex.concat(/\./, IDENT_RE$1$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        },

      ]
    };

    const CLASS_REFERENCE = {
      relevance: 0,
      match:
      regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES$1,
          ...ERROR_TYPES$1
        ]
      }
    };

    const USE_STRICT = {
      label: "use_strict",
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };

    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [ PARAMS ],
      illegal: /%/
    };

    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };

    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }

    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS$1,
          "super",
          "import"
        ]),
        IDENT_RE$1$1, regex.lookahead(/\(/)),
      className: "title.function",
      relevance: 0
    };

    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };

    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        { // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };

    const FUNC_LEAD_IN_RE = '(\\(' +
      '[^()]*(\\(' +
      '[^()]*(\\(' +
      '[^()]*' +
      '\\)[^()]*)*' +
      '\\)[^()]*)*' +
      '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';

    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/, /\s+/,
        IDENT_RE$1$1, /\s*/,
        /=\s*/,
        /(async\s*)?/, // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };

    return {
      name: 'Javascript',
      aliases: ['js', 'jsx', 'mjs', 'cjs'],
      keywords: KEYWORDS$1$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: 'attr',
          begin: IDENT_RE$1$1 + regex.lookahead(':'),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        { // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: 'function',
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: '\\s*=>',
              contains: [
                {
                  className: 'params',
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            { // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            { // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  'on:begin': XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: 'xml',
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ['self']
                }
              ]
            }
          ],
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
            '\\(' + // first parens
            '[^()]*(\\(' +
              '[^()]*(\\(' +
                '[^()]*' +
              '\\)[^()]*)*' +
            '\\)[^()]*)*' +
            '\\)\\s*\\{', // end parens
          returnBegin:true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1$1,
          relevance: 0
        },
        {
          match: [ /\bconstructor(?=\s*\()/ ],
          className: { 1: "title.function" },
          contains: [ PARAMS ]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }

  /*
  Language: JSON
  Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: http://www.json.org
  Category: common, protocols, web
  */

  function json(hljs) {
    const ATTRIBUTE = {
      className: 'attr',
      begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
      relevance: 1.01
    };
    const PUNCTUATION = {
      match: /[{}[\],:]/,
      className: "punctuation",
      relevance: 0
    };
    const LITERALS = [
      "true",
      "false",
      "null"
    ];
    // NOTE: normally we would rely on `keywords` for this but using a mode here allows us
    // - to use the very tight `illegal: \S` rule later to flag any other character
    // - as illegal indicating that despite looking like JSON we do not truly have
    // - JSON and thus improve false-positively greatly since JSON will try and claim
    // - all sorts of JSON looking stuff
    const LITERALS_MODE = {
      scope: "literal",
      beginKeywords: LITERALS.join(" "),
    };

    return {
      name: 'JSON',
      keywords:{
        literal: LITERALS,
      },
      contains: [
        ATTRIBUTE,
        PUNCTUATION,
        hljs.QUOTE_STRING_MODE,
        LITERALS_MODE,
        hljs.C_NUMBER_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ],
      illegal: '\\S'
    };
  }

  const MODES = (hljs) => {
    return {
      IMPORTANT: {
        scope: 'meta',
        begin: '!important'
      },
      BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
      HEXCOLOR: {
        scope: 'number',
        begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
      },
      FUNCTION_DISPATCH: {
        className: "built_in",
        begin: /[\w-]+(?=\()/
      },
      ATTRIBUTE_SELECTOR_MODE: {
        scope: 'selector-attr',
        begin: /\[/,
        end: /\]/,
        illegal: '$',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      },
      CSS_NUMBER_MODE: {
        scope: 'number',
        begin: hljs.NUMBER_RE + '(' +
          '%|em|ex|ch|rem' +
          '|vw|vh|vmin|vmax' +
          '|cm|mm|in|pt|pc|px' +
          '|deg|grad|rad|turn' +
          '|s|ms' +
          '|Hz|kHz' +
          '|dpi|dpcm|dppx' +
          ')?',
        relevance: 0
      },
      CSS_VARIABLE: {
        className: "attr",
        begin: /--[A-Za-z][A-Za-z0-9_-]*/
      }
    };
  };

  const TAGS = [
    'a',
    'abbr',
    'address',
    'article',
    'aside',
    'audio',
    'b',
    'blockquote',
    'body',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'html',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'mark',
    'menu',
    'nav',
    'object',
    'ol',
    'p',
    'q',
    'quote',
    'samp',
    'section',
    'span',
    'strong',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'ul',
    'var',
    'video'
  ];

  const MEDIA_FEATURES = [
    'any-hover',
    'any-pointer',
    'aspect-ratio',
    'color',
    'color-gamut',
    'color-index',
    'device-aspect-ratio',
    'device-height',
    'device-width',
    'display-mode',
    'forced-colors',
    'grid',
    'height',
    'hover',
    'inverted-colors',
    'monochrome',
    'orientation',
    'overflow-block',
    'overflow-inline',
    'pointer',
    'prefers-color-scheme',
    'prefers-contrast',
    'prefers-reduced-motion',
    'prefers-reduced-transparency',
    'resolution',
    'scan',
    'scripting',
    'update',
    'width',
    // TODO: find a better solution?
    'min-width',
    'max-width',
    'min-height',
    'max-height'
  ];

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
  const PSEUDO_CLASSES = [
    'active',
    'any-link',
    'blank',
    'checked',
    'current',
    'default',
    'defined',
    'dir', // dir()
    'disabled',
    'drop',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'future',
    'focus',
    'focus-visible',
    'focus-within',
    'has', // has()
    'host', // host or host()
    'host-context', // host-context()
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'is', // is()
    'lang', // lang()
    'last-child',
    'last-of-type',
    'left',
    'link',
    'local-link',
    'not', // not()
    'nth-child', // nth-child()
    'nth-col', // nth-col()
    'nth-last-child', // nth-last-child()
    'nth-last-col', // nth-last-col()
    'nth-last-of-type', //nth-last-of-type()
    'nth-of-type', //nth-of-type()
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'past',
    'placeholder-shown',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'target-within',
    'user-invalid',
    'valid',
    'visited',
    'where' // where()
  ];

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
  const PSEUDO_ELEMENTS = [
    'after',
    'backdrop',
    'before',
    'cue',
    'cue-region',
    'first-letter',
    'first-line',
    'grammar-error',
    'marker',
    'part',
    'placeholder',
    'selection',
    'slotted',
    'spelling-error'
  ];

  const ATTRIBUTES = [
    'align-content',
    'align-items',
    'align-self',
    'all',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
    'backface-visibility',
    'background',
    'background-attachment',
    'background-blend-mode',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'block-size',
    'border',
    'border-block',
    'border-block-color',
    'border-block-end',
    'border-block-end-color',
    'border-block-end-style',
    'border-block-end-width',
    'border-block-start',
    'border-block-start-color',
    'border-block-start-style',
    'border-block-start-width',
    'border-block-style',
    'border-block-width',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-inline',
    'border-inline-color',
    'border-inline-end',
    'border-inline-end-color',
    'border-inline-end-style',
    'border-inline-end-width',
    'border-inline-start',
    'border-inline-start-color',
    'border-inline-start-style',
    'border-inline-start-width',
    'border-inline-style',
    'border-inline-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-top-style',
    'border-top-width',
    'border-width',
    'bottom',
    'box-decoration-break',
    'box-shadow',
    'box-sizing',
    'break-after',
    'break-before',
    'break-inside',
    'caption-side',
    'caret-color',
    'clear',
    'clip',
    'clip-path',
    'clip-rule',
    'color',
    'column-count',
    'column-fill',
    'column-gap',
    'column-rule',
    'column-rule-color',
    'column-rule-style',
    'column-rule-width',
    'column-span',
    'column-width',
    'columns',
    'contain',
    'content',
    'content-visibility',
    'counter-increment',
    'counter-reset',
    'cue',
    'cue-after',
    'cue-before',
    'cursor',
    'direction',
    'display',
    'empty-cells',
    'filter',
    'flex',
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
    'float',
    'flow',
    'font',
    'font-display',
    'font-family',
    'font-feature-settings',
    'font-kerning',
    'font-language-override',
    'font-size',
    'font-size-adjust',
    'font-smoothing',
    'font-stretch',
    'font-style',
    'font-synthesis',
    'font-variant',
    'font-variant-caps',
    'font-variant-east-asian',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-variant-position',
    'font-variation-settings',
    'font-weight',
    'gap',
    'glyph-orientation-vertical',
    'grid',
    'grid-area',
    'grid-auto-columns',
    'grid-auto-flow',
    'grid-auto-rows',
    'grid-column',
    'grid-column-end',
    'grid-column-start',
    'grid-gap',
    'grid-row',
    'grid-row-end',
    'grid-row-start',
    'grid-template',
    'grid-template-areas',
    'grid-template-columns',
    'grid-template-rows',
    'hanging-punctuation',
    'height',
    'hyphens',
    'icon',
    'image-orientation',
    'image-rendering',
    'image-resolution',
    'ime-mode',
    'inline-size',
    'isolation',
    'justify-content',
    'left',
    'letter-spacing',
    'line-break',
    'line-height',
    'list-style',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'margin',
    'margin-block',
    'margin-block-end',
    'margin-block-start',
    'margin-bottom',
    'margin-inline',
    'margin-inline-end',
    'margin-inline-start',
    'margin-left',
    'margin-right',
    'margin-top',
    'marks',
    'mask',
    'mask-border',
    'mask-border-mode',
    'mask-border-outset',
    'mask-border-repeat',
    'mask-border-slice',
    'mask-border-source',
    'mask-border-width',
    'mask-clip',
    'mask-composite',
    'mask-image',
    'mask-mode',
    'mask-origin',
    'mask-position',
    'mask-repeat',
    'mask-size',
    'mask-type',
    'max-block-size',
    'max-height',
    'max-inline-size',
    'max-width',
    'min-block-size',
    'min-height',
    'min-inline-size',
    'min-width',
    'mix-blend-mode',
    'nav-down',
    'nav-index',
    'nav-left',
    'nav-right',
    'nav-up',
    'none',
    'normal',
    'object-fit',
    'object-position',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outline-color',
    'outline-offset',
    'outline-style',
    'outline-width',
    'overflow',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
    'padding',
    'padding-block',
    'padding-block-end',
    'padding-block-start',
    'padding-bottom',
    'padding-inline',
    'padding-inline-end',
    'padding-inline-start',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'pause',
    'pause-after',
    'pause-before',
    'perspective',
    'perspective-origin',
    'pointer-events',
    'position',
    'quotes',
    'resize',
    'rest',
    'rest-after',
    'rest-before',
    'right',
    'row-gap',
    'scroll-margin',
    'scroll-margin-block',
    'scroll-margin-block-end',
    'scroll-margin-block-start',
    'scroll-margin-bottom',
    'scroll-margin-inline',
    'scroll-margin-inline-end',
    'scroll-margin-inline-start',
    'scroll-margin-left',
    'scroll-margin-right',
    'scroll-margin-top',
    'scroll-padding',
    'scroll-padding-block',
    'scroll-padding-block-end',
    'scroll-padding-block-start',
    'scroll-padding-bottom',
    'scroll-padding-inline',
    'scroll-padding-inline-end',
    'scroll-padding-inline-start',
    'scroll-padding-left',
    'scroll-padding-right',
    'scroll-padding-top',
    'scroll-snap-align',
    'scroll-snap-stop',
    'scroll-snap-type',
    'scrollbar-color',
    'scrollbar-gutter',
    'scrollbar-width',
    'shape-image-threshold',
    'shape-margin',
    'shape-outside',
    'speak',
    'speak-as',
    'src', // @font-face
    'tab-size',
    'table-layout',
    'text-align',
    'text-align-all',
    'text-align-last',
    'text-combine-upright',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-style',
    'text-emphasis',
    'text-emphasis-color',
    'text-emphasis-position',
    'text-emphasis-style',
    'text-indent',
    'text-justify',
    'text-orientation',
    'text-overflow',
    'text-rendering',
    'text-shadow',
    'text-transform',
    'text-underline-position',
    'top',
    'transform',
    'transform-box',
    'transform-origin',
    'transform-style',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'unicode-bidi',
    'vertical-align',
    'visibility',
    'voice-balance',
    'voice-duration',
    'voice-family',
    'voice-pitch',
    'voice-range',
    'voice-rate',
    'voice-stress',
    'voice-volume',
    'white-space',
    'widows',
    'width',
    'will-change',
    'word-break',
    'word-spacing',
    'word-wrap',
    'writing-mode',
    'z-index'
    // reverse makes sure longer attributes `font-weight` are matched fully
    // instead of getting false positives on say `font`
  ].reverse();

  /*
  Language: CSS
  Category: common, css, web
  Website: https://developer.mozilla.org/en-US/docs/Web/CSS
  */

  /** @type LanguageFn */
  function css(hljs) {
    const regex = hljs.regex;
    const modes = MODES(hljs);
    const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
    const AT_MODIFIERS = "and or not only";
    const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/; // @-webkit-keyframes
    const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
    const STRINGS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ];

    return {
      name: 'CSS',
      case_insensitive: true,
      illegal: /[=|'\$]/,
      keywords: { keyframePosition: "from to" },
      classNameAliases: {
        // for visual continuity with `tag {}` and because we
        // don't have a great class for this?
        keyframePosition: "selector-tag" },
      contains: [
        modes.BLOCK_COMMENT,
        VENDOR_PREFIX,
        // to recognize keyframe 40% etc which are outside the scope of our
        // attribute value mode
        modes.CSS_NUMBER_MODE,
        {
          className: 'selector-id',
          begin: /#[A-Za-z0-9_-]+/,
          relevance: 0
        },
        {
          className: 'selector-class',
          begin: '\\.' + IDENT_RE,
          relevance: 0
        },
        modes.ATTRIBUTE_SELECTOR_MODE,
        {
          className: 'selector-pseudo',
          variants: [
            { begin: ':(' + PSEUDO_CLASSES.join('|') + ')' },
            { begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')' }
          ]
        },
        // we may actually need this (12/2020)
        // { // pseudo-selector params
        //   begin: /\(/,
        //   end: /\)/,
        //   contains: [ hljs.CSS_NUMBER_MODE ]
        // },
        modes.CSS_VARIABLE,
        {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
        },
        // attribute values
        {
          begin: /:/,
          end: /[;}{]/,
          contains: [
            modes.BLOCK_COMMENT,
            modes.HEXCOLOR,
            modes.IMPORTANT,
            modes.CSS_NUMBER_MODE,
            ...STRINGS,
            // needed to highlight these as strings and to avoid issues with
            // illegal characters that might be inside urls that would tigger the
            // languages illegal stack
            {
              begin: /(url|data-uri)\(/,
              end: /\)/,
              relevance: 0, // from keywords
              keywords: { built_in: "url data-uri" },
              contains: [
                ...STRINGS,
                {
                  className: "string",
                  // any character other than `)` as in `url()` will be the start
                  // of a string, which ends with `)` (from the parent mode)
                  begin: /[^)]/,
                  endsWithParent: true,
                  excludeEnd: true
                }
              ]
            },
            modes.FUNCTION_DISPATCH
          ]
        },
        {
          begin: regex.lookahead(/@/),
          end: '[{;]',
          relevance: 0,
          illegal: /:/, // break on Less variables @var: ...
          contains: [
            {
              className: 'keyword',
              begin: AT_PROPERTY_RE
            },
            {
              begin: /\s/,
              endsWithParent: true,
              excludeEnd: true,
              relevance: 0,
              keywords: {
                $pattern: /[a-z-]+/,
                keyword: AT_MODIFIERS,
                attribute: MEDIA_FEATURES.join(" ")
              },
              contains: [
                {
                  begin: /[a-z-]+(?=:)/,
                  className: "attribute"
                },
                ...STRINGS,
                modes.CSS_NUMBER_MODE
              ]
            }
          ]
        },
        {
          className: 'selector-tag',
          begin: '\\b(' + TAGS.join('|') + ')\\b'
        }
      ]
    };
  }

  const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  const KEYWORDS = [
    "as", // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  const LITERALS = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
  const TYPES = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];

  const ERROR_TYPES = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];

  const BUILT_IN_GLOBALS = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",

    "require",
    "exports",

    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];

  const BUILT_IN_VARIABLES = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "module",
    "global" // Node.js
  ];

  const BUILT_INS = [].concat(
    BUILT_IN_GLOBALS,
    TYPES,
    ERROR_TYPES
  );

  /*
  Language: JavaScript
  Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
  Category: common, scripting, web
  Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
  */

  /** @type LanguageFn */
  function javascript(hljs) {
    const regex = hljs.regex;
    /**
     * Takes a string like "<Booger" and checks to see
     * if we can find a matching "</Booger" later in the
     * content.
     * @param {RegExpMatchArray} match
     * @param {{after:number}} param1
     */
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };

    const IDENT_RE$1 = IDENT_RE;
    const FRAGMENT = {
      begin: '<>',
      end: '</>'
    };
    // to avoid some special cases inside isTrulyOpeningTag
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
          ) {
          response.ignoreMatch();
          return;
        }

        // `<something>`
        // Quite possibly a tag, lets look for a matching closing tag...
        if (nextChar === ">") {
          // if we cannot find a matching closing tag, then we
          // will ignore it
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }

        // `<blah />` (self-closing)
        // handled by simpleSelfClosing rule

        let m;
        const afterMatch = match.input.substring(afterMatchIndex);

        // some more template typing stuff
        //  <T = any>(key?: string) => Modify<
        if ((m = afterMatch.match(/^\s*=/))) {
          response.ignoreMatch();
          return;
        }

        // `<From extends string>`
        // technically this could be HTML, but it smells like a type
        // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
        if ((m = afterMatch.match(/^\s+extends\s+/))) {
          if (m.index === 0) {
            response.ignoreMatch();
            // eslint-disable-next-line no-useless-return
            return;
          }
        }
      }
    };
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_INS,
      "variable.language": BUILT_IN_VARIABLES
    };

    // https://tc39.es/ecma262/#sec-literals-numeric-literals
    const decimalDigits = '[0-9](_?[0-9])*';
    const frac = `\\.(${decimalDigits})`;
    // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
    // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: 'number',
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
          `[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },

        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },

        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },

        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" },
      ],
      relevance: 0
    };

    const SUBST = {
      className: 'subst',
      begin: '\\$\\{',
      end: '\\}',
      keywords: KEYWORDS$1,
      contains: [] // defined later
    };
    const HTML_TEMPLATE = {
      begin: 'html`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'xml'
      }
    };
    const CSS_TEMPLATE = {
      begin: 'css`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'css'
      }
    };
    const TEMPLATE_STRING = {
      className: 'string',
      begin: '`',
      end: '`',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      '\\*/',
      {
        relevance: 0,
        contains: [
          {
            begin: '(?=@[A-Za-z]+)',
            relevance: 0,
            contains: [
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              },
              {
                className: 'type',
                begin: '\\{',
                end: '\\}',
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: 'variable',
                begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS
      .concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1,
        contains: [
          "self"
        ].concat(SUBST_INTERNALS)
      });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: 'params',
      begin: /\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS
    };

    // ES6 classes
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        },

      ]
    };

    const CLASS_REFERENCE = {
      relevance: 0,
      match:
      regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES,
          ...ERROR_TYPES
        ]
      }
    };

    const USE_STRICT = {
      label: "use_strict",
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };

    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [ PARAMS ],
      illegal: /%/
    };

    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };

    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }

    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS,
          "super",
          "import"
        ]),
        IDENT_RE$1, regex.lookahead(/\(/)),
      className: "title.function",
      relevance: 0
    };

    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };

    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        { // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };

    const FUNC_LEAD_IN_RE = '(\\(' +
      '[^()]*(\\(' +
      '[^()]*(\\(' +
      '[^()]*' +
      '\\)[^()]*)*' +
      '\\)[^()]*)*' +
      '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';

    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/, /\s+/,
        IDENT_RE$1, /\s*/,
        /=\s*/,
        /(async\s*)?/, // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };

    return {
      name: 'Javascript',
      aliases: ['js', 'jsx', 'mjs', 'cjs'],
      keywords: KEYWORDS$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: 'attr',
          begin: IDENT_RE$1 + regex.lookahead(':'),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        { // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: 'function',
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: '\\s*=>',
              contains: [
                {
                  className: 'params',
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            { // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            { // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  'on:begin': XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: 'xml',
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ['self']
                }
              ]
            }
          ],
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
            '\\(' + // first parens
            '[^()]*(\\(' +
              '[^()]*(\\(' +
                '[^()]*' +
              '\\)[^()]*)*' +
            '\\)[^()]*)*' +
            '\\)\\s*\\{', // end parens
          returnBegin:true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1,
          relevance: 0
        },
        {
          match: [ /\bconstructor(?=\s*\()/ ],
          className: { 1: "title.function" },
          contains: [ PARAMS ]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }

  /*
  Language: TypeScript
  Author: Panu Horsmalahti <panu.horsmalahti@iki.fi>
  Contributors: Ike Ku <dempfi@yahoo.com>
  Description: TypeScript is a strict superset of JavaScript
  Website: https://www.typescriptlang.org
  Category: common, scripting
  */

  /** @type LanguageFn */
  function typescript(hljs) {
    const tsLanguage = javascript(hljs);

    const IDENT_RE$1 = IDENT_RE;
    const TYPES = [
      "any",
      "void",
      "number",
      "boolean",
      "string",
      "object",
      "never",
      "symbol",
      "bigint",
      "unknown"
    ];
    const NAMESPACE = {
      beginKeywords: 'namespace',
      end: /\{/,
      excludeEnd: true,
      contains: [ tsLanguage.exports.CLASS_REFERENCE ]
    };
    const INTERFACE = {
      beginKeywords: 'interface',
      end: /\{/,
      excludeEnd: true,
      keywords: {
        keyword: 'interface extends',
        built_in: TYPES
      },
      contains: [ tsLanguage.exports.CLASS_REFERENCE ]
    };
    const USE_STRICT = {
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use strict['"]/
    };
    const TS_SPECIFIC_KEYWORDS = [
      "type",
      "namespace",
      "interface",
      "public",
      "private",
      "protected",
      "implements",
      "declare",
      "abstract",
      "readonly",
      "enum",
      "override"
    ];
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS.concat(TS_SPECIFIC_KEYWORDS),
      literal: LITERALS,
      built_in: BUILT_INS.concat(TYPES),
      "variable.language": BUILT_IN_VARIABLES
    };
    const DECORATOR = {
      className: 'meta',
      begin: '@' + IDENT_RE$1,
    };

    const swapMode = (mode, label, replacement) => {
      const indx = mode.contains.findIndex(m => m.label === label);
      if (indx === -1) { throw new Error("can not find mode to replace"); }

      mode.contains.splice(indx, 1, replacement);
    };


    // this should update anywhere keywords is used since
    // it will be the same actual JS object
    Object.assign(tsLanguage.keywords, KEYWORDS$1);

    tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
    tsLanguage.contains = tsLanguage.contains.concat([
      DECORATOR,
      NAMESPACE,
      INTERFACE,
    ]);

    // TS gets a simpler shebang rule than JS
    swapMode(tsLanguage, "shebang", hljs.SHEBANG());
    // JS use strict rule purposely excludes `asm` which makes no sense
    swapMode(tsLanguage, "use_strict", USE_STRICT);

    const functionDeclaration = tsLanguage.contains.find(m => m.label === "func.def");
    functionDeclaration.relevance = 0; // () => {} is more typical in TypeScript

    Object.assign(tsLanguage, {
      name: 'TypeScript',
      aliases: [
        'ts',
        'tsx'
      ]
    });

    return tsLanguage;
  }

  /*
  Language: Shell Session
  Requires: bash.js
  Author: TSUYUSATO Kitsune <make.just.on@gmail.com>
  Category: common
  Audit: 2020
  */

  /** @type LanguageFn */
  function shell(hljs) {
    return {
      name: 'Shell Session',
      aliases: [
        'console',
        'shellsession'
      ],
      contains: [
        {
          className: 'meta.prompt',
          // We cannot add \s (spaces) in the regular expression otherwise it will be too broad and produce unexpected result.
          // For instance, in the following example, it would match "echo /path/to/home >" as a prompt:
          // echo /path/to/home > t.exe
          begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
          starts: {
            end: /[^\\](?=\s*$)/,
            subLanguage: 'bash'
          }
        }
      ]
    };
  }

  HighlightJS.registerLanguage('javascript', javascript$1);
   HighlightJS.registerLanguage('json', json);
   HighlightJS.registerLanguage('css', css);
   HighlightJS.registerLanguage('typescript', typescript);
   HighlightJS.registerLanguage('shell', shell);

  /*!
   * The main script for docolatte
   * @author Satoshi Soma (amekusa.com)
   *
   * Copyright 2020 Satoshi Soma
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  (() => {

  	/**
  	 * @param {string} query
  	 * @param {int} index
  	 * @return {NodeList|Element|null}
  	 */
  	function q(query, index = null) {
  		return find(document, query, index);
  	}

  	/**
  	 * @param {Element} elem
  	 * @param {string} query
  	 * @param {int} index
  	 * @return {NodeList|Element|null}
  	 */
  	function find(elem, query, index = null) {
  		let items = elem.querySelectorAll(query);
  		if (index == null) return items;
  		if ((index+1) > items.length) return null;
  		return items[index];
  	}

  	/**
  	 * @param {string} tag
  	 * @param {object} attribs
  	 * @param {string|array|Element} child
  	 * @return {Element}
  	 */
  	function elem(tag, attribs = null, child = null) {
  		let r = document.createElement(tag);
  		if (attribs) {
  			for (let i in attribs) r.setAttribute(i, attribs[i]);
  		}
  		if (child) {
  			if (!Array.isArray(child)) child = [child];
  			for (let item of child) {
  				if (typeof item == 'string') r.innerHTML += item;
  				else r.appendChild(item);
  			}
  		}
  		return r;
  	}

  	/**
  	 * Gets the offset position of an element from the specific ascendent node
  	 * @param {Element} elem Node to get offset
  	 * @param {Element} from Offset parent
  	 * @param {number} depth Recursion limit
  	 * @return {number} offset.top
  	 * @return {number} offset.left
  	 */
  	function getOffset(elem, from, depth = 8) {
  		let r = { top: 0, left: 0 };
  		let child = elem;
  		while (true) {
  			let parent = child.offsetParent;
  			if (!parent) return r;
  			if (parent.isSameNode(from)) break;
  			if (depth < 1) break;
  			depth--;
  			child = parent;
  		}
  		if ('offsetTop'  in child) r.top  = child.offsetTop;
  		if ('offsetLeft' in child) r.left = child.offsetLeft;
  		return r;
  	}

  	// DOM setup
  	document.addEventListener('DOMContentLoaded', () => {
  		const currentPage = window.location.pathname.substring(window.location.pathname.lastIndexOf('/')+1);
  		// console.debug('CURRENT PAGE:', currentPage);

  		const toc = q('.sidebar .toc', 0); // table of contents

  		new SimpleBar(toc); // apply simplebar (macOS-like scrollbar)

  		const showsSidebar = q('input#docolatte-shows-sidebar', 0); // toggle switch for sidebar

  		// highlight the anchors pointing at the current page
  		find(toc, `a[href="${currentPage}"]`).forEach(a => {
  			a.classList.add('current');

  			// scroll TOC to the anchor
  			let offset = getOffset(a, toc);
  			toc.scrollTo({
  				left: 0,
  				top: offset.top - 24,
  				behavior: 'auto' // 'smooth'
  			});
  		});

  		// close sidebar when user clicked one of the menu items
  		find(toc, 'a').forEach(a => {
  			a.addEventListener('click', ev => {
  				showsSidebar.checked = false;
  			});
  		});

  		// close sidebar with Escape key
  		document.addEventListener('keydown', ev => {
  			if (ev.key == 'Escape') showsSidebar.checked = false;
  		});

  		// initialize search box
  		(() => {
  			let fuse = new Fuse(
  				JSON.parse(_SEARCH.list), // records to search
  				JSON.parse(_SEARCH.options), // options (including keys)
  				Fuse.parseIndex(JSON.parse(_SEARCH.index)) // index for better performance
  			);
  			let base = find(toc, '.search-box', 0);
  			let input = find(base, 'input[type=text]', 0);
  			let suggests = find(base, '.suggestions', 0);
  			let hint = find(base, '.hint', 0);
  			let lastQuery = '';

  			// search as you type
  			input.addEventListener('input', ev => {
  				let query = ev.target.value;
  				if (query == lastQuery) return;
  				lastQuery = query;

  				suggests.innerHTML = ''; // clear
  				suggests.setAttribute('data-select', 0); // reset the state

  				if (!query.length) return;
  				let results = fuse.search(query, { limit: 8 });
  				if (!results.length) return;
  				// console.debug('RESULTS:', results);

  				hint.classList.add('hidden'); // hide hint

  				// show the results
  				for (let i = 0; i < results.length; i++) {
  					let item = results[i].item;
  					let label = item.longname.replaceAll(/(\W)/g, '<i class="symbol">$1</i><wbr>'); // insert <WBR> at every symbol chars
  					let li = elem('li', null, elem('a', { href: item.url }, label));
  					if (i == 0) li.classList.add('selected'); // select the 1st item
  					suggests.appendChild(li);
  				}
  			});

  			// navigate through suggestions with key presses
  			input.addEventListener('keydown', ev => {
  				if (ev.key == 'Escape') return ev.target.blur(); // ESC to unfocus
  				if (!suggests.children.length) return;

  				let select = Number.parseInt(suggests.getAttribute('data-select') || 0);
  				let selectNew = select;

  				// navigation
  				switch (ev.key) {
  				case 'ArrowDown':
  					selectNew++;
  					break;
  				case 'ArrowUp':
  					selectNew--;
  					break;
  				case 'Tab':
  					selectNew += (ev.shiftKey ? -1 : 1);
  					break;
  				case 'Enter':
  					find(suggests.children[select], 'a', 0).click();
  					break;
  				default:
  					return; // do nothing
  				}
  				if (selectNew < 0) selectNew = suggests.children.length - 1;   // jump to bottom from top
  				else if (selectNew >= suggests.children.length) selectNew = 0; // jump to top from bottom
  				suggests.children[select].classList.remove('selected'); // unselect the previous
  				suggests.children[selectNew].classList.add('selected'); // select the new
  				suggests.setAttribute('data-select', selectNew);
  				ev.preventDefault();
  			});

  			// hint
  			input.addEventListener('click', ev => {
  				if (ev.target.value) return;
  				hint.classList.remove('hidden');
  			});
  			input.addEventListener('blur', ev => {
  				hint.classList.add('hidden');
  			});

  			// force sidebar to show when searchbox gets focused
  			input.addEventListener('focus', ev => {
  				showsSidebar.checked = true;
  			});

  			// type any "printable" key to start a search
  			document.addEventListener('keydown', ev => {
  				// console.debug('KEYDOWN:', ev);
  				if (ev.key.length != 1) return; // ignore non-printable keys
  				if (ev.key == ' ') return;      // ignore SPACE key
  				if (ev.metaKey || ev.ctrlKey || ev.altKey) return; // ignore keys with modifiers
  				if (ev.target.tagName == 'INPUT' || ev.target.tagName == 'TEXTAREA') return;
  				input.value = '';
  				input.focus();
  			});
  		})();

  		// scroll related features
  		(() => {
  			let scroll = window.scrollY;
  			let ticking = false;

  			window.addEventListener('scroll', ev => {
  				if (ticking) return;
  				if (window.scrollY == scroll) return;
  				scroll = window.scrollY;
  				ticking = true;
  				window.requestAnimationFrame(update);
  			});

  			let headings = q('article.doc h4.name[id]');
  			let currentH;
  			let currentA = [], prevA = null;
  			function update() {
  				// console.debug('SCROLL:', scroll);

  				// process headings from bottom to top
  				// (assuming the list is ordered by 'offsetTop')
  				for (let i = headings.length - 1; i >= 0; i--) {
  					let item = headings.item(i);
  					if ((item.offsetTop - 12) > scroll) continue;
  					if (i === currentH) break;
  					currentH = i;
  					// console.debug('CURRENT H:', currentH, item);

  					// highlight all the '#' anchors pointing at the current header
  					prevA = currentA;
  					currentA = find(toc, `a[href="${currentPage + '#' + item.id}"]`);
  					// console.debug('CURRENT A:', currentA);
  					prevA.forEach(a => { a.classList.remove('current'); });
  					currentA.forEach(a => { a.classList.add('current'); });
  					break;
  				}

  				ticking = false;
  			}

  			update();
  		})();

  		// highlight codes
  		HighlightJS.highlightAll();

  	}); // DOM setup

  })(); // END

})();
//# sourceMappingURL=main.js.map
