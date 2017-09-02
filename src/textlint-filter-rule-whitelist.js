// LICENSE : MIT
"use strict";
const execall = require('execall');
const escapeStringRegexp = require('escape-string-regexp');
const toRegExp = require("str-to-regexp").toRegExp;
const yaml = require('js-yaml');
const fs   = require('fs');
const COMPLEX_REGEX_END = /^.+\/(\w*)$/;
const defaultOptions = {
    // white list
    // string or RegExp string
    // e.g.
    // "string"
    // "/\\d+/"
    // "/^===/m"
    path: "./whitelist.yml" /* ex: "./conf/whitelist.yml" */
};
module.exports = function(context, options) {
    const { Syntax, shouldIgnore, getSource } = context;
    const configPath = options.path || defaultOptions.path;
    const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
    const allowRules = config.allow;
    const rules = {};
    for (let allowRule in allowRules) {
        rules[allowRule] = allowRules[allowRule].map(allowWord => {
            if (!allowWord) {
                return /^$/;
            }
            if (allowWord[0] === "/" && COMPLEX_REGEX_END.test(allowWord)) {
                return toRegExp(allowWord);
            }
            const escapeString = escapeStringRegexp(allowWord);
            return new RegExp(escapeString, "g");
        });
    }
    return {
        [Syntax.Str](node) {
            const text = getSource(node);
            for (let ruleId in rules) {
                const regExpWhiteList = rules[ruleId];
                regExpWhiteList.forEach(whiteRegExp => {
                    const matches = execall(whiteRegExp, text);
                    matches.forEach(match => {
                        const nodeStartIndex = node.range[0];
                        shouldIgnore([nodeStartIndex + match.index, nodeStartIndex + match.index + match.match.length], {
                            ruleId: ruleId
                        });
                    });
                });
            }
        }
    };
};