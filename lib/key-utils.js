/**
 * Key utility module that assists in the building, breaking, splitting, escaping,
 * and general handling of strings and search tokens.
 */

// We could use the same separator, but this saves on index size by
// minimizing how much escaping we need to do.
var tokenSeparator = '￭';
var keySeparator = '￮';

// The default regex used to split a string into tokens.
var defaultWordSeparator = /[\|' \.,\-|(\n)]+/;

// Escape regexes.
var escapeBackslashRegex        = new RegExp('\\\\', 'g');
var escapeTokenSeparatorRegex   = new RegExp(tokenSeparator, 'g');
var escapeKeySeparatorRegex     = new RegExp(keySeparator, 'g');

// Unescape regexes.
var unescapeBackslashRegex      = new RegExp('\\\\' + '\\\\', 'g');
var unescapeTokenSeparatorRegex = new RegExp('\\\\' + tokenSeparator, 'g');
var unescapeKeySeparatorRegex   = new RegExp('\\\\' + keySeparator, 'g');

/**
 * Puts escape backslashes before key and token separators,
 * and double escapes backslashes. Reverse with unescape().
 */
var escape = function (str) {
    return str.replace(escapeBackslashRegex, '\\\\')
              .replace(escapeTokenSeparatorRegex, '\\' + tokenSeparator)
              .replace(escapeKeySeparatorRegex, '\\' + keySeparator);
};

/**
 * Unescapes strings escaped with escape().
 */
var unescape = function (str) {
    return str.replace(unescapeTokenSeparatorRegex, tokenSeparator)
              .replace(unescapeKeySeparatorRegex, keySeparator)
              .replace(unescapeBackslashRegex, '\\');
};

/**
 * Simulates lookbehind functionality by splitting a reversed string on a
 * reversed separator.
 *
 * This is necessary because Javascript does not support regex lookbehinds,
 * but *does* support lookaheads. We flip the string and perform the analogous
 * operation before restoring it to the correct order.
 *
 * For more on this method, see the following page:
 * http://blog.stevenlevithan.com/archives/mimic-lookbehind-javascript

 */
var reverseSplit = function (text, reverseSeparator) {
    return text.split('').reverse().join('').split(reverseSeparator).map(function(str) {;
        return str.split('').reverse().join('');
    }).reverse();
};

/**
 * Splits a string on any unescaped ocurrences of the given separator.
 */
var splitOnUnescapedSeparator = function (text, separator) {
    // Highly unlikely when separator is tokenSeparator or keySeparator, but we need to cover it.
    if (text.indexOf('\\' + separator) > 0) {
        return reverseSplit(text, new RegExp(separator + '(?:\\\\\\\\)*(?!\\\\)'));
    }

    return text.split(separator);
};

/**
 * Assembles a safely escaped key from given components, joined by the key
 * separator character. Components can be passed as either a single array,
 * or individually as separate arguments.
 */
var buildKey = function (components) {
    if (components.constructor !== Array) {
        components = Array.prototype.slice.call(arguments);
    }
    return components.map(escape).join(keySeparator);
};

/**
 * Helper function that passes arguments to buildKey(). Strictly defines
 * the key components accepted by a search index key.
 */
var buildSearchKey = function (prefix, field, value, filter, filterKey) {
    return [prefix, field, value, filter || "", filterKey || ""].join(keySeparator);
};

/**
 * Helper function that builds a term frequency (TF) key.
 */
var buildTermFrequencyKey = function (field, value, filter, filterKey) {
    return buildSearchKey.apply(this, Array.prototype.concat.apply(["TF"], arguments));
};

/**
 * Helper function that builds a reverse index (RI) key.
 */
var buildReverseIndexKey = function (field, value, filter, filterKey) {
    return buildSearchKey.apply(this, Array.prototype.concat.apply(["RI"], arguments));
};

/**
 * Helper function that builds a field info (FI) key.
 */
var buildFieldInfoKey = function (field, value, filter, filterKey) {
    return buildSearchKey.apply(this, Array.prototype.concat.apply(["FI"], arguments));
};

/**
 * Breaks apart a key assembled by buildKey() and unescapes its components.
 */
var breakKey = function(key) {
    return splitOnUnescapedSeparator(key, keySeparator).map(unescape);
};

/**
 * Breaks up a generic key and returns an object describing it.
 */
var parseKey = function (key) {
    parts = breakKey(key);
    return {
        prefix: parts.shift(),
        parts: parts
    };
};

/**
 * Breaks up a search index key and returns an object describing its components.
 * Will return any trailing components in the case that the key wasn't a search index
 * key or was improperly formed (possible if it was built manually).
 */
var parseSearchKey = function (key) {
    parts = breakKey(key);
    return {
        prefix:    parts[0],
        field:     parts[1],
        value:     parts[2],
        filter:    parts[3],
        filterKey: parts[4],
        trailing:  parts.slice(5)
    };
};

/**
 * Helper function that returns true if the key has the specified prefix.
 */
var keyHasPrefix = function (key, prefix) {
    return key.substring(0, prefix.length + 1) === prefix + keySeparator;
};

/**
 * Splits a string into individual tokens on the given separator. The
 * separator should be a regex or string argument vlaid for the RegExp
 * constructor. Passing null or false for separator will return the original
 * string as the only token.
 *
 * If isEncoded is set to true, strings will be split on tokenSeparator
 * regardless of what separator is passed as. isEncode should be true if
 * passing a string that was previously processed via encode().
 */
var tokenize = function (text, isEncoded, separator) {
    if (isEncoded === true) {
        return splitOnUnescapedSeparator(text, tokenSeparator);
    } else if (typeof separator === "undefined") {
        separator = defaultWordSeparator;
    } else {
        if (separator === null || separator === false) separator = "";
        separator = new RegExp(separator);
    }

    return text.split(separator);
};

/**
 * Takes a string and escapes it, then splits it on the given separator and
 * returns it joined back together on tokenSeparator.
 */
var encode = function (text, separator) {
    return tokenize(escape(text), false, separator).join(tokenSeparator);
};

module.exports = {
    ts: tokenSeparator, // shortened for convenience
    ks: keySeparator, // shortened for convenience
    defaultWordSeparator: defaultWordSeparator,
    escape: escape,
    unescape: unescape,
    buildKey: buildKey,
    buildSearchKey: buildSearchKey,
    buildTermFrequencyKey: buildTermFrequencyKey,
    buildReverseIndexKey: buildReverseIndexKey,
    buildFieldInfoKey: buildFieldInfoKey,
    breakKey: breakKey,
    parseKey: parseKey,
    parseSearchKey: parseSearchKey,
    keyHasPrefix: keyHasPrefix,
    tokenize: tokenize,
    encode: encode
};
