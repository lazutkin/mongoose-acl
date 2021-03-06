"use strict";
/// <reference path="declarations.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const Q = require("q");
const mongoose = require("mongoose");
const chai_1 = require("chai");
const index_1 = require("./index");
//-----------------------
before(function () {
    let Home = new mongoose.Schema({
        address: String,
        locker: String,
        piggiBank: String
    });
    Home.plugin(index_1.default, {
        scopes: [{ name: "info", paths: ["address"] }, { name: "money", paths: ["locker", "piggiBank"] }],
        types: {
            Mixed: mongoose.Schema.Types.Mixed,
            ObjectId: mongoose.Types.ObjectId }
    });
    mongoose.model("Home", Home);
});
//---------------
it("should return scopes", function () {
    let Home = mongoose.model("Home");
    let doc = new Home();
    chai_1.expect(doc.getAcl()).to.respondTo("scopes");
    let scopes = doc.getAcl().scopes();
    chai_1.expect(scopes).to.have.length(3);
    chai_1.expect(scopes).to.include("acl");
    chai_1.expect(scopes).to.include("info");
    chai_1.expect(scopes).to.include("money");
});
//---------------
it("should define access by single tag", function () {
    let Home = mongoose.model("Home");
    let doc = new Home();
    doc.getAcl("first").scope("info").grantAccess("alice", 0).grantAccess("bob", 1).grantAccess("carol", 2).end().scope("info").denyAccess("bob").grantAccess("alice", 42).end().scope("money").grantAccess("alice", 1).denyAccess("bob").end().apply();
    chai_1.expect(doc.getAcl().scope("info").access("alice")).to.be.eql(42);
    chai_1.expect(doc.getAcl().scope("info").access("bob")).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("info").access("carol")).to.be.eql(2);
    chai_1.expect(doc.getAcl().scope("money").access("alice")).to.be.eql(1);
    chai_1.expect(doc.getAcl().scope("money").access("bob")).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("money").access("carol")).to.be.eql(0);
    chai_1.expect(doc.isModified(Home.aclPath)).to.be.ok;
    chai_1.expect(doc[Home.aclPath].tags).to.have.length(1);
    chai_1.expect(doc[Home.aclPath].grants).to.have.length(5);
});
//---------------
it("should define access by multiple tags", function () {
    let Home = mongoose.model("Home");
    let doc = new Home();
    doc = new Home();
    doc.getAcl("first").scope("info").grantAccess("alice", 0).grantAccess("bob", 1).grantAccess("carol", 2).end().apply();
    doc.getAcl("second").scope("info").denyAccess("bob").grantAccess("alice", 42).end().apply();
    doc.getAcl("third").scope("money").grantAccess("alice", 1).denyAccess("bob").end().apply();
    chai_1.expect(doc.getAcl().scope("info").access()).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("info").access(null)).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("info").access("alice")).to.be.eql(42);
    chai_1.expect(doc.getAcl().scope("info").access("bob")).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("info").access("carol")).to.be.eql(2);
    chai_1.expect(doc.getAcl().scope("money").access("alice")).to.be.eql(1);
    chai_1.expect(doc.getAcl().scope("money").access("bob")).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("money").access("carol")).to.be.eql(0);
    chai_1.expect(doc.isModified(Home.aclPath)).to.be.ok;
    chai_1.expect(doc[Home.aclPath].tags).to.have.length(3);
    chai_1.expect(doc[Home.aclPath].grants).to.have.length(5);
});
//---------------
it("should reset permissions for all grantees in scope", function () {
    let Home = mongoose.model("Home");
    let doc = new Home();
    doc = new Home();
    doc.getAcl("first").scope("info").grantAccess("alice", 0).grantAccess("bob", 1).grantAccess("carol", 2).end().apply();
    doc.getAcl("second").scope("info").grantAccess(3).end().apply();
    chai_1.expect(doc.getAcl().scope("info").access("alice")).to.be.eql(3);
    chai_1.expect(doc.getAcl().scope("info").access("bob")).to.be.eql(3);
    chai_1.expect(doc.getAcl().scope("info").access("carol")).to.be.eql(3);
    chai_1.expect(doc.getAcl().scope("money").access("alice")).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("money").access("bob")).to.be.eql(0);
    chai_1.expect(doc.getAcl().scope("money").access("carol")).to.be.eql(0);
});
//---------------
it("should reject tag", function () {
    let Home = mongoose.model("Home");
    let doc = new Home();
    doc.getAcl("first").scope("info").grantAccess("alice", 1);
    doc.getAcl("second").scope("info").grantAccess("alice", 2);
    doc.getAcl().apply();
    doc.getAcl("second").reject().apply();
    chai_1.expect(doc.getAcl().scope("info").access("alice")).to.be.eql(1);
    chai_1.expect(doc[Home.aclPath].tags).to.have.length(1);
    doc.getAcl("first").reject().apply();
    chai_1.expect(doc.getAcl().scope("info").access("alice")).to.be.eql(0);
    chai_1.expect(doc[Home.aclPath].tags).to.have.length(0);
});
//---------------
it("should return tags", function () {
    let Home = mongoose.model("Home");
    let doc = new Home().getAcl("first").scope("info").grantAccess("alice", 0).grantAccess("bob", 1).grantAccess("carol", 2).end().apply();
    chai_1.expect(doc.getAcl()).to.respondTo("tags");
    let tags = doc.getAcl().tags();
    chai_1.expect(tags).to.have.length(1);
    chai_1.expect(tags).to.include("first");
});
//---------------
it("should select paths", function () {
    let Home = mongoose.model("Home");
    chai_1.expect(Home).itself.to.respondTo("select");
    check(Home.selectList("money"));
    check(Home.select("money").split(" "));
    function check(paths) {
        chai_1.expect(paths).to.have.length(3);
        chai_1.expect(paths).to.include("acl");
        chai_1.expect(paths).to.include("locker");
        chai_1.expect(paths).to.include("piggiBank");
    }
});
//---------------
it("should explain Acl", function () {
    let Home = mongoose.model("Home");
    let doc = new Home().getAcl("first").scope("info").grantAccess("alice", 0).grantAccess("bob", 1).grantAccess("carol", 2).end().scope("money").grantAccess("bob", 1).end().apply();
    chai_1.expect(doc).to.respondTo("explainAcl");
    chai_1.expect(doc.explainAcl("alice")).to.be.eql({
        acl: 0,
        info: 0,
        money: 0
    });
    chai_1.expect(doc.explainAcl("bob")).to.be.eql({
        acl: 0,
        info: 1,
        money: 1
    });
});
//----------------------------
describe("#findAccessibleBy", function () {
    let ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    //----------------------------
    before(function* () {
        let defer = Q.defer();
        mongoose.connect("mongodb://localhost/test");
        mongoose.connection.once("open", defer.resolve);
        mongoose.connection.on("error", defer.reject);
        yield defer.promise;
        let Home = mongoose.model("Home");
        let docs = [new Home({ _id: ids[0] }).getAcl("first").scope("info").grantAccess("alice", 1).apply(), new Home({ _id: ids[1] }).getAcl("first").scope("info").grantAccess("alice", 2).apply(), new Home({ _id: ids[2] }).getAcl("first").scope("info").grantAccess("alice", 3).apply()];
        yield Q.all(docs.map(function (v) {
            return Q.ninvoke(v, "save");
        }));
    });
    //----------------------------
    after(function* () {
        let Home = mongoose.model("Home");
        yield Q.all(ids.map(function (v) {
            return Home.findOneAndRemove({ _id: v }).exec();
        }));
    });
    //----------------------------
    it("should find accessible docs #1", function* () {
        let Home = mongoose.model("Home");
        let docs = yield Home.findAccessibleBy("alice", 1, "info").where("_id").in(ids).exec();
        chai_1.expect(docs).to.have.length(3);
    });
    //----------------------------
    it("should find accessible docs #2", function* () {
        let Home = mongoose.model("Home");
        let docs = yield Home.findAccessibleBy("alice", 2, "info").where("_id").in(ids).exec();
        chai_1.expect(docs).to.have.length(2);
    });
    //----------------------------
    it("should find accessible docs #3", function* () {
        let Home = mongoose.model("Home");
        let docs = yield Home.findAccessibleBy("alice", 42, "info").where("_id").in(ids).exec();
        chai_1.expect(docs).to.be.empty;
    });
    //----------------------------
    it("should find accessible docs #4", function* () {
        let Home = mongoose.model("Home");
        let docs = yield Home.findAccessibleBy("alice", 0, "money").where("_id").in(ids).exec();
        chai_1.expect(docs).to.be.empty;
    });
    //----------------------------
    it("should find accessible docs #4", function* () {
        let Home = mongoose.model("Home");
        let docs = yield Home.findAccessibleBy("alice", 1, "money").where("_id").in(ids).exec();
        chai_1.expect(docs).to.be.empty;
    });
});