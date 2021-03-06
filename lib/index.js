"use strict";

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _defineProperty = function (obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const events_1 = require("events");
//------------------------------------------------------------------------------
const AclPath = "acl";
const AclScopeName = "acl";
//------------------------------------------------------------------------------
function toSetOfGrantees(v) {
    v = v || new Set();
    v = v.grantees ? v.grantees : v;
    if (Array.isArray(v)) {
        return new Set(v);
    }
    if (v instanceof Set) {
        return v;
    }
    return new Set().add(v);
}
//------------------------------------------------------------------------------
function isMatchingGrant(scope, grantees) {
    grantees = toSetOfGrantees(grantees);
    return function (v) {
        return grantees.has(v.grantee) && v.scope == scope;
    };
}
//------------------------------------------------------------------------------
function findAccessibleBy(opts, grantees, permission, scope) {
    let selectAclScope = arguments[4] === undefined ? true : arguments[4];

    assert.ok(permission >= opts.lowestAccess, "Invalid permission level");
    assert.ok(scope, "Scope must be defined");
    grantees = toSetOfGrantees(grantees);
    let q = this.where("" + opts.path + ".grants").elemMatch({
        scope: scope,
        grantee: { $in: Array.from(grantees) },
        permission: { $gte: permission }
    });
    return selectAclScope ? q.select(this.select("acl")) : q;
}
//------------------------------------------------------------------------------
function explainAcl(opts, grantees) {
    grantees = toSetOfGrantees(grantees);
    let acl = this.getAcl();
    return acl.scopes().reduce(function (o, scope) {
        o[scope] = acl.scope(scope).access(grantees);
        return o;
    }, {});
}
//------------------------------------------------------------------------------
function selectList(opts) {
    for (var _len = arguments.length, scopes = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        scopes[_key - 1] = arguments[_key];
    }

    let smap = new Set(scopes);
    return Array.from(opts.scopes.filter(function (v) {
        return smap.has(v.name);
    }).reduce(function (o, v) {
        return v.paths.reduce(function (o, v) {
            return o.add(v);
        }, o);
    }, new Set()).add(opts.path));
}
//------------------------------------------------------------------------------
function plugin(sch, opts) {
    assert.ok(opts.types, "mongoose-acl: .types must be set");
    assert.ok(opts.types.Mixed, "mongoose-acl: .types.Mixed type must be set");
    assert.ok(opts.types.ObjectId, "mongoose-acl: .types.ObjectId type must be set");
    const Mixed = opts.types.Mixed;
    const ObjectId = opts.types.ObjectId;
    opts.path = opts.path || AclPath;
    opts.scopes = opts.scopes.filter(function (v) {
        return v.name != AclScopeName;
    });
    opts.scopes.push({ name: AclScopeName, paths: [AclPath] });
    opts.lowestAccess = opts.lowestAccess != null ? opts.lowestAccess : 0;
    //------------------------------------------------------------------------------
    function getAcl(opts, tagName) {
        assert.ok(this.isSelected(opts.path), "Acl must be selected");
        const acl = !this[opts.path] ? this[opts.path] = { tags: [], grants: [] } : this[opts.path];
        if (tagName) {
            if (!acl.tags.find(function (v) {
                return v.name == tagName;
            })) {
                acl.tags.push({ name: tagName, grants: [] });
            }
        }
        let tag = tagName ? acl.tags.find(function (v) {
            return v.name == tagName;
        }) : acl;
        return new AclWriter(this, tag, opts);
    }
    //------------------------------------------------------------------------------

    let AclWriter = (function (_events_1$EventEmitter) {
        //-------------------------

        function AclWriter(doc, tag, opts) {
            _classCallCheck(this, AclWriter);

            _get(Object.getPrototypeOf(AclWriter.prototype), "constructor", this).call(this);
            this.doc = doc;
            this.tag = tag;
            this.opts = opts;
        }

        _inherits(AclWriter, _events_1$EventEmitter);

        _createClass(AclWriter, {
            scope: {
                //-------------------------

                value: function scope(scopeName) {
                    assert.ok(scopeName, "Scope must be defined");
                    if (!this.opts.scopes.find(function (v) {
                        return v.name == scopeName;
                    })) {
                        throw new Error("Invalid scope <" + scopeName + "> provided");
                    }
                    this.currentScope = scopeName;
                    return this;
                }
            },
            scopes: {
                //-------------------------

                value: function scopes() {
                    return this.opts.scopes.map(function (v) {
                        return v.name;
                    });
                }
            },
            tags: {
                //-------------------------

                value: function tags() {
                    return this.doc[this.opts.path].tags.map(function (v) {
                        return v.name;
                    });
                }
            },
            access: {
                //-------------------------

                value: function access(grantees) {
                    assert.ok(this.currentScope, "Scope is not selected");
                    grantees = toSetOfGrantees(grantees);
                    return this.tag.grants.filter(isMatchingGrant(this.currentScope, grantees)).reduce(function (o, v) {
                        return o < v.permission ? v.permission : o;
                    }, this.opts.lowestAccess);
                }
            },
            end: {
                //-------------------------

                value: function end() {
                    return this;
                }
            },
            grantAccess: {
                //-------------------------

                value: function grantAccess(grantees, permission) {
                    var _this = this;

                    if (permission == null) {
                        permission = grantees;
                        grantees = this.doc[this.opts.path].grants.filter(function (v) {
                            return v.scope === _this.currentScope;
                        }).map(function (v) {
                            return v.grantee;
                        });
                    }
                    assert.ok(grantees, "Grantees must be defined");
                    assert.ok(permission >= this.opts.lowestAccess, "Invalid permission level");
                    grantees = toSetOfGrantees(grantees);
                    for (let grantee of grantees) {
                        let grant = this.tag.grants.find(isMatchingGrant(this.currentScope, grantee));
                        if (!grant) {
                            grant = {
                                id: new ObjectId(),
                                grantee: grantee,
                                permission: permission,
                                scope: this.currentScope
                            };
                            this.tag.grants.push(grant);
                            this.markModified();
                        }
                        if (grant.permission != permission) {
                            grant.permission = permission;
                            this.markModified();
                        }
                    }
                    return this;
                }
            },
            denyAccess: {
                //-------------------------

                value: function denyAccess(grantees) {
                    return this.grantAccess(grantees, this.opts.lowestAccess);
                }
            },
            apply: {
                //-------------------------

                value: function apply() {
                    if (!this.doc.isModified(this.opts.path)) {
                        return this.doc;
                    }
                    let acl = this.doc[this.opts.path];
                    let map = new Map();
                    for (let tag of acl.tags) {
                        for (let grant of tag.grants) {
                            let key = "" + grant.scope + ":" + grant.grantee;
                            map.set(key, grant.permission);
                        }
                    }
                    acl.grants = [];
                    for (let _ref of map.entries()) {
                        var _ref2 = _slicedToArray(_ref, 2);

                        let k = _ref2[0];
                        let p = _ref2[1];

                        var _k$split = k.split(":");

                        var _k$split2 = _slicedToArray(_k$split, 2);

                        let scope = _k$split2[0];
                        let grantee = _k$split2[1];

                        acl.grants.push({
                            id: new ObjectId(),
                            scope: scope,
                            grantee: grantee,
                            permission: p
                        });
                    }
                    if (map.size) this.markModified();
                    return this.doc;
                }
            },
            reject: {
                //-------------------------

                value: function reject() {
                    var _this = this;

                    let acl = this.doc[this.opts.path];
                    acl.tags = acl.tags.filter(function (v) {
                        return v !== _this.tag;
                    });
                    this.markModified();
                    return this;
                }
            },
            markModified: {
                //-------------------------

                value: function markModified() {
                    this.doc.markModified(this.opts.path);
                    this.emit("modify");
                }
            }
        });

        return AclWriter;
    })(events_1.EventEmitter);

    // В качестве временного решения запрещаем размещять ACL на вложенных полях
    // модели.
    assert.ok(opts.path.search(/\./) == -1);
    sch.path(opts.path, Mixed);
    sch.index((function () {
        var _sch$index = {};

        _defineProperty(_sch$index, "" + opts.path + ".grants.scope", 1);

        _defineProperty(_sch$index, "" + opts.path + ".grants.grantee", 1);

        _defineProperty(_sch$index, "" + opts.path + ".grants.permission", 1);

        return _sch$index;
    })());
    sch.statics.__plugin_acl_enabled__ = true;
    sch.statics.aclPath = opts.path;
    sch.statics.select = function () {
        for (var _len = arguments.length, scopes = Array(_len), _key = 0; _key < _len; _key++) {
            scopes[_key] = arguments[_key];
        }

        return this.selectList.apply(this, scopes).join(" ");
    };
    sch.statics.selectList = function () {
        for (var _len = arguments.length, scopes = Array(_len), _key = 0; _key < _len; _key++) {
            scopes[_key] = arguments[_key];
        }

        return selectList.apply(this, [opts].concat(scopes));
    };
    sch.statics.findAccessibleBy = function (grantees, permission, scope, selectAclScope) {
        return findAccessibleBy.call(this, opts, grantees, permission, scope, selectAclScope);
    };
    sch.methods.explainAcl = function (grantees) {
        return explainAcl.call(this, opts, grantees);
    };
    sch.methods.getAcl = function (tagName) {
        return getAcl.call(this, opts, tagName);
    };
}
exports.default = plugin;